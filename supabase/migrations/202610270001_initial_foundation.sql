-- CSMIS initial integrity foundation.
-- No scoring values or production data are seeded by this migration.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.houses (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 2 and 12),
  name text not null unique check (length(trim(name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  student_number text not null unique check (length(trim(student_number)) > 0),
  house_id uuid not null references public.houses(id) on delete restrict,
  legal_first_name text not null check (length(trim(legal_first_name)) > 0),
  legal_last_name text not null check (length(trim(legal_last_name)) > 0),
  date_of_birth date,
  enrollment_status text not null default 'enrolled'
    check (enrollment_status in ('enrolled', 'suspended', 'graduated', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_house_id_idx on public.students(house_id);
create index students_enrollment_status_idx on public.students(enrollment_status);

create table public.sports_meets (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft'
    check (status in ('draft', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, starts_on),
  check (ends_on >= starts_on),
  check (published_at is null or status in ('registration_open', 'registration_closed', 'in_progress', 'completed', 'archived'))
);

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  code text not null,
  name text not null check (length(trim(name)) > 0),
  event_type text not null check (event_type in ('individual', 'team')),
  minimum_team_size integer,
  maximum_team_size integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'check_in_open', 'in_progress', 'completed', 'cancelled')),
  roster_status text not null default 'open' check (roster_status in ('open', 'locked')),
  roster_locked_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sports_meet_id, code),
  check (
    (event_type = 'individual' and minimum_team_size is null and maximum_team_size is null)
    or
    (event_type = 'team' and minimum_team_size >= 2 and maximum_team_size >= minimum_team_size)
  ),
  check ((roster_status = 'open' and roster_locked_at is null) or (roster_status = 'locked' and roster_locked_at is not null))
);

create index events_sports_meet_id_idx on public.events(sports_meet_id);
create index events_status_idx on public.events(status);

create table public.user_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'system_administrator', 'sports_coordinator', 'registration_officer',
    'house_representative', 'check_in_officer', 'event_judge',
    'results_verifier', 'protest_committee', 'public_viewer'
  )),
  house_id uuid references public.houses(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique nulls not distinct (user_id, role, house_id, event_id),
  check (
    (role = 'house_representative' and house_id is not null and event_id is null)
    or (role = 'event_judge' and event_id is not null and house_id is null)
    or (role not in ('house_representative', 'event_judge') and house_id is null and event_id is null)
  ),
  check (expires_at is null or expires_at > granted_at)
);

create index user_roles_user_id_idx on public.user_roles(user_id);
create index user_roles_house_id_idx on public.user_roles(house_id) where house_id is not null;
create index user_roles_event_id_idx on public.user_roles(event_id) where event_id is not null;

create table public.event_registrations (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  entry_type text not null check (entry_type in ('individual', 'team')),
  team_entry_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'checked_in', 'withdrawn', 'disqualified')),
  registered_by uuid not null references auth.users(id) on delete restrict,
  checked_in_by uuid references auth.users(id) on delete restrict,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, student_id),
  check ((entry_type = 'individual' and team_entry_id is null) or (entry_type = 'team' and team_entry_id is not null)),
  check ((status = 'checked_in' and checked_in_by is not null and checked_in_at is not null) or status <> 'checked_in')
);

create index event_registrations_event_id_idx on public.event_registrations(event_id);
create index event_registrations_house_id_idx on public.event_registrations(house_id);
create index event_registrations_team_entry_id_idx on public.event_registrations(team_entry_id) where team_entry_id is not null;

create table public.results (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  entry_type text not null check (entry_type in ('individual', 'team')),
  registration_id uuid references public.event_registrations(id) on delete restrict,
  team_entry_id uuid,
  house_id uuid not null references public.houses(id) on delete restrict,
  result_data jsonb not null check (jsonb_typeof(result_data) = 'object'),
  placement integer check (placement is null or placement > 0),
  status text not null default 'submitted'
    check (status in ('submitted', 'verified', 'approved', 'published', 'rejected')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete restrict,
  verified_at timestamptz,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  published_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((entry_type = 'individual' and registration_id is not null and team_entry_id is null) or (entry_type = 'team' and registration_id is null and team_entry_id is not null)),
  check ((status in ('verified', 'approved', 'published') and verified_by is not null and verified_at is not null) or status in ('submitted', 'rejected')),
  check ((status in ('approved', 'published') and approved_by is not null and approved_at is not null) or status in ('submitted', 'verified', 'rejected')),
  check ((status = 'published' and published_by is not null and published_at is not null) or status <> 'published')
);

create unique index results_individual_entry_uidx on public.results(event_id, registration_id) where registration_id is not null;
create unique index results_team_entry_uidx on public.results(event_id, team_entry_id) where team_entry_id is not null;
create index results_event_status_idx on public.results(event_id, status);

create table public.result_revisions (
  id uuid primary key default extensions.gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  changed_by uuid references auth.users(id) on delete restrict,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (result_id, revision_number)
);

create index result_revisions_result_id_idx on public.result_revisions(result_id, revision_number desc);

create table public.scoring_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  version integer not null check (version > 0),
  definition jsonb not null check (jsonb_typeof(definition) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  created_by uuid not null references auth.users(id) on delete restrict,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sports_meet_id, name, version),
  check ((status in ('active', 'retired') and activated_at is not null) or status = 'draft')
);

create unique index scoring_rules_one_active_version_uidx
  on public.scoring_rules(sports_meet_id, name) where status = 'active';

create table public.point_awards (
  id uuid primary key default extensions.gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete restrict,
  result_revision_id uuid not null references public.result_revisions(id) on delete restrict,
  scoring_rule_id uuid not null references public.scoring_rules(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  points numeric(10, 2) not null,
  reason text not null check (length(trim(reason)) > 0),
  awarded_by uuid not null references auth.users(id) on delete restrict,
  awarded_at timestamptz not null default now(),
  unique (result_id, scoring_rule_id, house_id)
);

create index point_awards_house_id_idx on public.point_awards(house_id);
create index point_awards_result_id_idx on public.point_awards(result_id);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now(),
  request_id text
);

create index audit_logs_record_idx on public.audit_logs(table_name, record_id, occurred_at desc);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id, occurred_at desc);

create table public.protests (
  id uuid primary key default extensions.gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete restrict,
  filed_by uuid not null references auth.users(id) on delete restrict,
  house_id uuid not null references public.houses(id) on delete restrict,
  grounds text not null check (length(trim(grounds)) > 0),
  status text not null default 'filed' check (status in ('filed', 'under_review', 'upheld', 'dismissed', 'withdrawn')),
  decision text,
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('upheld', 'dismissed') and decision is not null and decided_by is not null and decided_at is not null) or status in ('filed', 'under_review', 'withdrawn'))
);

create index protests_result_id_idx on public.protests(result_id);
create index protests_status_idx on public.protests(status);

-- Authorization helpers live outside the exposed public schema.
create or replace function private.has_role(required_role text)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = required_role
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function private.has_house_role(required_role text, required_house uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = required_role
      and ur.house_id = required_house
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function private.has_event_role(required_role text, required_event uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = required_role
      and ur.event_id = required_event
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

revoke all on function private.has_role(text) from public;
revoke all on function private.has_house_role(text, uuid) from public;
revoke all on function private.has_event_role(text, uuid) from public;
grant execute on function private.has_role(text) to authenticated;
grant execute on function private.has_house_role(text, uuid) to authenticated;
grant execute on function private.has_event_role(text, uuid) to authenticated;

create or replace function private.set_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function private.guard_roster_changes()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare target_event uuid := coalesce(new.event_id, old.event_id);
begin
  if exists (select 1 from public.events where id = target_event and roster_status = 'locked') then
    raise exception 'event roster is locked' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.guard_event_roster_lock()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.roster_status = 'locked' and new.roster_status <> 'locked' then
    raise exception 'a locked roster cannot be reopened' using errcode = '42501';
  end if;
  if old.roster_status = 'open' and new.roster_status = 'locked' and new.roster_locked_at is null then
    new.roster_locked_at = now();
  end if;
  return new;
end;
$$;

create or replace function private.validate_registration()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare expected_type text; expected_house uuid;
begin
  select event_type into expected_type from public.events where id = new.event_id;
  select house_id into expected_house from public.students where id = new.student_id;
  if expected_type is distinct from new.entry_type then raise exception 'registration type must match event type'; end if;
  if expected_house is distinct from new.house_id then raise exception 'registration house must match student house'; end if;
  return new;
end;
$$;

create or replace function private.guard_result_lifecycle()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then raise exception 'new results must begin as submitted'; end if;
    if actor is not null and new.submitted_by <> actor then raise exception 'submitted_by must be the current user'; end if;
    return new;
  end if;
  if old.status = 'published' then raise exception 'published results are immutable' using errcode = '42501'; end if;
  if old.status = 'approved' and new.status <> 'published' then raise exception 'approved results may only be published' using errcode = '42501'; end if;
  if old.status = 'approved' and (new.result_data <> old.result_data or new.placement is distinct from old.placement) then
    raise exception 'approved result data is immutable' using errcode = '42501';
  end if;
  if old.submitted_by <> new.submitted_by or old.event_id <> new.event_id or old.entry_type <> new.entry_type
     or old.registration_id is distinct from new.registration_id or old.team_entry_id is distinct from new.team_entry_id then
    raise exception 'result identity fields are immutable' using errcode = '42501';
  end if;
  if (new.result_data <> old.result_data or new.placement is distinct from old.placement)
     and not (old.status in ('submitted', 'rejected') and actor = old.submitted_by and private.has_event_role('event_judge', old.event_id)) then
    raise exception 'only the submitting judge may revise result data before verification' using errcode = '42501';
  end if;
  if old.status = new.status and (
    old.verified_by is distinct from new.verified_by or old.verified_at is distinct from new.verified_at
    or old.approved_by is distinct from new.approved_by or old.approved_at is distinct from new.approved_at
    or old.published_by is distinct from new.published_by or old.published_at is distinct from new.published_at
  ) then raise exception 'lifecycle actors change only during a status transition'; end if;
  if (old.status, new.status) not in (('submitted','verified'), ('submitted','rejected'), ('verified','approved'), ('verified','rejected'), ('rejected','submitted'), ('approved','published'))
     and old.status <> new.status then raise exception 'invalid result status transition';
  end if;
  if old.status = 'submitted' and new.status = 'verified' and (new.verified_by is null or (actor is not null and new.verified_by <> actor)) then raise exception 'verification actor is invalid'; end if;
  if old.status = 'submitted' and new.status = 'verified' and not (private.has_role('results_verifier') or private.has_role('system_administrator')) then raise exception 'results verifier role required' using errcode = '42501'; end if;
  if old.status = 'submitted' and new.status = 'rejected' and not (private.has_role('results_verifier') or private.has_role('system_administrator')) then raise exception 'results verifier role required for rejection' using errcode = '42501'; end if;
  if old.status = 'verified' and new.status = 'approved' then
    if new.approved_by is null or (actor is not null and new.approved_by <> actor) then raise exception 'approval actor is invalid'; end if;
    if new.approved_by = new.submitted_by then raise exception 'a result submitter cannot approve their own result' using errcode = '42501'; end if;
    if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'sports coordinator role required for approval' using errcode = '42501'; end if;
  end if;
  if old.status = 'approved' and new.status = 'published' and (new.published_by is null or (actor is not null and new.published_by <> actor)) then raise exception 'publication actor is invalid'; end if;
  if old.status = 'approved' and new.status = 'published' and not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'sports coordinator role required for publication' using errcode = '42501'; end if;
  if old.status = 'verified' and new.status = 'rejected' and not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'sports coordinator role required for rejection' using errcode = '42501'; end if;
  if old.status = 'rejected' and new.status = 'submitted' and not (actor = old.submitted_by and private.has_event_role('event_judge', old.event_id)) then raise exception 'only the submitting judge may resubmit a rejected result' using errcode = '42501'; end if;
  return new;
end;
$$;

create or replace function private.guard_scoring_rule_version()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.status = 'retired' then raise exception 'retired scoring-rule versions are immutable' using errcode = '42501'; end if;
  if old.status = 'active' and (
    new.sports_meet_id <> old.sports_meet_id or new.name <> old.name or new.version <> old.version
    or new.definition <> old.definition or new.created_by <> old.created_by
    or new.status not in ('active', 'retired')
  ) then raise exception 'active scoring-rule versions cannot be rewritten' using errcode = '42501'; end if;
  return new;
end;
$$;

create or replace function private.validate_result_entry()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare min_size integer; max_size integer; roster_count integer;
begin
  if new.entry_type = 'individual' then
    if not exists (
      select 1 from public.event_registrations er
      where er.id = new.registration_id and er.event_id = new.event_id
        and er.house_id = new.house_id and er.entry_type = 'individual'
        and er.status in ('approved', 'checked_in')
    ) then raise exception 'individual result requires an eligible registration'; end if;
  else
    select e.minimum_team_size, e.maximum_team_size into min_size, max_size
    from public.events e where e.id = new.event_id and e.event_type = 'team';
    select count(*) into roster_count from public.event_registrations er
    where er.event_id = new.event_id and er.team_entry_id = new.team_entry_id
      and er.house_id = new.house_id and er.entry_type = 'team'
      and er.status in ('approved', 'checked_in');
    if min_size is null or roster_count < min_size or roster_count > max_size then
      raise exception 'team result requires an eligible roster within event size limits';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.capture_result_revision()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  insert into public.result_revisions(result_id, revision_number, snapshot, changed_by)
  values (new.id, coalesce((select max(revision_number) + 1 from public.result_revisions where result_id = new.id), 1), to_jsonb(new), auth.uid());
  return new;
end;
$$;

create or replace function private.prevent_ledger_mutation()
returns trigger language plpgsql
set search_path = pg_catalog
as $$ begin raise exception '% is append-only', tg_table_name using errcode = '42501'; end; $$;

create or replace function private.validate_point_award()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare result_meet uuid; rule_meet uuid; result_state text; result_house uuid;
begin
  select e.sports_meet_id, r.status, r.house_id into result_meet, result_state, result_house
  from public.results r join public.events e on e.id = r.event_id where r.id = new.result_id;
  select sports_meet_id into rule_meet from public.scoring_rules where id = new.scoring_rule_id and status in ('active','retired');
  if result_state not in ('approved','published') then raise exception 'points require an approved result'; end if;
  if result_house is distinct from new.house_id then raise exception 'point award house must match result house'; end if;
  if result_meet is distinct from rule_meet then raise exception 'scoring rule and result must belong to the same meet'; end if;
  if not exists (select 1 from public.result_revisions rr where rr.id = new.result_revision_id and rr.result_id = new.result_id and rr.snapshot->>'status' in ('approved','published')) then
    raise exception 'point award must reference an approved result revision';
  end if;
  return new;
end;
$$;

create or replace function private.write_audit_log()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
declare
  old_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_row jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_id uuid := coalesce((new_row->>'id')::uuid, (old_row->>'id')::uuid);
begin
  insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data, request_id)
  values (auth.uid(), lower(tg_op), tg_table_name, row_id, old_row, new_row, nullif(current_setting('request.headers', true), '')::jsonb->>'x-request-id');
  return coalesce(new, old);
end;
$$;

create trigger houses_updated_at before update on public.houses for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger students_updated_at before update on public.students for each row execute function private.set_updated_at();
create trigger sports_meets_updated_at before update on public.sports_meets for each row execute function private.set_updated_at();
create trigger events_updated_at before update on public.events for each row execute function private.set_updated_at();
create trigger registrations_updated_at before update on public.event_registrations for each row execute function private.set_updated_at();
create trigger results_updated_at before update on public.results for each row execute function private.set_updated_at();
create trigger protests_updated_at before update on public.protests for each row execute function private.set_updated_at();
create trigger event_roster_lock_guard before update on public.events for each row execute function private.guard_event_roster_lock();
create trigger registration_validation before insert or update on public.event_registrations for each row execute function private.validate_registration();
create trigger roster_mutation_guard before insert or update or delete on public.event_registrations for each row execute function private.guard_roster_changes();
create trigger result_lifecycle_guard before insert or update on public.results for each row execute function private.guard_result_lifecycle();
create trigger result_entry_validation before insert on public.results for each row execute function private.validate_result_entry();
create trigger result_revision_capture after insert or update on public.results for each row execute function private.capture_result_revision();
create trigger result_revisions_append_only before update or delete on public.result_revisions for each row execute function private.prevent_ledger_mutation();
create trigger audit_logs_append_only before update or delete on public.audit_logs for each row execute function private.prevent_ledger_mutation();
create trigger point_award_validation before insert on public.point_awards for each row execute function private.validate_point_award();
create trigger point_awards_append_only before update or delete on public.point_awards for each row execute function private.prevent_ledger_mutation();
create trigger scoring_rule_version_guard before update on public.scoring_rules for each row execute function private.guard_scoring_rule_version();

do $$
declare relation_name text;
begin
  foreach relation_name in array array['houses','profiles','user_roles','students','sports_meets','events','event_registrations','results','result_revisions','scoring_rules','point_awards','audit_logs','protests']
  loop
    execute format('alter table public.%I enable row level security', relation_name);
  end loop;
end $$;

-- Remove implicit API privileges, then add only operations that have policies.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.houses, public.sports_meets, public.events, public.results, public.scoring_rules, public.point_awards to anon;
grant select on all tables in schema public to authenticated;
grant insert, update on public.houses, public.profiles, public.user_roles, public.students, public.sports_meets, public.events, public.event_registrations, public.results, public.scoring_rules, public.protests to authenticated;
grant insert on public.point_awards to authenticated;

create policy houses_public_read on public.houses for select to anon using (is_active);
create policy houses_authenticated_read on public.houses for select to authenticated using (is_active or private.has_role('system_administrator'));
create policy houses_admin_write on public.houses for all to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or private.has_role('system_administrator'));
create policy profiles_admin_write on public.profiles for all to authenticated using (private.has_role('system_administrator')) with check (private.has_role('system_administrator'));

create policy roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid() or private.has_role('system_administrator'));
create policy roles_admin_write on public.user_roles for all to authenticated using (private.has_role('system_administrator')) with check (private.has_role('system_administrator') and granted_by = auth.uid());

create policy students_authorized_read on public.students for select to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')
  or private.has_role('check_in_officer') or private.has_role('results_verifier')
  or private.has_house_role('house_representative', house_id)
);
create policy students_registration_write on public.students for all to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer')
) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer'));

create policy meets_public_read on public.sports_meets for select to anon using (published_at is not null);
create policy meets_authenticated_read on public.sports_meets for select to authenticated using (published_at is not null or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy meets_coordinator_write on public.sports_meets for all to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy events_public_read on public.events for select to anon using (exists (select 1 from public.sports_meets sm where sm.id = sports_meet_id and sm.published_at is not null));
create policy events_authenticated_read on public.events for select to authenticated using (
  exists (select 1 from public.sports_meets sm where sm.id = sports_meet_id and sm.published_at is not null)
  or private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_event_role('event_judge', id));
create policy events_coordinator_write on public.events for all to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy registrations_staff_read on public.event_registrations for select to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_role('check_in_officer')
  or private.has_role('results_verifier') or private.has_event_role('event_judge', event_id) or private.has_house_role('house_representative', house_id)
);
create policy registrations_authorized_insert on public.event_registrations for insert to authenticated with check (
  registered_by = auth.uid() and (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_house_role('house_representative', house_id))
);
create policy registrations_authorized_update on public.event_registrations for update to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_role('check_in_officer') or private.has_house_role('house_representative', house_id)
) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_role('check_in_officer') or private.has_house_role('house_representative', house_id));

create policy results_public_read on public.results for select to anon, authenticated using (status = 'published');
create policy results_staff_read on public.results for select to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier') or private.has_role('protest_committee')
  or private.has_event_role('event_judge', event_id) or private.has_house_role('house_representative', house_id)
);
create policy results_judge_insert on public.results for insert to authenticated with check (submitted_by = auth.uid() and private.has_event_role('event_judge', event_id));
create policy results_controlled_update on public.results for update to authenticated using (
  private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier') or private.has_event_role('event_judge', event_id)
) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier') or private.has_event_role('event_judge', event_id));

create policy revisions_staff_read on public.result_revisions for select to authenticated using (
  exists (select 1 from public.results r where r.id = result_id and (
    private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier') or private.has_role('protest_committee')
    or private.has_event_role('event_judge', r.event_id) or private.has_house_role('house_representative', r.house_id)
  ))
);

create policy scoring_rules_public_read on public.scoring_rules for select to anon using (status in ('active','retired'));
create policy scoring_rules_authenticated_read on public.scoring_rules for select to authenticated using (status in ('active','retired') or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy scoring_rules_coordinator_write on public.scoring_rules for all to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy point_awards_public_read on public.point_awards for select to anon, authenticated using (exists (select 1 from public.results r where r.id = result_id and r.status = 'published'));
create policy point_awards_staff_read on public.point_awards for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier'));
create policy point_awards_coordinator_insert on public.point_awards for insert to authenticated with check (awarded_by = auth.uid() and (private.has_role('system_administrator') or private.has_role('sports_coordinator')));

create policy audit_logs_privileged_read on public.audit_logs for select to authenticated using (private.has_role('system_administrator') or private.has_role('sports_coordinator'));

create policy protests_relevant_read on public.protests for select to authenticated using (
  filed_by = auth.uid() or private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('protest_committee') or private.has_house_role('house_representative', house_id)
);
create policy protests_house_insert on public.protests for insert to authenticated with check (filed_by = auth.uid() and private.has_house_role('house_representative', house_id));
create policy protests_committee_update on public.protests for update to authenticated using (private.has_role('system_administrator') or private.has_role('protest_committee')) with check (private.has_role('system_administrator') or private.has_role('protest_committee'));

-- Audit sensitive writes after validation succeeds.
create trigger audit_houses after insert or update or delete on public.houses for each row execute function private.write_audit_log();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function private.write_audit_log();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function private.write_audit_log();
create trigger audit_students after insert or update or delete on public.students for each row execute function private.write_audit_log();
create trigger audit_meets after insert or update or delete on public.sports_meets for each row execute function private.write_audit_log();
create trigger audit_events after insert or update or delete on public.events for each row execute function private.write_audit_log();
create trigger audit_registrations after insert or update or delete on public.event_registrations for each row execute function private.write_audit_log();
create trigger audit_results after insert or update or delete on public.results for each row execute function private.write_audit_log();
create trigger audit_scoring_rules after insert or update or delete on public.scoring_rules for each row execute function private.write_audit_log();
create trigger audit_point_awards after insert or update or delete on public.point_awards for each row execute function private.write_audit_log();
create trigger audit_protests after insert or update or delete on public.protests for each row execute function private.write_audit_log();

-- Trigger functions are not callable API surfaces.
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.guard_roster_changes() from public, anon, authenticated;
revoke all on function private.guard_event_roster_lock() from public, anon, authenticated;
revoke all on function private.validate_registration() from public, anon, authenticated;
revoke all on function private.guard_result_lifecycle() from public, anon, authenticated;
revoke all on function private.validate_result_entry() from public, anon, authenticated;
revoke all on function private.capture_result_revision() from public, anon, authenticated;
revoke all on function private.prevent_ledger_mutation() from public, anon, authenticated;
revoke all on function private.validate_point_award() from public, anon, authenticated;
revoke all on function private.write_audit_log() from public, anon, authenticated;
revoke all on function private.guard_scoring_rule_version() from public, anon, authenticated;
