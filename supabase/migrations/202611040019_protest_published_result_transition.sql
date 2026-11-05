-- A filed protest must be able to dispute a published result without
-- modifying its approved payload. The trusted function scopes the exception.
create or replace function public.file_protest(p_result_id uuid,p_grounds_code text,p_grounds text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); actor_house uuid; deadline timestamptz; protest_id uuid; prior_status text; meet_id uuid; ground_id uuid;
begin
  select e.protest_deadline_at,r.status,e.sports_meet_id into deadline,prior_status,meet_id
  from public.results r join public.events e on e.id=r.event_id
  where r.id=p_result_id and r.status in ('approved','final','published');
  select house_id into actor_house from public.user_roles
  where user_id=actor and role='house_representative' and (expires_at is null or expires_at>now()) limit 1;
  if actor_house is null then raise exception 'house representative role required' using errcode='42501'; end if;
  if deadline is null or now()>deadline then raise exception 'protest submission window is closed or not configured' using errcode='55000'; end if;
  select id into ground_id from public.protest_ground_categories
  where sports_meet_id=meet_id and code=upper(trim(p_grounds_code)) and is_active;
  if ground_id is null then raise exception 'an active approved protest ground is required' using errcode='23514'; end if;
  insert into public.protests(result_id,filed_by,house_id,grounds,grounds_code,ground_category_id,status,filed_at,prior_result_status)
  values(p_result_id,actor,actor_house,trim(p_grounds),upper(trim(p_grounds_code)),ground_id,'filed',now(),prior_status)
  returning id into protest_id;
  perform set_config('app.result_correction_authorized','true',true);
  update public.results set status='disputed'
  where id=p_result_id and status in ('approved','final','published');
  perform set_config('app.result_correction_authorized','false',true);
  update public.sports_meets set standings_status='provisional',standings_status_reason='A result protest was filed',
    standings_status_changed_by=actor,standings_status_changed_at=now()
  where id=(select e.sports_meet_id from public.results r join public.events e on e.id=r.event_id where r.id=p_result_id)
    and standings_status<>'provisional';
  return protest_id;
end;
$$;

revoke all on function public.file_protest(uuid,text,text) from public,anon;
grant execute on function public.file_protest(uuid,text,text) to authenticated;
