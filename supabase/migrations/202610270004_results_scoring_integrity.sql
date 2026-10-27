-- Complete competition integrity workflow: venues/schedules, structured
-- results, independent corrections, versioned scoring, protests, notifications,
-- and report metadata. No official scoring values or production data are added.

create table public.venues (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  code text not null check (code = upper(code) and length(code) between 2 and 20),
  name text not null check (length(trim(name)) between 2 and 120),
  location_note text check (location_note is null or length(location_note) <= 500),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sports_meet_id, code),
  unique (sports_meet_id, name)
);

alter table public.events
  add column venue_id uuid references public.venues(id) on delete restrict,
  add column protest_deadline_at timestamptz;

alter table public.event_heats
  add column venue_id uuid references public.venues(id) on delete restrict,
  add column ends_at timestamptz,
  add column advancement_rule text check (advancement_rule is null or length(advancement_rule) <= 1000),
  add column next_heat_id uuid references public.event_heats(id) on delete restrict,
  add constraint event_heats_schedule_check check (ends_at is null or starts_at is not null and ends_at > starts_at);

create table public.event_schedule_revisions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  previous_venue_id uuid references public.venues(id) on delete restrict,
  new_venue_id uuid references public.venues(id) on delete restrict,
  previous_starts_at timestamptz,
  new_starts_at timestamptz not null,
  previous_ends_at timestamptz,
  new_ends_at timestamptz not null,
  reason text not null check (length(trim(reason)) between 5 and 1000),
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (new_ends_at > new_starts_at)
);
create index event_schedule_revisions_event_idx on public.event_schedule_revisions(event_id, changed_at desc);

alter table public.results drop constraint if exists results_status_check;
alter table public.results drop constraint if exists results_check1;
alter table public.results drop constraint if exists results_check2;
alter table public.results drop constraint if exists results_check3;
alter table public.results
  add column outcome text not null default 'ranked' check (outcome in ('ranked','did_not_start','did_not_finish','disqualified','withdrawn','abandoned')),
  add column time_milliseconds bigint check (time_milliseconds is null or time_milliseconds > 0),
  add column distance_millimetres integer check (distance_millimetres is null or distance_millimetres > 0),
  add column height_millimetres integer check (height_millimetres is null or height_millimetres > 0),
  add column performance_score numeric(14,4),
  add column tie_group text check (tie_group is null or length(trim(tie_group)) between 1 and 40),
  add column is_suspicious boolean not null default false,
  add column anomaly_note text check (anomaly_note is null or length(trim(anomaly_note)) between 5 and 1000),
  add column review_reason text,
  add constraint results_status_check check (status in ('draft','submitted','under_review','verified','approved','rejected','disputed','final','published')),
  add constraint results_outcome_placement_check check (
    (outcome = 'ranked' and placement is not null)
    or (outcome <> 'ranked' and placement is null)
  ) not valid,
  add constraint results_anomaly_note_check check (not is_suspicious or anomaly_note is not null),
  add constraint results_verification_consistency check (
    status not in ('verified','approved','final','published','disputed')
    or (verified_by is not null and verified_at is not null)
  ),
  add constraint results_approval_consistency check (
    status not in ('approved','final','published','disputed')
    or (approved_by is not null and approved_at is not null)
  ),
  add constraint results_publication_consistency check (
    status <> 'published' or (published_by is not null and published_at is not null)
  ),
  add constraint results_team_entry_fk foreign key (team_entry_id) references public.event_teams(id) on delete restrict not valid;

drop index if exists results_individual_entry_uidx;
drop index if exists results_team_entry_uidx;
create unique index results_individual_entry_uidx on public.results(event_id, registration_id) where registration_id is not null and status <> 'rejected';
create unique index results_team_entry_uidx on public.results(event_id, team_entry_id) where team_entry_id is not null and status <> 'rejected';
create unique index results_untied_placement_uidx on public.results(event_id, placement)
  where outcome = 'ranked' and tie_group is null and status not in ('rejected','disputed');

create table public.result_correction_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete restrict,
  proposed_outcome text not null check (proposed_outcome in ('ranked','did_not_start','did_not_finish','disqualified','withdrawn','abandoned')),
  proposed_placement integer check (proposed_placement is null or proposed_placement > 0),
  proposed_time_milliseconds bigint check (proposed_time_milliseconds is null or proposed_time_milliseconds > 0),
  proposed_distance_millimetres integer check (proposed_distance_millimetres is null or proposed_distance_millimetres > 0),
  proposed_height_millimetres integer check (proposed_height_millimetres is null or proposed_height_millimetres > 0),
  proposed_performance_score numeric(14,4),
  proposed_tie_group text,
  reason text not null check (length(trim(reason)) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  decision_reason text,
  check ((proposed_outcome = 'ranked' and proposed_placement is not null) or (proposed_outcome <> 'ranked' and proposed_placement is null)),
  check ((status = 'pending' and decided_by is null and decided_at is null) or (status in ('approved','rejected') and decided_by is not null and decided_at is not null)),
  check (decided_by is null or decided_by <> requested_by)
);
create unique index result_correction_pending_uidx on public.result_correction_requests(result_id) where status = 'pending';

alter table public.scoring_rules drop constraint if exists scoring_rules_status_check;
alter table public.scoring_rules drop constraint if exists scoring_rules_check;
alter table public.scoring_rules
  add column tie_policy text not null default 'manual' check (tie_policy in ('manual','equal_points','shared_average')),
  add column approved_by uuid references auth.users(id) on delete restrict,
  add column approved_at timestamptz,
  add column notes text,
  add constraint scoring_rules_status_check check (status in ('draft','pending_approval','active','retired')),
  add constraint scoring_rules_approval_check check (
    (status in ('active','retired') and approved_by is not null and approved_at is not null and activated_at is not null)
    or status in ('draft','pending_approval')
  ) not valid,
  add constraint scoring_rules_independent_approval_check check (approved_by is null or approved_by <> created_by) not valid;

create table public.scoring_rule_positions (
  id uuid primary key default extensions.gen_random_uuid(),
  scoring_rule_id uuid not null references public.scoring_rules(id) on delete restrict,
  placement integer not null check (placement > 0),
  points numeric(10,2) not null check (points >= 0),
  created_at timestamptz not null default now(),
  unique (scoring_rule_id, placement)
);

alter table public.point_awards
  add column voided_by uuid references auth.users(id) on delete restrict,
  add column voided_at timestamptz,
  add column void_reason text,
  add constraint point_awards_void_check check (
    (voided_by is null and voided_at is null and void_reason is null)
    or (voided_by is not null and voided_at is not null and length(trim(void_reason)) >= 5)
  );
alter table public.point_awards drop constraint if exists point_awards_result_id_scoring_rule_id_house_id_key;
create unique index point_awards_active_uidx on public.point_awards(result_id, scoring_rule_id, house_id) where voided_at is null;

create table public.scoring_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  scoring_rule_id uuid not null references public.scoring_rules(id) on delete restrict,
  result_id uuid references public.results(id) on delete restrict,
  status text not null check (status in ('completed','skipped','failed')),
  detail text not null,
  run_by uuid not null references auth.users(id) on delete restrict,
  run_at timestamptz not null default now()
);
create index scoring_runs_meet_idx on public.scoring_runs(sports_meet_id, run_at desc);

create table public.protest_ground_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  sports_meet_id uuid not null references public.sports_meets(id) on delete restrict,
  code text not null check (code=upper(code) and length(code) between 2 and 30),
  name text not null check (length(trim(name)) between 2 and 120),
  description text check (description is null or length(description)<=1000),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sports_meet_id,code),
  unique(sports_meet_id,name)
);

alter table public.protests
  add column grounds_code text,
  add column ground_category_id uuid references public.protest_ground_categories(id) on delete restrict,
  add column assigned_at timestamptz,
  add column findings text,
  add column prior_result_status text check (prior_result_status is null or prior_result_status in ('approved','final','published')),
  add column filed_at timestamptz not null default now();

create table public.protest_reviewers (
  id uuid primary key default extensions.gen_random_uuid(),
  protest_id uuid not null references public.protests(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unique (protest_id, reviewer_id)
);

create table public.protest_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  protest_id uuid not null references public.protests(id) on delete restrict,
  reference_type text not null check (reference_type in ('document','image','video','witness','other')),
  reference text not null check (length(trim(reference)) between 3 and 1000),
  description text check (description is null or length(description) <= 1000),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null check (length(trim(title)) between 2 and 160),
  body text not null check (length(trim(body)) between 2 and 1000),
  related_table text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

create table public.report_exports (
  id uuid primary key default extensions.gen_random_uuid(),
  report_type text not null check (report_type in ('event_results','house_standings','event_summary','participation_summary','audit_extract')),
  sports_meet_id uuid references public.sports_meets(id) on delete restrict,
  event_id uuid references public.events(id) on delete restrict,
  format text not null check (format in ('csv','print')),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  requested_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.sports_meets
  add column standings_status text not null default 'provisional'
    check (standings_status in ('provisional','confirmed','final')),
  add column standings_status_reason text,
  add column standings_status_changed_by uuid references auth.users(id) on delete restrict,
  add column standings_status_changed_at timestamptz;

create or replace function private.guard_event_schedule_conflict()
returns trigger language plpgsql set search_path = pg_catalog
as $$
declare venue_meet uuid;
begin
  if new.venue_id is null or new.starts_at is null or new.ends_at is null or new.status = 'cancelled' then return new; end if;
  select sports_meet_id into venue_meet from public.venues where id = new.venue_id and is_active;
  if venue_meet is distinct from new.sports_meet_id then raise exception 'venue belongs to another meet or is inactive' using errcode='23514'; end if;
  if exists (
    select 1 from public.events e where e.venue_id = new.venue_id and e.id <> new.id and e.status <> 'cancelled'
      and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')
  ) then raise exception 'venue schedule conflicts with another event' using errcode='23P01'; end if;
  return new;
end;
$$;

create or replace function private.guard_heat_schedule_conflict()
returns trigger language plpgsql set search_path = pg_catalog
as $$
declare event_meet uuid; venue_meet uuid;
begin
  if new.venue_id is null or new.starts_at is null or new.ends_at is null or new.status='cancelled' then return new; end if;
  select sports_meet_id into event_meet from public.events where id=new.event_id;
  select sports_meet_id into venue_meet from public.venues where id=new.venue_id and is_active;
  if venue_meet is distinct from event_meet then raise exception 'heat venue belongs to another meet or is inactive' using errcode='23514'; end if;
  if exists(select 1 from public.event_heats eh where eh.venue_id=new.venue_id and eh.id<>new.id and eh.status<>'cancelled' and tstzrange(eh.starts_at,eh.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'heat or fixture venue schedule conflict' using errcode='23P01'; end if;
  if exists(select 1 from public.events e where e.venue_id=new.venue_id and e.id<>new.event_id and e.status<>'cancelled' and tstzrange(e.starts_at,e.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'heat or fixture conflicts with another event' using errcode='23P01'; end if;
  return new;
end;
$$;

create or replace function private.guard_result_lifecycle()
returns trigger language plpgsql set search_path = pg_catalog
as $$
declare actor uuid := auth.uid(); correction_authorized boolean := coalesce(current_setting('app.result_correction_authorized',true),'') = 'true';
begin
  if tg_op = 'INSERT' then
    if new.status not in ('draft','submitted') then raise exception 'new results must begin as draft or submitted'; end if;
    if actor is not null and new.submitted_by <> actor then raise exception 'submitted_by must be the current user'; end if;
    return new;
  end if;
  if old.status = 'published' and not correction_authorized then raise exception 'published results require an approved correction workflow' using errcode='42501'; end if;
  if old.submitted_by <> new.submitted_by or old.event_id <> new.event_id or old.entry_type <> new.entry_type
     or old.registration_id is distinct from new.registration_id or old.team_entry_id is distinct from new.team_entry_id
  then raise exception 'result identity fields are immutable' using errcode='42501'; end if;
  if not correction_authorized and (
    old.outcome is distinct from new.outcome or old.placement is distinct from new.placement
    or old.time_milliseconds is distinct from new.time_milliseconds
    or old.distance_millimetres is distinct from new.distance_millimetres
    or old.height_millimetres is distinct from new.height_millimetres
    or old.performance_score is distinct from new.performance_score
    or old.tie_group is distinct from new.tie_group or old.result_data is distinct from new.result_data
  ) and not (old.status in ('draft','rejected') and actor = old.submitted_by and private.has_event_role('event_judge',old.event_id))
  then raise exception 'result values require the submitting judge or an approved correction' using errcode='42501'; end if;
  if old.status is distinct from new.status and (old.status,new.status) not in (
    ('draft','submitted'),('rejected','submitted'),('submitted','under_review'),
    ('submitted','verified'),('submitted','rejected'),('under_review','verified'),
    ('under_review','rejected'),('verified','approved'),('verified','rejected'),
    ('approved','final'),('final','published'),('approved','published'),
    ('approved','disputed'),('final','disputed'),('published','disputed'),
    ('disputed','submitted')
  ) and not correction_authorized then raise exception 'invalid result status transition'; end if;
  if new.approved_by = new.submitted_by then raise exception 'a result submitter cannot approve their own result' using errcode='42501'; end if;
  return new;
end;
$$;

create or replace function private.validate_result_tie()
returns trigger language plpgsql set search_path = pg_catalog
as $$
begin
  if new.outcome='ranked' and new.status not in ('rejected','disputed') and exists(
    select 1 from public.results r where r.event_id=new.event_id and r.id<>new.id
      and r.placement=new.placement and r.outcome='ranked' and r.status not in ('rejected','disputed')
      and (new.tie_group is null or r.tie_group is distinct from new.tie_group)
  ) then raise exception 'duplicate placement requires one explicit shared tie group' using errcode='23505'; end if;
  return new;
end;
$$;

create or replace function private.capture_result_revision()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
begin
  insert into public.result_revisions(result_id,revision_number,snapshot,changed_by,change_reason)
  values (new.id,coalesce((select max(revision_number)+1 from public.result_revisions where result_id=new.id),1),to_jsonb(new),auth.uid(),nullif(current_setting('app.result_change_reason',true),''));
  return new;
end;
$$;

create or replace function private.guard_scoring_rule_version()
returns trigger language plpgsql set search_path = pg_catalog
as $$
begin
  if old.status in ('active','retired') and (
    new.sports_meet_id <> old.sports_meet_id or new.name <> old.name or new.version <> old.version
    or new.definition <> old.definition or new.tie_policy <> old.tie_policy or new.created_by <> old.created_by
    or new.status not in ('active','retired')
  ) then raise exception 'approved scoring-rule versions cannot be rewritten' using errcode='42501'; end if;
  return new;
end;
$$;

create or replace function private.validate_point_award()
returns trigger language plpgsql set search_path = pg_catalog
as $$
declare result_meet uuid; rule_meet uuid; result_state text; result_house uuid;
begin
  select e.sports_meet_id,r.status,r.house_id into result_meet,result_state,result_house
  from public.results r join public.events e on e.id=r.event_id where r.id=new.result_id;
  select sports_meet_id into rule_meet from public.scoring_rules where id=new.scoring_rule_id and status in ('active','retired');
  if result_state not in ('approved','final','published') then raise exception 'points require an approved result'; end if;
  if result_house is distinct from new.house_id then raise exception 'point award house must match result house'; end if;
  if result_meet is distinct from rule_meet then raise exception 'scoring rule and result must belong to the same meet'; end if;
  if not exists(select 1 from public.result_revisions rr where rr.id=new.result_revision_id and rr.result_id=new.result_id and rr.snapshot->>'status' in ('approved','final','published')) then raise exception 'point award must reference an approved result revision'; end if;
  return new;
end;
$$;

create or replace function private.guard_point_award_mutation()
returns trigger language plpgsql set search_path = pg_catalog
as $$
begin
  if tg_op='DELETE' then raise exception 'point_awards is append-only' using errcode='42501'; end if;
  if current_setting('app.point_award_void_authorized',true) is distinct from 'true'
    or old.voided_at is not null or new.voided_at is null
    or old.result_id<>new.result_id or old.result_revision_id<>new.result_revision_id
    or old.scoring_rule_id<>new.scoring_rule_id or old.house_id<>new.house_id
    or old.points<>new.points or old.reason<>new.reason or old.awarded_by<>new.awarded_by
    or old.awarded_at<>new.awarded_at
  then raise exception 'point awards may only be voided through a trusted workflow' using errcode='42501'; end if;
  return new;
end;
$$;

create or replace function public.record_event_schedule(p_event_id uuid,p_venue_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); prior public.events%rowtype;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator')) then raise exception 'meet manager role required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,''))) < 5 or p_ends_at <= p_starts_at then raise exception 'valid schedule and reason required' using errcode='22023'; end if;
  select * into prior from public.events where id=p_event_id for update;
  if prior.status in ('completed','cancelled') then raise exception 'completed event schedule is immutable' using errcode='42501'; end if;
  perform set_config('app.event_schedule_authorized','true',true);
  update public.events set venue_id=p_venue_id,starts_at=p_starts_at,ends_at=p_ends_at,scheduled_at=p_starts_at where id=p_event_id;
  insert into public.event_schedule_revisions(event_id,previous_venue_id,new_venue_id,previous_starts_at,new_starts_at,previous_ends_at,new_ends_at,reason,changed_by)
  values(p_event_id,prior.venue_id,p_venue_id,prior.starts_at,p_starts_at,prior.ends_at,p_ends_at,trim(p_reason),actor);
  perform set_config('app.event_schedule_authorized','false',true);
end;
$$;

create or replace function public.save_result(
  p_result_id uuid,p_event_id uuid,p_registration_id uuid,p_team_id uuid,p_outcome text,p_placement integer,
  p_time_milliseconds bigint,p_distance_millimetres integer,p_height_millimetres integer,p_performance_score numeric,
  p_tie_group text,p_anomaly_note text,p_submit boolean
) returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); event_record public.events%rowtype; result_id uuid; entry_kind text; entry_house uuid;
begin
  select * into event_record from public.events where id=p_event_id for update;
  if event_record.status not in ('in_progress','completed') then raise exception 'event is not accepting results' using errcode='55000'; end if;
  if not private.has_event_role('event_judge',p_event_id) then raise exception 'assigned event judge role required' using errcode='42501'; end if;
  if p_outcome not in ('ranked','did_not_start','did_not_finish','disqualified','withdrawn','abandoned') then raise exception 'invalid result outcome' using errcode='22023'; end if;
  if (p_outcome='ranked') <> (p_placement is not null) then raise exception 'ranked outcomes require placement and other outcomes prohibit it' using errcode='22023'; end if;
  if event_record.event_type='individual' then
    select er.entry_type,er.house_id into entry_kind,entry_house from public.event_registrations er
    where er.id=p_registration_id and er.event_id=p_event_id and er.status='checked_in';
    if not found then raise exception 'result requires a checked-in registration' using errcode='23514'; end if;
    p_team_id:=null;
  else
    select 'team',t.house_id into entry_kind,entry_house from public.event_teams t where t.id=p_team_id and t.event_id=p_event_id and t.status='approved';
    if not found then raise exception 'result requires an approved event team' using errcode='23514'; end if;
    p_registration_id:=null;
  end if;
  perform set_config('app.result_change_reason',case when p_result_id is null then 'initial result entry' else 'judge revision before verification' end,true);
  if p_result_id is null or not exists(select 1 from public.results where id=p_result_id) then
    insert into public.results(id,event_id,entry_type,registration_id,team_entry_id,house_id,result_data,placement,status,submitted_by,outcome,time_milliseconds,distance_millimetres,height_millimetres,performance_score,tie_group,is_suspicious,anomaly_note)
    values(coalesce(p_result_id,extensions.gen_random_uuid()),p_event_id,entry_kind,p_registration_id,p_team_id,entry_house,jsonb_strip_nulls(jsonb_build_object('time_milliseconds',p_time_milliseconds,'distance_millimetres',p_distance_millimetres,'height_millimetres',p_height_millimetres,'performance_score',p_performance_score,'outcome',p_outcome)),p_placement,case when p_submit then 'submitted' else 'draft' end,actor,p_outcome,p_time_milliseconds,p_distance_millimetres,p_height_millimetres,p_performance_score,nullif(trim(coalesce(p_tie_group,'')),''),length(trim(coalesce(p_anomaly_note,'')))>0,nullif(trim(coalesce(p_anomaly_note,'')),'')) returning id into result_id;
  else
    update public.results set outcome=p_outcome,placement=p_placement,time_milliseconds=p_time_milliseconds,distance_millimetres=p_distance_millimetres,height_millimetres=p_height_millimetres,performance_score=p_performance_score,tie_group=nullif(trim(coalesce(p_tie_group,'')),''),is_suspicious=length(trim(coalesce(p_anomaly_note,'')))>0,anomaly_note=nullif(trim(coalesce(p_anomaly_note,'')),''),result_data=jsonb_strip_nulls(jsonb_build_object('time_milliseconds',p_time_milliseconds,'distance_millimetres',p_distance_millimetres,'height_millimetres',p_height_millimetres,'performance_score',p_performance_score,'outcome',p_outcome)),status=case when p_submit then 'submitted' else status end
    where id=p_result_id and event_id=p_event_id and submitted_by=actor and status in ('draft','rejected') returning id into result_id;
    if result_id is null then raise exception 'result cannot be revised by this judge' using errcode='42501'; end if;
  end if;
  return result_id;
end;
$$;

create or replace function public.review_result(p_result_id uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target public.results%rowtype;
begin
  if not (private.has_role('results_verifier') or private.has_role('system_administrator')) then raise exception 'results verifier role required' using errcode='42501'; end if;
  if p_decision not in ('verified','rejected') or length(trim(coalesce(p_reason,'')))<5 then raise exception 'valid decision and reason required' using errcode='22023'; end if;
  select * into target from public.results where id=p_result_id for update;
  if target.status not in ('submitted','under_review') then raise exception 'result is not awaiting verification' using errcode='55000'; end if;
  if target.submitted_by=actor then raise exception 'submitting judge cannot verify their own result' using errcode='42501'; end if;
  perform set_config('app.result_change_reason',trim(p_reason),true);
  update public.results set status=p_decision,verified_by=case when p_decision='verified' then actor else null end,verified_at=case when p_decision='verified' then now() else null end,review_reason=trim(p_reason) where id=p_result_id;
end;
$$;

create or replace function public.finalize_result(p_result_id uuid,p_publish boolean,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target public.results%rowtype; next_state text;
begin
  if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'coordinator role required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'finalization reason required' using errcode='22023'; end if;
  select * into target from public.results where id=p_result_id for update;
  if target.status not in ('verified','approved','final') then raise exception 'result is not ready to finalize or publish' using errcode='55000'; end if;
  if p_publish and target.status='verified' then raise exception 'result must be approved before publication' using errcode='55000'; end if;
  if actor in (target.submitted_by,target.verified_by) then raise exception 'final approval requires an independent actor' using errcode='42501'; end if;
  next_state:=case when p_publish then 'published' else case when target.status='verified' then 'approved' else 'final' end end;
  perform set_config('app.result_change_reason',trim(p_reason),true);
  update public.results set status=next_state,approved_by=coalesce(approved_by,actor),approved_at=coalesce(approved_at,now()),published_by=case when next_state='published' then actor else published_by end,published_at=case when next_state='published' then now() else published_at end where id=p_result_id;
end;
$$;

create or replace function public.request_result_correction(p_result_id uuid,p_outcome text,p_placement integer,p_time bigint,p_distance integer,p_height integer,p_score numeric,p_tie_group text,p_reason text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target_event uuid; request_id uuid;
begin
  select event_id into target_event from public.results where id=p_result_id and status in ('approved','final','published','disputed');
  if not found then raise exception 'only approved or published results use the correction workflow' using errcode='55000'; end if;
  if not (private.has_event_role('event_judge',target_event) or private.has_role('results_verifier') or private.has_role('sports_coordinator') or private.has_role('system_administrator') or private.has_role('protest_committee')) then raise exception 'result correction role required' using errcode='42501'; end if;
  insert into public.result_correction_requests(result_id,proposed_outcome,proposed_placement,proposed_time_milliseconds,proposed_distance_millimetres,proposed_height_millimetres,proposed_performance_score,proposed_tie_group,reason,requested_by)
  values(p_result_id,p_outcome,p_placement,p_time,p_distance,p_height,p_score,nullif(trim(coalesce(p_tie_group,'')),''),trim(p_reason),actor) returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.decide_result_correction(p_request_id uuid,p_approve boolean,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); request_record public.result_correction_requests%rowtype;
begin
  if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'correction approver role required' using errcode='42501'; end if;
  select * into request_record from public.result_correction_requests where id=p_request_id for update;
  if request_record.status <> 'pending' or request_record.requested_by=actor then raise exception 'independent pending correction required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'decision reason required' using errcode='22023'; end if;
  if p_approve then
    perform set_config('app.result_correction_authorized','true',true);
    perform set_config('app.result_change_reason',trim(p_reason),true);
    update public.results set outcome=request_record.proposed_outcome,placement=request_record.proposed_placement,time_milliseconds=request_record.proposed_time_milliseconds,distance_millimetres=request_record.proposed_distance_millimetres,height_millimetres=request_record.proposed_height_millimetres,performance_score=request_record.proposed_performance_score,tie_group=request_record.proposed_tie_group,result_data=jsonb_strip_nulls(jsonb_build_object('time_milliseconds',request_record.proposed_time_milliseconds,'distance_millimetres',request_record.proposed_distance_millimetres,'height_millimetres',request_record.proposed_height_millimetres,'performance_score',request_record.proposed_performance_score,'outcome',request_record.proposed_outcome)),status='submitted',verified_by=null,verified_at=null,approved_by=null,approved_at=null,published_by=null,published_at=null where id=request_record.result_id;
    perform set_config('app.point_award_void_authorized','true',true);
    update public.point_awards set voided_by=actor,voided_at=now(),void_reason='Result correction approved: '||trim(p_reason) where result_id=request_record.result_id and voided_at is null;
    perform set_config('app.point_award_void_authorized','false',true);
    update public.sports_meets set standings_status='provisional',
      standings_status_reason='Result correction approved: '||trim(p_reason),standings_status_changed_by=actor,
      standings_status_changed_at=now() where id=(select e.sports_meet_id from public.results r join public.events e on e.id=r.event_id where r.id=request_record.result_id)
      and standings_status<>'provisional';
    perform set_config('app.result_correction_authorized','false',true);
  end if;
  update public.result_correction_requests set status=case when p_approve then 'approved' else 'rejected' end,decided_by=actor,decided_at=now(),decision_reason=trim(p_reason) where id=p_request_id;
end;
$$;

create or replace function public.activate_scoring_rule(p_rule_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target public.scoring_rules%rowtype;
begin
  if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'scoring approver role required' using errcode='42501'; end if;
  select * into target from public.scoring_rules where id=p_rule_id for update;
  if target.status not in ('draft','pending_approval') or target.created_by=actor then raise exception 'independent draft scoring version required' using errcode='42501'; end if;
  if not exists(select 1 from public.scoring_rule_positions where scoring_rule_id=p_rule_id) then raise exception 'scoring positions are required' using errcode='23514'; end if;
  update public.scoring_rules set status='retired' where sports_meet_id=target.sports_meet_id and name=target.name and status='active';
  update public.scoring_rules set status='active',approved_by=actor,approved_at=now(),activated_at=now() where id=p_rule_id;
end;
$$;

create or replace function public.assign_event_scoring_rule(p_event_id uuid,p_rule_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); event_meet uuid; rule_meet uuid;
begin
  if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'scoring manager role required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'assignment reason required' using errcode='22023'; end if;
  select sports_meet_id into event_meet from public.events where id=p_event_id for update;
  select sports_meet_id into rule_meet from public.scoring_rules where id=p_rule_id and status='active';
  if event_meet is distinct from rule_meet then raise exception 'event and active scoring rule must belong to the same meet' using errcode='23514'; end if;
  if exists(select 1 from public.point_awards pa join public.results r on r.id=pa.result_id where r.event_id=p_event_id and pa.voided_at is null) then raise exception 'scoring assignment cannot change while active awards exist' using errcode='55000'; end if;
  perform set_config('app.scoring_assignment_authorized','true',true);
  perform set_config('app.result_change_reason','Scoring assignment: '||trim(p_reason),true);
  update public.events set scoring_rule_id=p_rule_id where id=p_event_id;
  perform set_config('app.scoring_assignment_authorized','false',true);
end;
$$;

create or replace function public.score_result(p_result_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target public.results%rowtype; rule public.scoring_rules%rowtype; revision_id uuid; award_points numeric(10,2); award_id uuid; tie_count integer;
begin
  if not (private.has_role('sports_coordinator') or private.has_role('system_administrator')) then raise exception 'scoring role required' using errcode='42501'; end if;
  select * into target from public.results where id=p_result_id and status in ('approved','final','published') for update;
  if not found then raise exception 'only approved results may be scored' using errcode='55000'; end if;
  select sr.* into rule from public.events e join public.scoring_rules sr on sr.id=e.scoring_rule_id and sr.status='active' where e.id=target.event_id;
  if not found then raise exception 'event has no approved active scoring rule' using errcode='55000'; end if;
  if target.outcome <> 'ranked' then
    insert into public.scoring_runs(sports_meet_id,scoring_rule_id,result_id,status,detail,run_by) values(rule.sports_meet_id,rule.id,target.id,'skipped','Non-ranked outcome receives no automated award',actor);
    return null;
  end if;
  select id into revision_id from public.result_revisions where result_id=target.id and snapshot->>'status' in ('approved','final','published') order by revision_number desc limit 1;
  if target.tie_group is not null and rule.tie_policy='manual' then raise exception 'tie requires an authorized manual scoring decision' using errcode='55000'; end if;
  if target.tie_group is not null and rule.tie_policy='shared_average' then
    select count(*) into tie_count from public.results where event_id=target.event_id and tie_group=target.tie_group and placement=target.placement and status in ('approved','final','published');
    select avg(srp.points) into award_points from public.scoring_rule_positions srp where srp.scoring_rule_id=rule.id and srp.placement between target.placement and target.placement+tie_count-1;
  else
    select points into award_points from public.scoring_rule_positions where scoring_rule_id=rule.id and placement=target.placement;
  end if;
  if award_points is null then raise exception 'scoring rule has no value for this placement' using errcode='23514'; end if;
  perform set_config('app.point_award_void_authorized','true',true);
  update public.point_awards set voided_by=actor,voided_at=now(),void_reason='Recalculation: '||trim(p_reason) where result_id=target.id and voided_at is null;
  perform set_config('app.point_award_void_authorized','false',true);
  insert into public.point_awards(result_id,result_revision_id,scoring_rule_id,house_id,points,reason,awarded_by)
  values(target.id,revision_id,rule.id,target.house_id,award_points,trim(p_reason),actor) returning id into award_id;
  insert into public.scoring_runs(sports_meet_id,scoring_rule_id,result_id,status,detail,run_by) values(rule.sports_meet_id,rule.id,target.id,'completed','Point award generated from approved result revision',actor);
  return award_id;
end;
$$;

create or replace function public.set_standings_status(p_meet_id uuid,p_status text,p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); current_status text; meet_status text; meet_published_at timestamptz;
begin
  if not (private.has_role('system_administrator') or private.has_role('sports_coordinator')) then
    raise exception 'standings declaration role required' using errcode='42501';
  end if;
  if p_status not in ('confirmed','final') or length(trim(coalesce(p_reason,'')))<5 then
    raise exception 'valid declaration status and reason required' using errcode='22023';
  end if;
  select standings_status,status,published_at into current_status,meet_status,meet_published_at from public.sports_meets where id=p_meet_id for update;
  if not found then raise exception 'sports meet not found' using errcode='P0002'; end if;
  if meet_published_at is null then raise exception 'sports meet must be published before standings declaration' using errcode='55000'; end if;
  if not ((current_status='provisional' and p_status='confirmed') or (current_status='confirmed' and p_status='final')) then
    raise exception 'invalid standings declaration transition' using errcode='55000';
  end if;
  if p_status='final' and meet_status<>'completed' then
    raise exception 'the meet must be completed before final standings declaration' using errcode='55000';
  end if;
  if p_status='final' and exists(
    select 1 from public.results r join public.events e on e.id=r.event_id
    where e.sports_meet_id=p_meet_id and r.status='disputed'
  ) then raise exception 'disputed results prevent final standings declaration' using errcode='55000'; end if;
  if p_status='final' and exists(
    select 1 from public.events e where e.sports_meet_id=p_meet_id and e.status not in ('completed','cancelled')
  ) then raise exception 'all events must be completed or cancelled before final standings declaration' using errcode='55000'; end if;
  if p_status='final' and exists(
    select 1 from public.results r join public.events e on e.id=r.event_id
    where e.sports_meet_id=p_meet_id and r.status not in ('published','rejected')
  ) then raise exception 'all result submissions must be resolved before final standings declaration' using errcode='55000'; end if;
  update public.sports_meets set standings_status=p_status,standings_status_reason=trim(p_reason),
    standings_status_changed_by=actor,standings_status_changed_at=now() where id=p_meet_id;
end;
$$;

create or replace function public.file_protest(p_result_id uuid,p_grounds_code text,p_grounds text)
returns uuid language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); actor_house uuid; deadline timestamptz; protest_id uuid; prior_status text; meet_id uuid; ground_id uuid;
begin
  select e.protest_deadline_at,r.status,e.sports_meet_id into deadline,prior_status,meet_id from public.results r join public.events e on e.id=r.event_id where r.id=p_result_id and r.status in ('approved','final','published');
  select house_id into actor_house from public.user_roles where user_id=actor and role='house_representative' and (expires_at is null or expires_at>now()) limit 1;
  if actor_house is null then raise exception 'house representative role required' using errcode='42501'; end if;
  if deadline is null or now()>deadline then raise exception 'protest submission window is closed or not configured' using errcode='55000'; end if;
  select id into ground_id from public.protest_ground_categories where sports_meet_id=meet_id and code=upper(trim(p_grounds_code)) and is_active;
  if ground_id is null then raise exception 'an active approved protest ground is required' using errcode='23514'; end if;
  insert into public.protests(result_id,filed_by,house_id,grounds,grounds_code,ground_category_id,status,filed_at,prior_result_status) values(p_result_id,actor,actor_house,trim(p_grounds),upper(trim(p_grounds_code)),ground_id,'filed',now(),prior_status) returning id into protest_id;
  update public.results set status='disputed' where id=p_result_id and status in ('approved','final','published');
  update public.sports_meets set standings_status='provisional',standings_status_reason='A result protest was filed',
    standings_status_changed_by=actor,standings_status_changed_at=now()
    where id=(select e.sports_meet_id from public.results r join public.events e on e.id=r.event_id where r.id=p_result_id)
      and standings_status<>'provisional';
  return protest_id;
end;
$$;

create or replace function public.assign_protest_reviewer(p_protest_id uuid,p_reviewer_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); protest_house uuid; protest_filer uuid;
begin
  if not (private.has_role('system_administrator') or private.has_role('protest_committee')) then raise exception 'protest assignment role required' using errcode='42501'; end if;
  select house_id,filed_by into protest_house,protest_filer from public.protests where id=p_protest_id for update;
  if p_reviewer_id=protest_filer or exists(select 1 from public.user_roles where user_id=p_reviewer_id and role='house_representative' and house_id=protest_house and (expires_at is null or expires_at>now())) then raise exception 'reviewer conflict of interest' using errcode='42501'; end if;
  if not exists(select 1 from public.user_roles where user_id=p_reviewer_id and role='protest_committee' and (expires_at is null or expires_at>now())) then raise exception 'reviewer lacks protest committee role' using errcode='42501'; end if;
  insert into public.protest_reviewers(protest_id,reviewer_id,assigned_by) values(p_protest_id,p_reviewer_id,actor) on conflict do nothing;
  update public.protests set status='under_review',assigned_at=coalesce(assigned_at,now()) where id=p_protest_id and status='filed';
  insert into public.notifications(recipient_id,notification_type,title,body,related_table,related_id)
  values(p_reviewer_id,'protest_assignment','Protest review assigned','A protest case requires independent review.','protests',p_protest_id);
end;
$$;

create or replace function public.decide_protest(p_protest_id uuid,p_uphold boolean,p_findings text,p_decision text)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid:=auth.uid(); target public.protests%rowtype;
begin
  select * into target from public.protests where id=p_protest_id for update;
  if target.status <> 'under_review' or not exists(select 1 from public.protest_reviewers where protest_id=p_protest_id and reviewer_id=actor) then raise exception 'assigned protest reviewer required' using errcode='42501'; end if;
  if actor=target.filed_by or private.has_house_role('house_representative',target.house_id) then raise exception 'reviewer conflict of interest' using errcode='42501'; end if;
  if length(trim(coalesce(p_findings,'')))<5 or length(trim(coalesce(p_decision,'')))<5 then raise exception 'findings and decision are required' using errcode='22023'; end if;
  update public.protests set status=case when p_uphold then 'upheld' else 'dismissed' end,findings=trim(p_findings),decision=trim(p_decision),decided_by=actor,decided_at=now() where id=p_protest_id;
  if not p_uphold then
    perform set_config('app.result_correction_authorized','true',true);
    update public.results set status=coalesce(target.prior_result_status,'approved') where id=target.result_id and status='disputed';
    perform set_config('app.result_correction_authorized','false',true);
  end if;
  insert into public.notifications(recipient_id,notification_type,title,body,related_table,related_id)
  values(target.filed_by,'protest_decision','Protest decision recorded',case when p_uphold then 'The protest was upheld.' else 'The protest was dismissed.' end,'protests',p_protest_id);
end;
$$;

create trigger venue_updated_at before update on public.venues for each row execute function private.set_updated_at();
create trigger protest_ground_categories_updated_at before update on public.protest_ground_categories for each row execute function private.set_updated_at();
create trigger result_tie_validation before insert or update of outcome,placement,tie_group,status on public.results for each row execute function private.validate_result_tie();
create trigger event_schedule_conflict before insert or update of venue_id,starts_at,ends_at,status on public.events for each row execute function private.guard_event_schedule_conflict();
create trigger heat_schedule_conflict before insert or update of venue_id,starts_at,ends_at,status on public.event_heats for each row execute function private.guard_heat_schedule_conflict();
create trigger schedule_revisions_append_only before update or delete on public.event_schedule_revisions for each row execute function private.prevent_ledger_mutation();
create trigger correction_requests_append_only before delete on public.result_correction_requests for each row execute function private.prevent_ledger_mutation();
create trigger scoring_runs_append_only before update or delete on public.scoring_runs for each row execute function private.prevent_ledger_mutation();
create trigger protest_reviewers_append_only before update or delete on public.protest_reviewers for each row execute function private.prevent_ledger_mutation();
create trigger report_exports_append_only before update or delete on public.report_exports for each row execute function private.prevent_ledger_mutation();
create trigger audit_venues after insert or update or delete on public.venues for each row execute function private.write_audit_log();
create trigger audit_result_corrections after insert or update on public.result_correction_requests for each row execute function private.write_audit_log();
create trigger audit_scoring_positions after insert or update or delete on public.scoring_rule_positions for each row execute function private.write_audit_log();
create trigger audit_protest_reviewers after insert on public.protest_reviewers for each row execute function private.write_audit_log();
create trigger audit_protest_evidence after insert on public.protest_evidence for each row execute function private.write_audit_log();
create trigger audit_protest_ground_categories after insert or update or delete on public.protest_ground_categories for each row execute function private.write_audit_log();

drop trigger if exists point_awards_append_only on public.point_awards;
create trigger point_awards_controlled_void before update or delete on public.point_awards for each row execute function private.guard_point_award_mutation();

alter table public.venues enable row level security;
alter table public.event_schedule_revisions enable row level security;
alter table public.result_correction_requests enable row level security;
alter table public.scoring_rule_positions enable row level security;
alter table public.scoring_runs enable row level security;
alter table public.protest_reviewers enable row level security;
alter table public.protest_evidence enable row level security;
alter table public.notifications enable row level security;
alter table public.report_exports enable row level security;
alter table public.protest_ground_categories enable row level security;

revoke all on public.venues,public.event_schedule_revisions,public.result_correction_requests,public.scoring_rule_positions,public.scoring_runs,public.protest_reviewers,public.protest_evidence,public.notifications,public.report_exports from anon,authenticated;
revoke all on public.protest_ground_categories from anon,authenticated;
grant select on public.venues,public.event_schedule_revisions,public.result_correction_requests,public.scoring_rule_positions,public.scoring_runs,public.protest_reviewers,public.protest_evidence,public.notifications,public.report_exports to authenticated;
grant select,insert,update on public.protest_ground_categories to authenticated;
grant select on public.venues,public.scoring_rule_positions to anon;
grant insert,update on public.venues,public.scoring_rules,public.scoring_rule_positions to authenticated;
grant insert on public.protest_evidence,public.report_exports to authenticated;
revoke insert,update on public.results,public.point_awards,public.protests from authenticated;

create policy venues_public_read on public.venues for select to anon using(is_active and exists(select 1 from public.sports_meets sm where sm.id=sports_meet_id and sm.published_at is not null));
create policy venues_staff_read on public.venues for select to authenticated using(is_active or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy venues_manager_write on public.venues for all to authenticated using(private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check((private.has_role('system_administrator') or private.has_role('sports_coordinator')) and created_by=auth.uid());
create policy schedule_revisions_staff_read on public.event_schedule_revisions for select to authenticated using(private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_event_role('event_judge',event_id) or private.is_event_official('check_in_officer',event_id));
create policy correction_requests_staff_read on public.result_correction_requests for select to authenticated using(requested_by=auth.uid() or private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier') or private.has_role('protest_committee'));
create policy scoring_positions_public_read on public.scoring_rule_positions for select to anon using(exists(select 1 from public.scoring_rules sr where sr.id=scoring_rule_id and sr.status in ('active','retired')));
create policy scoring_positions_staff_read on public.scoring_rule_positions for select to authenticated using(exists(select 1 from public.scoring_rules sr where sr.id=scoring_rule_id and (sr.status in ('active','retired') or private.has_role('system_administrator') or private.has_role('sports_coordinator'))));
create policy scoring_positions_manager_write on public.scoring_rule_positions for all to authenticated using(exists(select 1 from public.scoring_rules sr where sr.id=scoring_rule_id and sr.status='draft' and sr.created_by=auth.uid()) and (private.has_role('system_administrator') or private.has_role('sports_coordinator'))) with check(exists(select 1 from public.scoring_rules sr where sr.id=scoring_rule_id and sr.status='draft' and sr.created_by=auth.uid()) and (private.has_role('system_administrator') or private.has_role('sports_coordinator')));
create policy scoring_runs_manager_read on public.scoring_runs for select to authenticated using(private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('results_verifier'));
create policy protest_reviewers_relevant_read on public.protest_reviewers for select to authenticated using(reviewer_id=auth.uid() or private.has_role('system_administrator') or private.has_role('protest_committee'));
create policy protest_evidence_relevant_read on public.protest_evidence for select to authenticated using(exists(select 1 from public.protests p where p.id=protest_id and (p.filed_by=auth.uid() or private.has_role('system_administrator') or private.has_role('protest_committee') or private.has_house_role('house_representative',p.house_id))));
create policy protest_evidence_submit on public.protest_evidence for insert to authenticated with check(submitted_by=auth.uid() and exists(select 1 from public.protests p where p.id=protest_id and p.status in ('filed','under_review') and (p.filed_by=auth.uid() or private.has_role('protest_committee'))));
create policy notifications_own_read on public.notifications for select to authenticated using(recipient_id=auth.uid());
create policy report_exports_own_read on public.report_exports for select to authenticated using(requested_by=auth.uid() or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy report_exports_create on public.report_exports for insert to authenticated with check(requested_by=auth.uid() and (private.has_role('system_administrator') or private.has_role('sports_coordinator') or private.has_role('registration_officer') or private.has_role('results_verifier')));
create policy protest_ground_categories_read on public.protest_ground_categories for select to authenticated using(is_active or private.has_role('system_administrator') or private.has_role('sports_coordinator'));
create policy protest_ground_categories_insert on public.protest_ground_categories for insert to authenticated with check((private.has_role('system_administrator') or private.has_role('sports_coordinator')) and created_by=auth.uid());
create policy protest_ground_categories_update on public.protest_ground_categories for update to authenticated using(private.has_role('system_administrator') or private.has_role('sports_coordinator')) with check(private.has_role('system_administrator') or private.has_role('sports_coordinator'));

drop policy if exists results_judge_insert on public.results;
drop policy if exists results_controlled_update on public.results;
drop policy if exists scoring_rules_coordinator_write on public.scoring_rules;
create policy scoring_rules_manager_insert on public.scoring_rules for insert to authenticated with check(created_by=auth.uid() and status='draft' and (private.has_role('system_administrator') or private.has_role('sports_coordinator')));
create policy scoring_rules_manager_update on public.scoring_rules for update to authenticated using(created_by=auth.uid() and status='draft' and (private.has_role('system_administrator') or private.has_role('sports_coordinator'))) with check(created_by=auth.uid() and status in ('draft','pending_approval') and (private.has_role('system_administrator') or private.has_role('sports_coordinator')));

drop policy if exists point_awards_public_read on public.point_awards;
create policy point_awards_public_read on public.point_awards for select to anon,authenticated using(voided_at is null and exists(select 1 from public.results r where r.id=result_id and r.status='published'));
drop policy if exists point_awards_coordinator_insert on public.point_awards;

drop policy if exists protests_house_insert on public.protests;
drop policy if exists protests_committee_update on public.protests;

create or replace view public.public_house_standings with (security_invoker=true) as
select sm.id as sports_meet_id,sm.standings_status,h.id as house_id,h.code as house_code,h.name as house_name,
  coalesce(sum(pa.points),0)::numeric(12,2) as total_points,count(pa.id)::bigint as award_count,max(pa.awarded_at) as last_updated_at
from public.sports_meets sm join public.meet_houses mh on mh.sports_meet_id=sm.id and mh.is_active
join public.houses h on h.id=mh.house_id
left join public.results r on exists(select 1 from public.events e where e.id=r.event_id and e.sports_meet_id=sm.id) and r.house_id=h.id and r.status='published'
left join public.point_awards pa on pa.result_id=r.id and pa.house_id=h.id and pa.voided_at is null
where sm.published_at is not null group by sm.id,sm.standings_status,h.id,h.code,h.name;
grant select on public.public_house_standings to anon,authenticated;

revoke all on function private.guard_event_schedule_conflict() from public,anon,authenticated;
revoke all on function private.guard_heat_schedule_conflict() from public,anon,authenticated;
revoke all on function private.validate_result_tie() from public,anon,authenticated;
revoke all on function private.guard_point_award_mutation() from public,anon,authenticated;
revoke all on function public.record_event_schedule(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
revoke all on function public.save_result(uuid,uuid,uuid,uuid,text,integer,bigint,integer,integer,numeric,text,text,boolean) from public,anon;
revoke all on function public.review_result(uuid,text,text) from public,anon;
revoke all on function public.finalize_result(uuid,boolean,text) from public,anon;
revoke all on function public.request_result_correction(uuid,text,integer,bigint,integer,integer,numeric,text,text) from public,anon;
revoke all on function public.decide_result_correction(uuid,boolean,text) from public,anon;
revoke all on function public.activate_scoring_rule(uuid) from public,anon;
revoke all on function public.assign_event_scoring_rule(uuid,uuid,text) from public,anon;
revoke all on function public.score_result(uuid,text) from public,anon;
revoke all on function public.set_standings_status(uuid,text,text) from public,anon;
revoke all on function public.file_protest(uuid,text,text) from public,anon;
revoke all on function public.assign_protest_reviewer(uuid,uuid) from public,anon;
revoke all on function public.decide_protest(uuid,boolean,text,text) from public,anon;
grant execute on function public.record_event_schedule(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.save_result(uuid,uuid,uuid,uuid,text,integer,bigint,integer,integer,numeric,text,text,boolean) to authenticated;
grant execute on function public.review_result(uuid,text,text) to authenticated;
grant execute on function public.finalize_result(uuid,boolean,text) to authenticated;
grant execute on function public.request_result_correction(uuid,text,integer,bigint,integer,integer,numeric,text,text) to authenticated;
grant execute on function public.decide_result_correction(uuid,boolean,text) to authenticated;
grant execute on function public.activate_scoring_rule(uuid) to authenticated;
grant execute on function public.assign_event_scoring_rule(uuid,uuid,text) to authenticated;
grant execute on function public.score_result(uuid,text) to authenticated;
grant execute on function public.set_standings_status(uuid,text,text) to authenticated;
grant execute on function public.file_protest(uuid,text,text) to authenticated;
grant execute on function public.assign_protest_reviewer(uuid,uuid) to authenticated;
grant execute on function public.decide_protest(uuid,boolean,text,text) to authenticated;
