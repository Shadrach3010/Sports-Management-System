-- Milestone 3: meet configuration, event rosters, and identity check-in.
-- Existing meet, event, and event_registrations tables are extended rather
-- than duplicated. No scoring values or production data are introduced.

alter table public.sports_meets drop constraint if exists sports_meets_status_check;
alter table public.sports_meets
  add column year integer,
  add column registration_opens_at timestamptz,
  add column registration_closes_at timestamptz,
  add constraint sports_meets_year_check check (year between 2000 and 2200) not valid,
  add constraint sports_meets_status_check check (status in (
    'draft', 'registration_open', 'registration_closed', 'in_progress',
    'completed', 'cancelled', 'archived'
  )),
  add constraint sports_meets_registration_window_check check (
    registration_opens_at is null and registration_closes_at is null
    or registration_opens_at < registration_closes_at
  );

update public.sports_meets set year = extract(year from starts_on)::integer where year is null;
alter table public.sports_meets alter column year set not null;
create unique index sports_meets_name_year_uidx on public.sports_meets(lower(name), year);

create table public.meet_houses (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  is_active boolean not null default true,
  added_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (sports_meet_id, house_id)
);
create index meet_houses_house_idx on public.meet_houses(house_id, sports_meet_id);

create table public.sport_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  code text not null check (code = upper(code) and length(code) between 2 and 20),
  name text not null check (length(trim(name)) between 2 and 100),
  description text check (description is null or length(description) <= 1000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sports_meet_id, code),
  unique (sports_meet_id, name)
);

alter table public.events
  add column sport_category_id uuid references public.sport_categories(id) on delete restrict,
  add column description text,
  add column format_code text,
  add column rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object'),
  add column requirements jsonb not null default '{}'::jsonb check (jsonb_typeof(requirements) = 'object'),
  add column maximum_participants_per_house integer check (maximum_participants_per_house is null or maximum_participants_per_house > 0),
  add column registration_status text not null default 'closed' check (registration_status in ('closed', 'open')),
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column scoring_rule_id uuid references public.scoring_rules(id) on delete restrict,
  add constraint events_description_length check (description is null or length(description) <= 2000),
  add constraint events_format_code_check check (format_code is null or format_code in ('race', 'jump', 'throw', 'relay', 'team_match', 'other')),
  add constraint events_schedule_range check (ends_at is null or starts_at is not null and ends_at > starts_at);

create table public.event_teams (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  name text not null check (length(trim(name)) between 2 and 100),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'withdrawn')),
  rejection_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, house_id, name)
);
create index event_teams_event_house_idx on public.event_teams(event_id, house_id);

alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations
  add column team_id uuid references public.event_teams(id) on delete restrict,
  add column rejection_reason text,
  add column submitted_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete restrict,
  add column reviewed_at timestamptz,
  add column approved_at timestamptz,
  add column withdrawn_at timestamptz,
  add constraint event_registrations_status_check check (status in (
    'draft', 'pending', 'submitted', 'approved', 'rejected',
    'checked_in', 'withdrawn', 'disqualified'
  )),
  add constraint event_registrations_review_check check (
    (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
    or status not in ('approved', 'rejected')
  );
create index event_registrations_team_idx on public.event_registrations(team_id) where team_id is not null;

create table public.event_roster_submissions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_by uuid references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, house_id),
  check ((status = 'draft' and submitted_by is null and submitted_at is null) or status <> 'draft'),
  check ((status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null) or status not in ('approved', 'rejected'))
);
create index event_roster_submissions_status_idx on public.event_roster_submissions(status, event_id);

create table public.registration_history (
  id uuid primary key default extensions.gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete restrict,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by uuid references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);
create index registration_history_registration_idx on public.registration_history(registration_id, changed_at desc);

create table public.event_officials (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  official_role text not null check (official_role in ('event_judge', 'check_in_officer')),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unique (event_id, user_id, official_role)
);
create index event_officials_user_idx on public.event_officials(user_id, official_role);

create table public.registration_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete restrict,
  token_hash bytea not null unique,
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  check ((revoked_by is null and revoked_at is null) or (revoked_by is not null and revoked_at is not null))
);
create unique index registration_tokens_active_uidx on public.registration_tokens(registration_id) where revoked_at is null;

create table public.attendance (
  id uuid primary key default extensions.gen_random_uuid(),
  registration_id uuid not null references public.event_registrations(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  token_id uuid references public.registration_tokens(id) on delete restrict,
  method text not null check (method in ('qr', 'manual')),
  identity_confirmed boolean not null check (identity_confirmed),
  manual_reason text,
  checked_in_by uuid not null references auth.users(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  voided_by uuid references auth.users(id) on delete restrict,
  voided_at timestamptz,
  void_reason text,
  check ((method = 'qr' and token_id is not null and manual_reason is null) or (method = 'manual' and token_id is null and length(trim(manual_reason)) >= 5)),
  check ((voided_by is null and voided_at is null and void_reason is null) or (voided_by is not null and voided_at is not null and length(trim(void_reason)) >= 5))
);
create unique index attendance_active_registration_uidx on public.attendance(registration_id) where voided_at is null;
create index attendance_event_idx on public.attendance(event_id, checked_in_at desc);

create table public.attendance_corrections (
  id uuid primary key default extensions.gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid not null references auth.users(id) on delete restrict,
  reason text not null check (length(trim(reason)) >= 5),
  created_at timestamptz not null default now(),
  check (requested_by <> approved_by)
);

create table public.roster_change_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  team_id uuid references public.event_teams(id) on delete restrict,
  request_type text not null default 'late_addition' check (request_type in ('late_addition')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text not null check (length(trim(reason)) between 5 and 1000),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text,
  created_registration_id uuid references public.event_registrations(id) on delete restrict,
  check ((status = 'pending' and decided_by is null and decided_at is null) or (status in ('approved', 'rejected') and decided_by is not null and decided_at is not null)),
  check (decided_by is null or decided_by <> requested_by)
);
create unique index roster_change_pending_uidx on public.roster_change_requests(event_id, student_id) where status = 'pending';

create table public.event_heats (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  heat_number integer not null check (heat_number > 0),
  name text,
  starts_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'check_in_open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (event_id, heat_number)
);

create or replace function private.is_event_official(required_role text, required_event uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.event_officials eo
    join public.profiles p on p.id = eo.user_id and p.is_active
    where eo.user_id = auth.uid()
      and eo.event_id = required_event
      and eo.official_role = required_role
  );
$$;

create or replace function private.validate_event_official_assignment()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.official_role = 'check_in_officer' and not exists (
    select 1 from public.user_roles ur where ur.user_id = new.user_id
      and ur.role = 'check_in_officer' and (ur.expires_at is null or ur.expires_at > now())
  ) then raise exception 'user does not have the check-in officer role' using errcode = '23514'; end if;
  if new.official_role = 'event_judge' and not exists (
    select 1 from public.user_roles ur where ur.user_id = new.user_id
      and ur.role = 'event_judge' and ur.event_id = new.event_id
      and (ur.expires_at is null or ur.expires_at > now())
  ) then raise exception 'user does not have the assigned event judge role' using errcode = '23514'; end if;
  return new;
end;
$$;

create or replace function private.guard_meet_configuration()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
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
    if (old.status, new.status) not in (
      ('draft','registration_open'), ('draft','cancelled'),
      ('registration_open','registration_closed'), ('registration_open','cancelled'),
      ('registration_closed','in_progress'), ('registration_closed','cancelled'),
      ('in_progress','completed'), ('in_progress','cancelled'),
      ('completed','archived')
    ) then raise exception 'invalid meet status transition' using errcode = '22023'; end if;
    if new.status = 'registration_open' then
      if new.registration_opens_at is null or new.registration_closes_at is null then
        raise exception 'registration dates are required before opening registration' using errcode = '22023';
      end if;
      if not exists (select 1 from public.meet_houses mh where mh.sports_meet_id = new.id and mh.is_active) then
        raise exception 'at least one participating house is required' using errcode = '22023';
      end if;
      if exists (
        select 1 from public.events e where e.sports_meet_id = new.id and (
          e.sport_category_id is null or e.format_code is null or e.starts_at is null
        )
      ) then raise exception 'all events must be complete before registration opens' using errcode = '22023'; end if;
    end if;
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
  if tg_op = 'INSERT' and meet_status <> 'draft' then
    raise exception 'events can be created only while the meet is in draft' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and meet_status <> 'draft'
    and current_setting('app.event_schedule_authorized', true) is distinct from 'true'
    and current_setting('app.scoring_assignment_authorized', true) is distinct from 'true' and (
    old.sports_meet_id is distinct from new.sports_meet_id
    or old.sport_category_id is distinct from new.sport_category_id
    or old.code is distinct from new.code or old.name is distinct from new.name
    or old.description is distinct from new.description
    or old.event_type is distinct from new.event_type
    or old.minimum_team_size is distinct from new.minimum_team_size
    or old.maximum_team_size is distinct from new.maximum_team_size
    or old.format_code is distinct from new.format_code
    or old.rules is distinct from new.rules or old.requirements is distinct from new.requirements
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
    if new.status = 'check_in_open' and new.roster_status <> 'locked' then raise exception 'event roster must be locked before check-in opens' using errcode = '55000'; end if;
  end if;
  return new;
end;
$$;

create or replace function private.guard_draft_meet_child()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare target_meet uuid := coalesce(new.sports_meet_id, old.sports_meet_id);
begin
  if not exists (select 1 from public.sports_meets where id = target_meet and status = 'draft') then
    raise exception 'meet participation and categories are immutable after registration opens' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.guard_roster_changes()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare target_event uuid := coalesce(new.event_id, old.event_id);
begin
  if exists (select 1 from public.events where id = target_event and roster_status = 'locked')
     and current_setting('app.late_roster_change_authorized', true) is distinct from 'true'
  then raise exception 'event roster is locked' using errcode = '42501'; end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.validate_registration()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare expected_type text; expected_house uuid; student_academic text; student_eligibility text; team_event uuid; team_house uuid;
begin
  select event_type into expected_type from public.events where id = new.event_id;
  select house_id, enrollment_status, eligibility_status into expected_house, student_academic, student_eligibility
  from public.students where id = new.student_id;
  if expected_type is distinct from new.entry_type then raise exception 'registration type must match event type'; end if;
  if expected_house is distinct from new.house_id then raise exception 'registration house must match student house'; end if;
  if student_academic <> 'enrolled' or student_eligibility <> 'eligible' then raise exception 'student is not eligible for registration' using errcode = '23514'; end if;
  if exists (
    select 1 from public.event_registrations er
    join public.events existing_event on existing_event.id=er.event_id
    join public.events requested_event on requested_event.id=new.event_id
    where er.student_id=new.student_id and er.id<>new.id
      and er.status not in ('rejected','withdrawn','disqualified')
      and existing_event.status<>'cancelled'
      and existing_event.starts_at is not null and existing_event.ends_at is not null
      and requested_event.starts_at is not null and requested_event.ends_at is not null
      and tstzrange(existing_event.starts_at,existing_event.ends_at,'[)') && tstzrange(requested_event.starts_at,requested_event.ends_at,'[)')
  ) then raise exception 'student has a conflicting event schedule' using errcode='23P01'; end if;
  if expected_type = 'individual' and new.team_id is not null then raise exception 'individual entries cannot reference a team'; end if;
  if expected_type = 'team' then
    select event_id, house_id into team_event, team_house from public.event_teams where id = new.team_id;
    if team_event is distinct from new.event_id or team_house is distinct from new.house_id then raise exception 'team belongs to another event or house'; end if;
    new.team_entry_id := new.team_id;
  end if;
  return new;
end;
$$;

create or replace function private.capture_registration_history()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.registration_history(registration_id, previous_status, new_status, reason, changed_by)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end, new.status, new.rejection_reason, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists meet_configuration_guard on public.sports_meets;
create trigger meet_configuration_guard before insert or update on public.sports_meets for each row execute function private.guard_meet_configuration();
drop trigger if exists event_configuration_guard on public.events;
create trigger event_configuration_guard before insert or update on public.events for each row execute function private.guard_event_configuration();
create trigger meet_houses_draft_guard before insert or update or delete on public.meet_houses for each row execute function private.guard_draft_meet_child();
create trigger sport_categories_draft_guard before insert or update or delete on public.sport_categories for each row execute function private.guard_draft_meet_child();
drop trigger if exists registration_history_capture on public.event_registrations;
create trigger registration_history_capture after insert or update on public.event_registrations for each row execute function private.capture_registration_history();

create trigger categories_updated_at before update on public.sport_categories for each row execute function private.set_updated_at();
create trigger teams_updated_at before update on public.event_teams for each row execute function private.set_updated_at();
create trigger roster_submissions_updated_at before update on public.event_roster_submissions for each row execute function private.set_updated_at();
create trigger event_official_assignment_guard before insert or update on public.event_officials for each row execute function private.validate_event_official_assignment();

create or replace function public.register_event_participant(
  p_event_id uuid, p_student_id uuid, p_team_id uuid default null, p_submit boolean default false
)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); student_house uuid; event_record public.events%rowtype; meet_record public.sports_meets%rowtype; registration_id uuid; current_count integer;
begin
  -- Serialize registration against the event row so concurrent requests cannot
  -- both pass the per-house participant limit.
  select * into event_record from public.events where id = p_event_id for update;
  if not found then raise exception 'event not found' using errcode = 'P0002'; end if;
  select * into meet_record from public.sports_meets where id = event_record.sports_meet_id;
  select house_id into student_house from public.students where id = p_student_id;
  if actor is null or not (
    private.has_role('system_administrator') or private.has_role('sports_coordinator')
    or private.has_role('registration_officer') or private.has_house_role('house_representative', student_house)
  ) then raise exception 'registration role required' using errcode = '42501'; end if;
  if event_record.roster_status = 'locked' then raise exception 'event roster is locked' using errcode = '42501'; end if;
  if meet_record.status <> 'registration_open' or event_record.registration_status <> 'open'
     or now() < meet_record.registration_opens_at or now() > meet_record.registration_closes_at
  then raise exception 'registration is not open' using errcode = '55000'; end if;
  if not exists (select 1 from public.meet_houses mh where mh.sports_meet_id = event_record.sports_meet_id and mh.house_id = student_house and mh.is_active) then
    raise exception 'student house is not participating in this meet' using errcode = '23514';
  end if;
  if event_record.maximum_participants_per_house is not null then
    select count(*) into current_count from public.event_registrations er
    where er.event_id = p_event_id and er.house_id = student_house and er.status not in ('rejected','withdrawn','disqualified');
    if current_count >= event_record.maximum_participants_per_house then raise exception 'event participant limit reached' using errcode = '23514'; end if;
  end if;
  insert into public.event_registrations(event_id, student_id, house_id, entry_type, team_id, team_entry_id, status, submitted_at, registered_by)
  values (p_event_id, p_student_id, student_house, event_record.event_type, p_team_id,
    case when event_record.event_type = 'team' then p_team_id else null end,
    case when p_submit then 'submitted' else 'draft' end,
    case when p_submit then now() else null end, actor)
  returning id into registration_id;
  return registration_id;
end;
$$;

create or replace function public.create_event_team(p_event_id uuid, p_name text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); actor_house uuid; event_kind text; team_id uuid; meet_state text;
begin
  select house_id into actor_house from public.user_roles
  where user_id = actor and role = 'house_representative' and (expires_at is null or expires_at > now()) limit 1;
  if private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') then
    raise exception 'official team creation requires a house-scoped workflow' using errcode = '22023';
  end if;
  if actor_house is null then raise exception 'house representative role required' using errcode = '42501'; end if;
  select e.event_type, sm.status into event_kind, meet_state
  from public.events e join public.sports_meets sm on sm.id = e.sports_meet_id
  where e.id = p_event_id and e.roster_status = 'open' and e.registration_status = 'open'
    and exists (select 1 from public.meet_houses mh where mh.sports_meet_id = e.sports_meet_id and mh.house_id = actor_house and mh.is_active);
  if meet_state <> 'registration_open' then raise exception 'team creation requires open registration for a participating house' using errcode = '55000'; end if;
  if event_kind <> 'team' then raise exception 'teams are only valid for an open team event' using errcode = '23514'; end if;
  insert into public.event_teams(event_id, house_id, name, created_by)
  values (p_event_id, actor_house, trim(p_name), actor) returning id into team_id;
  return team_id;
end;
$$;

create or replace function public.submit_event_roster(p_event_id uuid, p_house_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); submission_id uuid; event_record public.events%rowtype; invalid_team_count integer;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative', p_house_id)) then
    raise exception 'roster submission role required' using errcode = '42501';
  end if;
  select * into event_record from public.events where id = p_event_id for update;
  if event_record.roster_status = 'locked' then raise exception 'event roster is locked' using errcode = '42501'; end if;
  if not exists (select 1 from public.event_registrations where event_id = p_event_id and house_id = p_house_id and status in ('draft','submitted')) then
    raise exception 'the roster has no participants' using errcode = '23514';
  end if;
  if event_record.event_type = 'team' then
    select count(*) into invalid_team_count from public.event_teams t
    where t.event_id = p_event_id and t.house_id = p_house_id and exists (
      select 1 from public.event_registrations er where er.team_id = t.id and er.status in ('draft','submitted')
      having count(*) < event_record.minimum_team_size or count(*) > event_record.maximum_team_size
    );
    if invalid_team_count > 0 then raise exception 'one or more teams are outside roster size limits' using errcode = '23514'; end if;
  end if;
  update public.event_registrations set status = 'submitted', submitted_at = coalesce(submitted_at, now())
  where event_id = p_event_id and house_id = p_house_id and status = 'draft';
  update public.event_teams set status = 'submitted'
  where event_id = p_event_id and house_id = p_house_id and status = 'draft';
  insert into public.event_roster_submissions(event_id, house_id, status, submitted_by, submitted_at)
  values (p_event_id, p_house_id, 'submitted', actor, now())
  on conflict (event_id, house_id) do update set status = 'submitted', submitted_by = actor,
    submitted_at = now(), reviewed_by = null, reviewed_at = null, rejection_reason = null
  returning id into submission_id;
  return submission_id;
end;
$$;

create or replace function public.review_event_roster(p_submission_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); submission public.event_roster_submissions%rowtype;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')) then raise exception 'roster reviewer role required' using errcode = '42501'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid roster decision' using errcode = '22023'; end if;
  if p_decision = 'rejected' and length(trim(coalesce(p_reason,''))) < 5 then raise exception 'a rejection reason is required' using errcode = '22023'; end if;
  select * into submission from public.event_roster_submissions where id = p_submission_id for update;
  if submission.status <> 'submitted' then raise exception 'roster is not awaiting review' using errcode = '55000'; end if;
  if submission.submitted_by = actor then raise exception 'roster submitter cannot approve their own roster' using errcode = '42501'; end if;
  update public.event_roster_submissions set status = p_decision, reviewed_by = actor, reviewed_at = now(), rejection_reason = nullif(trim(coalesce(p_reason,'')),'') where id = p_submission_id;
  update public.event_registrations set status = p_decision, reviewed_by = actor, reviewed_at = now(),
    approved_at = case when p_decision = 'approved' then now() else null end,
    rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end
  where event_id = submission.event_id and house_id = submission.house_id and status = 'submitted';
  update public.event_teams set status = p_decision,
    rejection_reason = case when p_decision = 'rejected' then trim(p_reason) else null end
  where event_id = submission.event_id and house_id = submission.house_id and status = 'submitted';
end;
$$;

create or replace function public.withdraw_event_registration(p_registration_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); registration_record public.event_registrations%rowtype; lock_state text;
begin
  select * into registration_record from public.event_registrations where id = p_registration_id for update;
  if not found then raise exception 'registration not found' using errcode = 'P0002'; end if;
  select roster_status into lock_state from public.events where id = registration_record.event_id;
  if lock_state = 'locked' then raise exception 'event roster is locked' using errcode = '42501'; end if;
  if private.has_house_role('house_representative',registration_record.house_id) then
    if registration_record.status not in ('draft','submitted','rejected') then raise exception 'house representatives cannot withdraw an approved entry' using errcode = '42501'; end if;
  elsif not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')) then
    raise exception 'withdrawal role required' using errcode = '42501';
  end if;
  update public.event_registrations set status='withdrawn', withdrawn_at=now(), rejection_reason=nullif(trim(coalesce(p_reason,'')),'') where id=p_registration_id;
end;
$$;

create or replace function public.lock_event_roster(p_event_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare target_meet uuid; close_at timestamptz; meet_state text;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')) then raise exception 'roster lock role required' using errcode = '42501'; end if;
  select e.sports_meet_id, sm.registration_closes_at, sm.status into target_meet, close_at, meet_state
  from public.events e join public.sports_meets sm on sm.id = e.sports_meet_id where e.id = p_event_id for update of e;
  if meet_state not in ('registration_closed','in_progress','completed') and now() < close_at then raise exception 'roster cannot be locked before the registration deadline' using errcode = '55000'; end if;
  if exists (select 1 from public.event_roster_submissions where event_id = p_event_id and status = 'submitted') then raise exception 'submitted rosters still require review' using errcode = '55000'; end if;
  update public.events set roster_status = 'locked', roster_locked_at = now(), registration_status = 'closed' where id = p_event_id;
end;
$$;

create or replace function public.request_late_roster_addition(p_event_id uuid, p_student_id uuid, p_team_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); student_house uuid; request_id uuid;
begin
  select house_id into student_house from public.students where id = p_student_id;
  if not private.has_house_role('house_representative', student_house) then raise exception 'house representative role required' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = p_event_id and roster_status = 'locked') then raise exception 'late-change requests require a locked roster' using errcode = '55000'; end if;
  insert into public.roster_change_requests(event_id, house_id, student_id, team_id, reason, requested_by)
  values (p_event_id, student_house, p_student_id, p_team_id, trim(p_reason), actor) returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.decide_late_roster_addition(p_request_id uuid, p_approve boolean, p_reason text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); request_record public.roster_change_requests%rowtype; event_kind text; registration_id uuid;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator')) then raise exception 'late-change approver role required' using errcode = '42501'; end if;
  select * into request_record from public.roster_change_requests where id = p_request_id for update;
  if request_record.status <> 'pending' then raise exception 'request was already decided' using errcode = '55000'; end if;
  if request_record.requested_by = actor then raise exception 'requester cannot approve their own late change' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason,''))) < 5 then raise exception 'a decision reason is required' using errcode = '22023'; end if;
  if p_approve then
    select event_type into event_kind from public.events where id = request_record.event_id;
    perform set_config('app.late_roster_change_authorized','true',true);
    insert into public.event_registrations(event_id, student_id, house_id, entry_type, team_id, team_entry_id, status, submitted_at, reviewed_by, reviewed_at, approved_at, registered_by)
    values (request_record.event_id, request_record.student_id, request_record.house_id, event_kind, request_record.team_id,
      case when event_kind = 'team' then request_record.team_id else null end, 'approved', now(), actor, now(), now(), request_record.requested_by)
    returning id into registration_id;
    perform set_config('app.late_roster_change_authorized','false',true);
  end if;
  update public.roster_change_requests set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = actor, decided_at = now(), decision_reason = trim(p_reason), created_registration_id = registration_id
  where id = p_request_id;
  return registration_id;
end;
$$;

create or replace function public.issue_registration_token(p_registration_id uuid)
returns text language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); registration_house uuid; registration_state text; roster_state text; opaque_token text;
begin
  select er.house_id, er.status, e.roster_status into registration_house, registration_state, roster_state
  from public.event_registrations er join public.events e on e.id = er.event_id
  where er.id = p_registration_id for update of er;
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative', registration_house)) then raise exception 'token issuer role required' using errcode = '42501'; end if;
  if registration_state not in ('approved','checked_in') then raise exception 'only approved registrations receive tokens' using errcode = '55000'; end if;
  if roster_state <> 'locked' then raise exception 'tokens are issued only after roster lock' using errcode = '55000'; end if;
  opaque_token := replace(replace(replace(encode(extensions.gen_random_bytes(32),'base64'),'+','-'),'/','_'),'=','');
  update public.registration_tokens set revoked_by = actor, revoked_at = now() where registration_id = p_registration_id and revoked_at is null;
  insert into public.registration_tokens(registration_id, token_hash, issued_by) values (p_registration_id, extensions.digest(opaque_token,'sha256'), actor);
  return opaque_token;
end;
$$;

create or replace function public.check_in_with_token(p_event_id uuid, p_token text, p_identity_confirmed boolean)
returns table(registration_id uuid, student_number text, display_name text, house_name text)
language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); token_record public.registration_tokens%rowtype; registration_record public.event_registrations%rowtype; attendance_id uuid;
begin
  if not p_identity_confirmed then raise exception 'physical identity confirmation is required' using errcode = '22023'; end if;
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.is_event_official('check_in_officer', p_event_id)) then raise exception 'assigned check-in officer role required' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = p_event_id and status = 'check_in_open') then raise exception 'event check-in is not open' using errcode = '55000'; end if;
  select * into token_record from public.registration_tokens where token_hash = extensions.digest(p_token,'sha256') and revoked_at is null;
  if not found then raise exception 'invalid registration token' using errcode = '22023'; end if;
  select * into registration_record from public.event_registrations where id = token_record.registration_id and event_id = p_event_id for update;
  if not found or registration_record.status not in ('approved','checked_in') then raise exception 'token does not identify an approved entry for this event' using errcode = '22023'; end if;
  insert into public.attendance(registration_id, event_id, token_id, method, identity_confirmed, checked_in_by)
  values (registration_record.id, p_event_id, token_record.id, 'qr', true, actor) returning id into attendance_id;
  update public.event_registrations set status = 'checked_in', checked_in_by = actor, checked_in_at = now() where id = registration_record.id;
  return query select registration_record.id, s.student_number, concat_ws(' ',s.legal_first_name,s.legal_last_name), h.name
    from public.students s join public.houses h on h.id = s.house_id where s.id = registration_record.student_id;
end;
$$;

create or replace function public.manual_check_in(p_event_id uuid, p_registration_id uuid, p_identity_confirmed boolean, p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); registration_state text;
begin
  if not p_identity_confirmed then raise exception 'physical identity confirmation is required' using errcode = '22023'; end if;
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.is_event_official('check_in_officer', p_event_id)) then raise exception 'assigned check-in officer role required' using errcode = '42501'; end if;
  if not exists (select 1 from public.events where id = p_event_id and status = 'check_in_open') then raise exception 'event check-in is not open' using errcode = '55000'; end if;
  select status into registration_state from public.event_registrations where id = p_registration_id and event_id = p_event_id for update;
  if registration_state <> 'approved' then raise exception 'manual check-in requires an approved entry' using errcode = '55000'; end if;
  insert into public.attendance(registration_id,event_id,method,identity_confirmed,manual_reason,checked_in_by)
  values (p_registration_id,p_event_id,'manual',true,trim(p_reason),actor);
  update public.event_registrations set status = 'checked_in', checked_in_by = actor, checked_in_at = now() where id = p_registration_id;
end;
$$;

create or replace function public.void_attendance(p_attendance_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); attendance_record public.attendance%rowtype;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator')) then raise exception 'attendance correction approver role required' using errcode = '42501'; end if;
  select * into attendance_record from public.attendance where id = p_attendance_id and voided_at is null for update;
  if not found then raise exception 'active attendance record not found' using errcode = 'P0002'; end if;
  if actor = attendance_record.checked_in_by then raise exception 'attendance correction requires independent approval' using errcode = '42501'; end if;
  update public.attendance set voided_by = actor, voided_at = now(), void_reason = trim(p_reason) where id = p_attendance_id;
  insert into public.attendance_corrections(attendance_id,requested_by,approved_by,reason) values (p_attendance_id,attendance_record.checked_in_by,actor,trim(p_reason));
  update public.event_registrations set status = 'approved', checked_in_by = null, checked_in_at = null where id = attendance_record.registration_id;
end;
$$;

alter table public.meet_houses enable row level security;
alter table public.sport_categories enable row level security;
alter table public.event_teams enable row level security;
alter table public.event_roster_submissions enable row level security;
alter table public.registration_history enable row level security;
alter table public.event_officials enable row level security;
alter table public.registration_tokens enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.roster_change_requests enable row level security;
alter table public.event_heats enable row level security;

revoke all on public.meet_houses, public.sport_categories, public.event_teams,
  public.event_roster_submissions, public.registration_history, public.event_officials,
  public.registration_tokens, public.attendance, public.attendance_corrections,
  public.roster_change_requests, public.event_heats from anon, authenticated;
grant select on public.meet_houses, public.sport_categories, public.event_teams,
  public.event_roster_submissions, public.registration_history, public.event_officials,
  public.attendance, public.attendance_corrections, public.roster_change_requests,
  public.event_heats to authenticated;
grant select on public.meet_houses, public.sport_categories, public.event_heats to anon;
grant insert, update on public.meet_houses, public.sport_categories, public.event_officials, public.event_heats to authenticated;

revoke insert, update on public.event_registrations from authenticated;

create policy meet_houses_public_read on public.meet_houses for select to anon using (is_active and exists (select 1 from public.sports_meets sm where sm.id = sports_meet_id and sm.published_at is not null));
create policy meet_houses_staff_read on public.meet_houses for select to authenticated using (is_active or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy meet_houses_coordinator_insert on public.meet_houses for insert to authenticated with check ((private.has_role('system_administrator') or private.has_role('sports_coordinator')) and added_by = auth.uid());
create policy meet_houses_coordinator_update on public.meet_houses for update to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy categories_public_read on public.sport_categories for select to anon using (is_active and exists (select 1 from public.sports_meets sm where sm.id = sports_meet_id and sm.published_at is not null));
create policy categories_staff_read on public.sport_categories for select to authenticated using (is_active or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy categories_coordinator_insert on public.sport_categories for insert to authenticated with check ((private.has_role('system_administrator') or private.has_role('sports_coordinator')) and created_by = auth.uid());
create policy categories_coordinator_update on public.sport_categories for update to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy teams_relevant_read on public.event_teams for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.is_event_official('check_in_officer',event_id) or private.has_house_role('house_representative',house_id));
create policy roster_submissions_relevant_read on public.event_roster_submissions for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative',house_id));
create policy registration_history_relevant_read on public.registration_history for select to authenticated using (exists (select 1 from public.event_registrations er where er.id = registration_id and (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative',er.house_id))));
create policy event_officials_own_read on public.event_officials for select to authenticated using (user_id = auth.uid() or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy event_officials_coordinator_insert on public.event_officials for insert to authenticated with check ((private.has_role('system_administrator') or private.has_role('sports_coordinator')) and assigned_by = auth.uid());
create policy event_officials_coordinator_update on public.event_officials for update to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy attendance_relevant_read on public.attendance for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.is_event_official('check_in_officer',event_id));
create policy attendance_corrections_privileged_read on public.attendance_corrections for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy roster_changes_relevant_read on public.roster_change_requests for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative',house_id));
create policy heats_public_read on public.event_heats for select to anon using (exists (select 1 from public.events e join public.sports_meets sm on sm.id=e.sports_meet_id where e.id=event_id and sm.published_at is not null));
create policy heats_staff_read on public.event_heats for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.is_event_official('event_judge',event_id) or private.is_event_official('check_in_officer',event_id));
create policy heats_coordinator_write on public.event_heats for all to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

drop policy if exists students_authorized_read on public.students;
create policy students_authorized_read on public.students for select to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator')
  or private.has_role('registration_officer') or private.has_role('results_verifier')
  or private.has_house_role('house_representative',house_id)
  or exists (select 1 from public.event_registrations er where er.student_id = students.id and private.is_event_official('check_in_officer',er.event_id) and er.status in ('approved','checked_in'))
);

drop policy if exists events_authenticated_read on public.events;
create policy events_authenticated_read on public.events for select to authenticated using (
  exists (select 1 from public.sports_meets sm where sm.id = sports_meet_id and sm.published_at is not null)
  or private.has_role('system_administrator') or private.has_role('sports_coordinator')
  or private.has_role('registration_officer') or private.is_event_official('event_judge',id)
  or private.is_event_official('check_in_officer',id)
  or exists (select 1 from public.meet_houses mh where mh.sports_meet_id = events.sports_meet_id and mh.is_active and private.has_house_role('house_representative',mh.house_id))
);

drop policy if exists meets_authenticated_read on public.sports_meets;
create policy meets_authenticated_read on public.sports_meets for select to authenticated using (
  published_at is not null or private.has_role('system_administrator') or private.has_role('sports_coordinator')
  or private.has_role('registration_officer')
  or exists (select 1 from public.meet_houses mh where mh.sports_meet_id = sports_meets.id and mh.is_active and private.has_house_role('house_representative',mh.house_id))
  or exists (select 1 from public.events e where e.sports_meet_id = sports_meets.id and (private.is_event_official('event_judge',e.id) or private.is_event_official('check_in_officer',e.id)))
);

drop policy if exists registrations_staff_read on public.event_registrations;
drop policy if exists registrations_authorized_insert on public.event_registrations;
drop policy if exists registrations_authorized_update on public.event_registrations;
create policy registrations_scoped_read on public.event_registrations for select to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')
  or private.has_house_role('house_representative',house_id)
  or private.is_event_official('event_judge',event_id)
  or private.is_event_official('check_in_officer',event_id)
);

create trigger audit_meet_houses after insert or update or delete on public.meet_houses for each row execute function private.write_audit_log();
create trigger audit_sport_categories after insert or update or delete on public.sport_categories for each row execute function private.write_audit_log();
create trigger audit_event_teams after insert or update or delete on public.event_teams for each row execute function private.write_audit_log();
create trigger audit_roster_submissions after insert or update or delete on public.event_roster_submissions for each row execute function private.write_audit_log();
create trigger audit_event_officials after insert or update or delete on public.event_officials for each row execute function private.write_audit_log();
create trigger audit_roster_change_requests after insert or update or delete on public.roster_change_requests for each row execute function private.write_audit_log();
create trigger audit_attendance after insert or update on public.attendance for each row execute function private.write_audit_log();

create trigger registration_history_append_only before update or delete on public.registration_history for each row execute function private.prevent_ledger_mutation();
create trigger attendance_corrections_append_only before update or delete on public.attendance_corrections for each row execute function private.prevent_ledger_mutation();

revoke all on function private.is_event_official(text,uuid) from public,anon;
grant execute on function private.is_event_official(text,uuid) to authenticated;
revoke all on function private.guard_meet_configuration() from public,anon,authenticated;
revoke all on function private.guard_event_configuration() from public,anon,authenticated;
revoke all on function private.guard_draft_meet_child() from public,anon,authenticated;
revoke all on function private.capture_registration_history() from public,anon,authenticated;
revoke all on function private.validate_event_official_assignment() from public,anon,authenticated;

revoke all on function public.register_event_participant(uuid,uuid,uuid,boolean) from public,anon;
revoke all on function public.create_event_team(uuid,text) from public,anon;
revoke all on function public.submit_event_roster(uuid,uuid) from public,anon;
revoke all on function public.review_event_roster(uuid,text,text) from public,anon;
revoke all on function public.lock_event_roster(uuid) from public,anon;
revoke all on function public.withdraw_event_registration(uuid,text) from public,anon;
revoke all on function public.request_late_roster_addition(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.decide_late_roster_addition(uuid,boolean,text) from public,anon;
revoke all on function public.issue_registration_token(uuid) from public,anon;
revoke all on function public.check_in_with_token(uuid,text,boolean) from public,anon;
revoke all on function public.manual_check_in(uuid,uuid,boolean,text) from public,anon;
revoke all on function public.void_attendance(uuid,text) from public,anon;
grant execute on function public.register_event_participant(uuid,uuid,uuid,boolean) to authenticated;
grant execute on function public.create_event_team(uuid,text) to authenticated;
grant execute on function public.submit_event_roster(uuid,uuid) to authenticated;
grant execute on function public.review_event_roster(uuid,text,text) to authenticated;
grant execute on function public.lock_event_roster(uuid) to authenticated;
grant execute on function public.withdraw_event_registration(uuid,text) to authenticated;
grant execute on function public.request_late_roster_addition(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.decide_late_roster_addition(uuid,boolean,text) to authenticated;
grant execute on function public.issue_registration_token(uuid) to authenticated;
grant execute on function public.check_in_with_token(uuid,text,boolean) to authenticated;
grant execute on function public.manual_check_in(uuid,uuid,boolean,text) to authenticated;
grant execute on function public.void_attendance(uuid,text) to authenticated;

