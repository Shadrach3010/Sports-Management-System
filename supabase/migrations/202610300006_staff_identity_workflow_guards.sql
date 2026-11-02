-- Keep public result identity decisions inside the audited staff workflow.
-- Prevent role provisioning from silently reactivating suspended profiles.

create function private.guard_student_public_result_identity()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.public_results_name is null and new.public_results_consent_at is null
       and new.public_results_consent_recorded_by is null then
      return new;
    end if;
  elsif old.public_results_name is not distinct from new.public_results_name
    and old.public_results_consent_at is not distinct from new.public_results_consent_at
    and old.public_results_consent_recorded_by is not distinct from new.public_results_consent_recorded_by then
    return new;
  end if;
    if current_setting('app.student_public_identity_authorized',true) is distinct from 'true' then
      raise exception 'public result identity requires the controlled publication workflow' using errcode='42501';
    end if;
  return new;
end;
$$;

create trigger student_public_result_identity_guard
before insert or update on public.students for each row
execute function private.guard_student_public_result_identity();

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
  perform set_config('app.student_public_identity_authorized','true',true);
  update public.students
  set public_results_name = case when p_consent then trim(p_public_name) else null end,
      public_results_consent_at = case when p_consent then now() else null end,
      public_results_consent_recorded_by = case when p_consent then actor else null end
  where id = p_student_id;
  if not found then raise exception 'student not found' using errcode='P0002'; end if;
  perform set_config('app.student_public_identity_authorized','false',true);
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
declare actor uuid := auth.uid(); assigned_role_id uuid;
begin
  if not private.has_role('system_administrator') then
    raise exception 'system administrator role required' using errcode='42501';
  end if;
  if not exists (select 1 from auth.users where id=p_user_id) then
    raise exception 'Auth identity does not exist' using errcode='P0002';
  end if;
  if length(trim(coalesce(p_display_name,''))) < 2 then
    raise exception 'a display name is required' using errcode='22023';
  end if;
  if p_role not in ('system_administrator','sports_coordinator','registration_officer',
    'house_representative','check_in_officer','event_judge','results_verifier',
    'protest_committee','public_viewer') then
    raise exception 'unsupported role' using errcode='22023';
  end if;
  if (p_role='house_representative' and (p_house_id is null or p_event_id is not null))
    or (p_role='event_judge' and (p_event_id is null or p_house_id is not null))
    or (p_role not in ('house_representative','event_judge') and (p_house_id is not null or p_event_id is not null)) then
    raise exception 'invalid role scope' using errcode='22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'role expiry must be in the future' using errcode='22023';
  end if;
  if exists(select 1 from public.profiles where id=p_user_id and not is_active) then
    raise exception 'inactive staff profile requires a separate reactivation decision' using errcode='42501';
  end if;

  insert into public.profiles(id,display_name,is_active)
  values(p_user_id,trim(p_display_name),true)
  on conflict(id) do update set display_name=excluded.display_name;

  insert into public.user_roles(user_id,role,house_id,event_id,granted_by,expires_at)
  values(p_user_id,p_role,p_house_id,p_event_id,actor,p_expires_at)
  on conflict(user_id,role,house_id,event_id)
  do update set granted_by=excluded.granted_by,granted_at=now(),expires_at=excluded.expires_at
  returning id into assigned_role_id;

  return assigned_role_id;
end;
$$;

revoke all on function private.guard_student_public_result_identity() from public,anon,authenticated;
revoke all on function public.set_student_public_result_identity(uuid,text,boolean) from public,anon;
revoke all on function public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.set_student_public_result_identity(uuid,text,boolean) to authenticated;
grant execute on function public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz) to authenticated;
