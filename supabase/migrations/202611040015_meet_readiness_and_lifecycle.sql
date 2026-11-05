-- Prevent an empty meet from entering registration and permit recovery of an
-- already opened, eventless meet before any competition data exists.
create or replace function private.guard_meet_configuration()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null and new.status <> 'draft' then
    raise exception 'new meets must begin in draft' using errcode = '22023';
  end if;
  if new.year <> extract(year from new.starts_on)::integer then
    raise exception 'meet year must match the start date year' using errcode = '22023';
  end if;
  if new.ends_on < new.starts_on then
    raise exception 'meet end date must not precede its start date' using errcode = '22023';
  end if;
  if new.registration_opens_at is not null and new.registration_closes_at::date >= new.starts_on then
    raise exception 'registration must close before the meet begins' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status = 'registration_open' and new.status = 'draft' then
      if exists (select 1 from public.events e where e.sports_meet_id = new.id)
         or exists (select 1 from public.scoring_rules sr where sr.sports_meet_id = new.id)
         or old.standings_status <> 'provisional'
      then raise exception 'only an eventless, unscored meet can return to draft' using errcode = '55000'; end if;
      if new.published_at is not null then
        raise exception 'returning to draft must remove public publication' using errcode = '22023';
      end if;
    elsif (old.status, new.status) not in (
      ('draft','registration_open'), ('draft','cancelled'),
      ('registration_open','registration_closed'), ('registration_open','cancelled'),
      ('registration_closed','in_progress'), ('registration_closed','cancelled'),
      ('in_progress','completed'), ('in_progress','cancelled'),
      ('completed','archived')
    ) then raise exception 'invalid meet status transition' using errcode = '22023';
    end if;
    if new.status = 'registration_open' then
      if new.registration_opens_at is null or new.registration_closes_at is null then
        raise exception 'registration dates are required before opening registration' using errcode = '22023';
      end if;
      if not exists (select 1 from public.meet_houses mh where mh.sports_meet_id = new.id and mh.is_active) then
        raise exception 'at least one participating house is required' using errcode = '22023';
      end if;
      if not exists (select 1 from public.events e where e.sports_meet_id = new.id) then
        raise exception 'create at least one event before opening registration' using errcode = '22023';
      end if;
      if exists (
        select 1 from public.events e where e.sports_meet_id = new.id and (
          e.sport_category_id is null or e.format_code is null or e.starts_at is null
        )
      ) then raise exception 'all events must be complete before registration opens' using errcode = '22023'; end if;
    end if;
    if new.status = 'completed' and exists (
      select 1 from public.events e where e.sports_meet_id = new.id
        and e.status not in ('completed','cancelled')
    ) then raise exception 'complete or cancel every event before completing the meet' using errcode = '55000'; end if;
  end if;
  if tg_op = 'UPDATE' and old.status <> 'draft' and (
    old.name is distinct from new.name or old.year is distinct from new.year
    or old.starts_on is distinct from new.starts_on or old.ends_on is distinct from new.ends_on
    or old.registration_opens_at is distinct from new.registration_opens_at
    or old.registration_closes_at is distinct from new.registration_closes_at
  ) then raise exception 'meet configuration is immutable after registration opens' using errcode = '42501'; end if;
  return new;
end;
$$;

-- Lifecycle changes must follow the parent meet. Existing rows are left intact;
-- subsequent transitions are checked and audited by their existing triggers.
create or replace function private.guard_event_configuration()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare category_meet uuid; rule_meet uuid; meet_start date; meet_end date; meet_status text;
begin
  if new.sport_category_id is not null then
    select sports_meet_id into category_meet from public.sport_categories where id = new.sport_category_id;
    if category_meet is distinct from new.sports_meet_id then raise exception 'event category belongs to another meet' using errcode = '23514'; end if;
  end if;
  if new.scoring_rule_id is not null then
    select sports_meet_id into rule_meet from public.scoring_rules where id = new.scoring_rule_id;
    if rule_meet is distinct from new.sports_meet_id then raise exception 'scoring rule belongs to another meet' using errcode = '23514'; end if;
  end if;
  select starts_on, ends_on, status into meet_start, meet_end, meet_status from public.sports_meets where id = new.sports_meet_id;
  if tg_op = 'INSERT' then
    if meet_status <> 'draft' then raise exception 'events can be created only while the meet is in draft' using errcode = '42501'; end if;
    if auth.uid() is not null and (new.status <> 'scheduled' or new.registration_status <> 'closed' or new.roster_status <> 'open') then
      raise exception 'new events must begin scheduled with registration closed and roster open' using errcode = '22023';
    end if;
  end if;
  if tg_op = 'UPDATE' and meet_status <> 'draft'
    and current_setting('app.event_schedule_authorized', true) is distinct from 'true'
    and current_setting('app.scoring_assignment_authorized', true) is distinct from 'true' and (
    old.sports_meet_id is distinct from new.sports_meet_id
    or old.sport_category_id is distinct from new.sport_category_id
    or old.code is distinct from new.code or old.name is distinct from new.name
    or old.description is distinct from new.description or old.event_type is distinct from new.event_type
    or old.minimum_team_size is distinct from new.minimum_team_size
    or old.maximum_team_size is distinct from new.maximum_team_size
    or old.format_code is distinct from new.format_code or old.rules is distinct from new.rules
    or old.requirements is distinct from new.requirements
    or old.maximum_participants_per_house is distinct from new.maximum_participants_per_house
    or old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at
    or old.scoring_rule_id is distinct from new.scoring_rule_id
  ) then raise exception 'event configuration is immutable after meet registration opens' using errcode = '42501'; end if;
  if new.starts_at is not null and (new.starts_at::date < meet_start or new.starts_at::date > meet_end) then
    raise exception 'event schedule must fall within meet dates' using errcode = '22023';
  end if;
  if new.registration_status = 'open' and (
    meet_status <> 'registration_open' or new.sport_category_id is null
    or new.format_code is null or new.starts_at is null
  ) then raise exception 'event configuration is incomplete or meet registration is not open' using errcode = '22023'; end if;
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if (old.status,new.status) not in (
      ('scheduled','check_in_open'), ('scheduled','cancelled'),
      ('check_in_open','in_progress'), ('check_in_open','cancelled'),
      ('in_progress','completed'), ('in_progress','cancelled')
    ) then raise exception 'invalid event status transition' using errcode = '22023'; end if;
    if new.status = 'check_in_open' then
      if new.roster_status <> 'locked' then raise exception 'event roster must be locked before check-in opens' using errcode = '55000'; end if;
      if meet_status not in ('registration_closed','in_progress') then raise exception 'meet registration must be closed before event check-in opens' using errcode = '55000'; end if;
    end if;
    if new.status in ('in_progress','completed') and meet_status <> 'in_progress' then
      raise exception 'meet must be in progress before an event advances' using errcode = '55000';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_meet_configuration() from public, anon, authenticated;
revoke all on function private.guard_event_configuration() from public, anon, authenticated;
