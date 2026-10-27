-- Public competition scoreboard and controlled staff provisioning.
-- Auth identities and passwords are never created or stored by this migration.

alter table public.students
  add column public_results_name text
    check (public_results_name is null or length(trim(public_results_name)) between 2 and 160),
  add column public_results_consent_at timestamptz,
  add column public_results_consent_recorded_by uuid references auth.users(id) on delete restrict,
  add constraint students_public_results_consent_check check (
    (public_results_consent_at is null and public_results_consent_recorded_by is null)
    or (public_results_consent_at is not null and public_results_consent_recorded_by is not null)
  );

create or replace function private.write_student_audit_log()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
declare
  old_row jsonb := case when tg_op='INSERT' then null else jsonb_build_object(
    'house_id',old.house_id,'enrollment_status',old.enrollment_status,
    'eligibility_status',old.eligibility_status,'public_results_name',old.public_results_name,
    'public_results_consent_at',old.public_results_consent_at
  ) end;
  new_row jsonb := case when tg_op='DELETE' then null else jsonb_build_object(
    'house_id',new.house_id,'enrollment_status',new.enrollment_status,
    'eligibility_status',new.eligibility_status,'public_results_name',new.public_results_name,
    'public_results_consent_at',new.public_results_consent_at
  ) end;
begin
  insert into public.audit_logs(actor_id,action,table_name,record_id,old_data,new_data,request_id)
  values(auth.uid(),lower(tg_op),tg_table_name,coalesce(new.id,old.id),old_row,new_row,
    nullif(current_setting('request.headers',true),'')::jsonb->>'x-request-id');
  return coalesce(new,old);
end;
$$;

create or replace function public.set_student_public_result_identity(
  p_student_id uuid,
  p_public_name text,
  p_consent boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare actor uuid := auth.uid();
begin
  if not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'student publication authority required' using errcode='42501';
  end if;
  if p_consent and length(trim(coalesce(p_public_name,''))) < 2 then
    raise exception 'an approved public result name is required' using errcode='22023';
  end if;
  update public.students
  set public_results_name = case when p_consent then trim(p_public_name) else null end,
      public_results_consent_at = case when p_consent then now() else null end,
      public_results_consent_recorded_by = case when p_consent then actor else null end
  where id = p_student_id;
  if not found then raise exception 'student not found' using errcode='P0002'; end if;
end;
$$;

create or replace function public.provision_staff_user(
  p_user_id uuid,
  p_display_name text,
  p_role text,
  p_house_id uuid default null,
  p_event_id uuid default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); assignment_id uuid;
begin
  if not private.has_role('system_administrator') then
    raise exception 'system administrator role required' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users where id=p_user_id) then
    raise exception 'Supabase Auth user does not exist' using errcode='23503';
  end if;
  if length(trim(coalesce(p_display_name,''))) < 2 then
    raise exception 'display name is required' using errcode='22023';
  end if;
  if p_role not in ('system_administrator','sports_coordinator','registration_officer','house_representative','check_in_officer','event_judge','results_verifier','protest_committee','public_viewer') then
    raise exception 'unsupported application role' using errcode='22023';
  end if;
  if (p_role='house_representative' and (p_house_id is null or p_event_id is not null))
     or (p_role='event_judge' and (p_event_id is null or p_house_id is not null))
     or (p_role not in ('house_representative','event_judge') and (p_house_id is not null or p_event_id is not null)) then
    raise exception 'role scope is invalid' using errcode='23514';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'role expiry must be in the future' using errcode='22023';
  end if;

  insert into public.profiles(id,display_name,is_active)
  values(p_user_id,trim(p_display_name),true)
  on conflict(id) do update set display_name=excluded.display_name,is_active=true;

  insert into public.user_roles(user_id,role,house_id,event_id,granted_by,expires_at)
  values(p_user_id,p_role,p_house_id,p_event_id,actor,p_expires_at)
  on conflict(user_id,role,house_id,event_id)
  do update set granted_by=excluded.granted_by,granted_at=now(),expires_at=excluded.expires_at
  returning id into assignment_id;
  return assignment_id;
end;
$$;

create or replace function public.get_public_competition_results()
returns table(
  result_id uuid,
  sports_meet_id uuid,
  meet_name text,
  standings_status text,
  event_code text,
  event_name text,
  event_type text,
  competitor_name text,
  house_code text,
  house_name text,
  house_color text,
  placement integer,
  outcome text,
  time_milliseconds bigint,
  distance_millimetres integer,
  height_millimetres integer,
  performance_score numeric,
  points numeric,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select r.id,sm.id,sm.name,sm.standings_status,e.code,e.name,e.event_type,
    case
      when r.entry_type='team' then coalesce(et.name,h.name||' team')
      when s.public_results_consent_at is not null then coalesce(nullif(trim(s.public_results_name),''),trim(s.legal_first_name||' '||s.legal_last_name))
      else 'Name withheld'
    end,
    h.code,h.name,h.official_color,r.placement,r.outcome,r.time_milliseconds,
    r.distance_millimetres,r.height_millimetres,r.performance_score,pa.points,r.published_at
  from public.results r
  join public.events e on e.id=r.event_id
  join public.sports_meets sm on sm.id=e.sports_meet_id and sm.published_at is not null
  join public.houses h on h.id=r.house_id
  left join public.event_registrations er on er.id=r.registration_id
  left join public.students s on s.id=er.student_id
  left join public.event_teams et on et.id=r.team_entry_id
  left join public.point_awards pa on pa.result_id=r.id and pa.voided_at is null
  where r.status='published'
  order by sm.starts_on desc,e.name,r.placement nulls last,r.published_at desc;
$$;

create or replace view public.public_house_standings with (security_invoker=true) as
select sm.id as sports_meet_id,sm.name as meet_name,sm.year,sm.standings_status,
  h.id as house_id,h.code as house_code,h.name as house_name,h.official_color as house_color,
  coalesce(sum(pa.points),0)::numeric(12,2) as total_points,count(pa.id)::bigint as award_count,
  max(pa.awarded_at) as last_updated_at
from public.sports_meets sm
join public.meet_houses mh on mh.sports_meet_id=sm.id and mh.is_active
join public.houses h on h.id=mh.house_id
left join public.results r on exists(select 1 from public.events e where e.id=r.event_id and e.sports_meet_id=sm.id)
  and r.house_id=h.id and r.status='published'
left join public.point_awards pa on pa.result_id=r.id and pa.house_id=h.id and pa.voided_at is null
where sm.published_at is not null
group by sm.id,sm.name,sm.year,sm.standings_status,h.id,h.code,h.name,h.official_color;

revoke all on function public.set_student_public_result_identity(uuid,text,boolean) from public,anon;
revoke all on function public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz) from public,anon;
revoke all on function public.get_public_competition_results() from public;
revoke all on function private.write_student_audit_log() from public,anon,authenticated;
grant execute on function public.set_student_public_result_identity(uuid,text,boolean) to authenticated;
grant execute on function public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz) to authenticated;
grant execute on function public.get_public_competition_results() to anon,authenticated;
grant select on public.public_house_standings to anon,authenticated;
