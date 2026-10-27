begin;

create extension if not exists pgtap with schema extensions;
select plan(28);

-- Transactional fixtures only. No production participant data is seeded.
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000021000', 'm3-admin@test.invalid'),
  ('00000000-0000-4000-8000-000000022000', 'm3-coordinator@test.invalid'),
  ('00000000-0000-4000-8000-000000023000', 'm3-registration@test.invalid'),
  ('00000000-0000-4000-8000-000000024000', 'm3-house-a@test.invalid'),
  ('00000000-0000-4000-8000-000000025000', 'm3-house-b@test.invalid'),
  ('00000000-0000-4000-8000-000000026000', 'm3-check-in@test.invalid'),
  ('00000000-0000-4000-8000-000000027000', 'm3-viewer@test.invalid');

insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000021000', 'M3 administrator'),
  ('00000000-0000-4000-8000-000000022000', 'M3 coordinator'),
  ('00000000-0000-4000-8000-000000023000', 'M3 registration officer'),
  ('00000000-0000-4000-8000-000000024000', 'M3 house A representative'),
  ('00000000-0000-4000-8000-000000025000', 'M3 house B representative'),
  ('00000000-0000-4000-8000-000000026000', 'M3 check-in officer'),
  ('00000000-0000-4000-8000-000000027000', 'M3 public viewer');

insert into public.houses (id, code, name) values
  ('12000000-0000-4000-8000-000000000001', 'M3A', 'Milestone Three House A'),
  ('12000000-0000-4000-8000-000000000002', 'M3B', 'Milestone Three House B');

insert into public.sports_meets (
  id, name, year, starts_on, ends_on, status,
  registration_opens_at, registration_closes_at
) values (
  '22000000-0000-4000-8000-000000000001',
  'Milestone Three Transactional Meet',
  extract(year from current_date + interval '14 days')::integer,
  current_date + 14, current_date + 16, 'draft',
  now() - interval '1 day', now() + interval '7 days'
);

insert into public.user_roles (user_id, role, house_id, granted_by) values
  ('00000000-0000-4000-8000-000000021000', 'system_administrator', null, '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000022000', 'sports_coordinator', null, '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000023000', 'registration_officer', null, '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000024000', 'house_representative', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000025000', 'house_representative', '12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000026000', 'check_in_officer', null, '00000000-0000-4000-8000-000000021000'),
  ('00000000-0000-4000-8000-000000027000', 'public_viewer', null, '00000000-0000-4000-8000-000000021000');

insert into public.students (
  id, student_number, house_id, legal_first_name, legal_last_name,
  enrollment_status, eligibility_status, eligibility_verified_by, eligibility_verified_at
) values
  ('42000000-0000-4000-8000-000000000001', 'M3-A-001', '12000000-0000-4000-8000-000000000001', 'Eligible', 'Athlete', 'enrolled', 'eligible', '00000000-0000-4000-8000-000000023000', now()),
  ('42000000-0000-4000-8000-000000000002', 'M3-A-002', '12000000-0000-4000-8000-000000000001', 'Reserve', 'Athlete', 'enrolled', 'eligible', '00000000-0000-4000-8000-000000023000', now()),
  ('42000000-0000-4000-8000-000000000003', 'M3-A-003', '12000000-0000-4000-8000-000000000001', 'Ineligible', 'Athlete', 'enrolled', 'ineligible', '00000000-0000-4000-8000-000000023000', now()),
  ('42000000-0000-4000-8000-000000000004', 'M3-B-001', '12000000-0000-4000-8000-000000000002', 'Other', 'House', 'enrolled', 'eligible', '00000000-0000-4000-8000-000000023000', now());

insert into public.meet_houses (sports_meet_id, house_id, added_by) values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000021000'),
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000021000');

insert into public.sport_categories (id, sports_meet_id, code, name, created_by) values (
  '32000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  'TRACK', 'Track', '00000000-0000-4000-8000-000000021000'
);

insert into public.events (
  id, sports_meet_id, sport_category_id, code, name, event_type,
  format_code, maximum_participants_per_house, registration_status,
  starts_at, ends_at
) values (
  '33000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001',
  'M3-100', 'M3 100 metres', 'individual', 'race', 1, 'closed',
  (current_date + 14) + time '10:00', (current_date + 14) + time '11:00'
);

insert into public.event_officials (event_id, user_id, official_role, assigned_by) values (
  '33000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000026000',
  'check_in_officer', '00000000-0000-4000-8000-000000021000'
);

update public.sports_meets set status = 'registration_open'
where id = '22000000-0000-4000-8000-000000000001';
update public.events set registration_status = 'open'
where id = '33000000-0000-4000-8000-000000000001';

set local role anon;
select results_eq(
  $$select count(*) from public.sports_meets where id = '22000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'an unpublished meet is not visible anonymously'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000027000', true);
select throws_ok(
  $$insert into public.sports_meets(name, year, starts_on, ends_on) values ('Unauthorized meet', 2026, '2026-11-01', '2026-11-02')$$,
  'a public viewer cannot create a meet'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000025000', true);
select throws_ok(
  $$select public.register_event_participant('33000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', null, false)$$,
  'a house representative cannot register another house student'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000024000', true);
select throws_ok(
  $$select public.register_event_participant('33000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000003', null, false)$$,
  'an ineligible student cannot be registered'
);
select lives_ok(
  $$select public.register_event_participant('33000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', null, false)$$,
  'an eligible own-house student can be added to a draft roster'
);
select throws_ok(
  $$select public.register_event_participant('33000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', null, false)$$,
  'the same student cannot be registered twice for one event'
);
select throws_ok(
  $$select public.register_event_participant('33000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000002', null, false)$$,
  'the per-house participant limit is enforced'
);
select throws_ok(
  $$insert into public.event_registrations(event_id,student_id,house_id,entry_type,status,registered_by) values ('33000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002','12000000-0000-4000-8000-000000000001','individual','draft','00000000-0000-4000-8000-000000024000')$$,
  'direct registration writes are denied in favor of the trusted workflow'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000022000', true);
select lives_ok(
  $$select public.submit_event_roster('33000000-0000-4000-8000-000000000001','12000000-0000-4000-8000-000000000001')$$,
  'an authorized official can submit a house roster for independent review'
);
select throws_ok(
  $$select public.review_event_roster((select id from public.event_roster_submissions where event_id='33000000-0000-4000-8000-000000000001' and house_id='12000000-0000-4000-8000-000000000001'),'approved',null)$$,
  'the roster submitter cannot approve the same roster'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000023000', true);
select lives_ok(
  $$select public.review_event_roster((select id from public.event_roster_submissions where event_id='33000000-0000-4000-8000-000000000001' and house_id='12000000-0000-4000-8000-000000000001'),'approved',null)$$,
  'a different registration officer can approve the roster'
);
select results_eq(
  $$select string_agg(new_status, ',' order by changed_at) from public.registration_history where registration_id=(select id from public.event_registrations where event_id='33000000-0000-4000-8000-000000000001' and student_id='42000000-0000-4000-8000-000000000001')$$,
  array['draft,submitted,approved'],
  'registration state changes retain append-only history'
);
select throws_ok(
  $$select public.lock_event_roster('33000000-0000-4000-8000-000000000001')$$,
  'a roster cannot be locked before the registration deadline while registration remains open'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000022000', true);
select lives_ok(
  $$update public.sports_meets set status='registration_closed' where id='22000000-0000-4000-8000-000000000001'$$,
  'a coordinator can close meet registration through a valid transition'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000023000', true);
select lives_ok(
  $$select public.lock_event_roster('33000000-0000-4000-8000-000000000001')$$,
  'a registration officer can irreversibly lock a reviewed roster after registration closes'
);
select throws_ok(
  $$select public.withdraw_event_registration((select id from public.event_registrations where student_id='42000000-0000-4000-8000-000000000001'),'late withdrawal')$$,
  'ordinary withdrawal cannot rewrite a locked roster'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000024000', true);
select lives_ok(
  $$select public.request_late_roster_addition('33000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000002',null,'Documented medical replacement')$$,
  'a house representative can request a documented late addition'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000023000', true);
select throws_ok(
  $$select public.decide_late_roster_addition((select id from public.roster_change_requests where student_id='42000000-0000-4000-8000-000000000002'),true,'Approved after review')$$,
  'a registration officer cannot approve a late roster exception'
);
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000022000', true);
select lives_ok(
  $$select public.decide_late_roster_addition((select id from public.roster_change_requests where student_id='42000000-0000-4000-8000-000000000002'),true,'Approved by meet coordinator')$$,
  'an independent coordinator can approve the recorded exception'
);

create temporary table m3_token_store(token text);
select lives_ok(
  $$insert into m3_token_store select public.issue_registration_token((select id from public.event_registrations where student_id='42000000-0000-4000-8000-000000000001'))$$,
  'an opaque single-use check-in token can be issued after roster lock'
);
select lives_ok(
  $$update public.events set status='check_in_open' where id='33000000-0000-4000-8000-000000000001'$$,
  'check-in can open only after the roster is locked'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000026000', true);
select throws_ok(
  $$select * from public.check_in_with_token('33000000-0000-4000-8000-000000000001',(select token from m3_token_store),false)$$,
  'token possession never replaces physical identity confirmation'
);
select lives_ok(
  $$select * from public.check_in_with_token('33000000-0000-4000-8000-000000000001',(select token from m3_token_store),true)$$,
  'an assigned check-in officer can record confirmed attendance'
);
select throws_ok(
  $$select * from public.check_in_with_token('33000000-0000-4000-8000-000000000001',(select token from m3_token_store),true)$$,
  'a token cannot create duplicate active attendance'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000025000', true);
select results_eq(
  $$select count(*) from public.event_registrations where event_id='33000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'another house representative cannot read house A registrations'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000022000', true);
select lives_ok(
  $$select public.void_attendance((select id from public.attendance where event_id='33000000-0000-4000-8000-000000000001' and voided_at is null),'Scanner record corrected after review')$$,
  'an independent coordinator can void attendance with a reason'
);
select results_eq(
  $$select count(*) from public.attendance_corrections where attendance_id in (select id from public.attendance where event_id='33000000-0000-4000-8000-000000000001')$$,
  array[1::bigint],
  'attendance correction history is retained'
);
select results_eq(
  $$select count(*) > 0 from public.audit_logs where table_name in ('events','event_registrations')$$,
  array[true],
  'event and roster changes produce audit records'
);

select * from finish();
rollback;
