begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

-- Transactional fixtures only; these are never production seed data.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001000', 'admin@test.invalid'),
  ('00000000-0000-0000-0000-000000002000', 'registration@test.invalid'),
  ('00000000-0000-0000-0000-000000003000', 'judge@test.invalid'),
  ('00000000-0000-0000-0000-000000004000', 'verifier@test.invalid'),
  ('00000000-0000-0000-0000-000000005000', 'coordinator@test.invalid'),
  ('00000000-0000-0000-0000-000000006000', 'viewer@test.invalid');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000001000', 'Test administrator'),
  ('00000000-0000-0000-0000-000000002000', 'Test registration officer'),
  ('00000000-0000-0000-0000-000000003000', 'Test judge'),
  ('00000000-0000-0000-0000-000000004000', 'Test verifier'),
  ('00000000-0000-0000-0000-000000005000', 'Test coordinator'),
  ('00000000-0000-0000-0000-000000006000', 'Test viewer');

insert into public.houses (id, code, name) values
  ('10000000-0000-0000-0000-000000000001', 'TEST', 'Transactional Test House');

insert into public.sports_meets (id, name, year, starts_on, ends_on, status, published_at) values
  ('20000000-0000-0000-0000-000000000001', 'Transactional Test Meet', 2026, '2026-11-01', '2026-11-02', 'draft', null);

insert into public.events (id, sports_meet_id, code, name, event_type, status, roster_status, roster_locked_at) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T100', 'Test Individual Event', 'individual', 'in_progress', 'open', null);

insert into public.students (id, student_number, house_id, legal_first_name, legal_last_name, enrollment_status, eligibility_status, eligibility_verified_by, eligibility_verified_at) values
  ('40000000-0000-0000-0000-000000000001', 'TEST-001', '10000000-0000-0000-0000-000000000001', 'Test', 'Student', 'enrolled', 'eligible', '00000000-0000-0000-0000-000000002000', now());

insert into public.user_roles (user_id, role, event_id, granted_by) values
  ('00000000-0000-0000-0000-000000001000', 'system_administrator', null, '00000000-0000-0000-0000-000000001000'),
  ('00000000-0000-0000-0000-000000002000', 'registration_officer', null, '00000000-0000-0000-0000-000000001000'),
  ('00000000-0000-0000-0000-000000003000', 'event_judge', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000001000'),
  ('00000000-0000-0000-0000-000000004000', 'results_verifier', null, '00000000-0000-0000-0000-000000001000'),
  ('00000000-0000-0000-0000-000000005000', 'sports_coordinator', null, '00000000-0000-0000-0000-000000001000'),
  ('00000000-0000-0000-0000-000000006000', 'public_viewer', null, '00000000-0000-0000-0000-000000001000');

insert into public.event_registrations (
  id, event_id, student_id, house_id, entry_type, status, registered_by,
  reviewed_by, reviewed_at, approved_at, checked_in_by, checked_in_at
) values (
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'individual', 'checked_in', '00000000-0000-0000-0000-000000002000',
  '00000000-0000-0000-0000-000000005000', now(), now(),
  '00000000-0000-0000-0000-000000002000', now()
);

insert into public.scoring_rules (
  id, sports_meet_id, name, version, definition, status, created_by, activated_at, approved_by, approved_at
) values (
  '60000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Test rule', 1, '{"source":"test-only","values":{}}', 'active',
  '00000000-0000-0000-0000-000000001000', now(),
  '00000000-0000-0000-0000-000000005000', now()
);
insert into public.scoring_rule_positions(scoring_rule_id,placement,points)
values('60000000-0000-0000-0000-000000000001',1,1);
update public.events set scoring_rule_id='60000000-0000-0000-0000-000000000001'
where id='30000000-0000-0000-0000-000000000001';

alter table public.events disable trigger audit_events;
update public.events set roster_status = 'locked', roster_locked_at = now()
where id = '30000000-0000-0000-0000-000000000001';
alter table public.events enable trigger audit_events;
alter table public.sports_meets disable trigger meet_configuration_guard;
update public.sports_meets set status = 'registration_closed', published_at = now()
where id = '20000000-0000-0000-0000-000000000001';
alter table public.sports_meets enable trigger meet_configuration_guard;

set local role anon;
select throws_ok(
  $$select * from public.students$$,
  'unauthenticated users cannot access confidential student records'
);
select results_eq(
  $$select count(*) from public.results$$,
  array[0::bigint],
  'unauthenticated users cannot see unpublished results'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000006000', true);
select results_eq(
  $$select count(*) from public.students$$,
  array[0::bigint],
  'a public viewer cannot read student identity records'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000002000', true);
select results_eq(
  $$select count(*) from public.students$$,
  array[1::bigint],
  'a registration officer can read student records'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000006000', true);
select throws_ok(
  $$insert into public.user_roles(user_id, role, granted_by) values ('00000000-0000-0000-0000-000000006000', 'system_administrator', '00000000-0000-0000-0000-000000006000')$$,
  'ordinary users cannot grant themselves roles'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000002000', true);
select throws_ok(
  $$update public.event_registrations set status = 'withdrawn' where id = '50000000-0000-0000-0000-000000000001'$$,
  'locked rosters cannot be changed by registration staff'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000003000', true);
select lives_ok(
  $$select public.save_result('70000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',null,'ranked',1,10000,null,null,null,null,null,true)$$,
  'an assigned event judge can submit a result'
);
select results_eq(
  $$select count(*) from public.result_revisions where result_id = '70000000-0000-0000-0000-000000000001'$$,
  array[1::bigint],
  'submission creates the first immutable result revision'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000004000', true);
select lives_ok(
  $$select public.review_result('70000000-0000-0000-0000-000000000001','verified','Independent performance review')$$,
  'a results verifier can verify a submitted result'
);
select results_eq(
  $$select count(*) from public.result_revisions where result_id = '70000000-0000-0000-0000-000000000001'$$,
  array[2::bigint],
  'verification preserves a second historical revision'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000003000', true);
select throws_ok(
  $$update public.results set status = 'approved', approved_by = '00000000-0000-0000-0000-000000003000', approved_at = now() where id = '70000000-0000-0000-0000-000000000001'$$,
  'a judge cannot approve their own submitted result'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000005000', true);
select lives_ok(
  $$select public.finalize_result('70000000-0000-0000-0000-000000000001',false,'Coordinator approval')$$,
  'a sports coordinator can approve a verified result'
);
select results_eq(
  $$select count(*) from public.result_revisions where result_id = '70000000-0000-0000-0000-000000000001'$$,
  array[3::bigint],
  'approval preserves a third historical revision'
);
select results_eq(
  $$select count(*) from public.results where status = 'published'$$,
  array[0::bigint],
  'approval does not implicitly publish a result'
);

select lives_ok(
  $$select public.score_result('70000000-0000-0000-0000-000000000001','test-only award')$$,
  'a point award can reference an approved revision and scoring version'
);
select throws_ok(
  $$insert into public.point_awards(result_id, result_revision_id, scoring_rule_id, house_id, points, reason, awarded_by) values ('70000000-0000-0000-0000-000000000001', (select id from public.result_revisions where result_id = '70000000-0000-0000-0000-000000000001' and revision_number = 3), '60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'duplicate test', '00000000-0000-0000-0000-000000005000')$$,
  'direct or duplicate point awards are rejected'
);

reset role;
select throws_ok(
  $$update public.audit_logs set action = 'rewritten' where table_name = 'results'$$,
  'audit history cannot be rewritten even by a database owner'
);
select throws_ok(
  $$update public.result_revisions set snapshot = '{}' where result_id = '70000000-0000-0000-0000-000000000001'$$,
  'result revision history cannot be rewritten'
);

set local role anon;
select results_eq(
  $$select count(*) from public.point_awards$$,
  array[0::bigint],
  'the public cannot see points before their result is published'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000005000', true);
select lives_ok(
  $$select public.finalize_result('70000000-0000-0000-0000-000000000001',true,'Authorized publication')$$,
  'publication is a separate controlled transition'
);

set local role anon;
select results_eq(
  $$select count(*) from public.results where status = 'published'$$,
  array[1::bigint],
  'the public can read a published result'
);
select results_eq(
  $$select count(*) from public.point_awards$$,
  array[1::bigint],
  'the public can read points backed by a published result'
);

select * from finish();
rollback;
