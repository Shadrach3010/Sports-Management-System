begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

-- Transactional fixtures only; these values never become production seed data.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000011000', 'm2-admin@test.invalid'),
  ('00000000-0000-0000-0000-000000012000', 'm2-registration@test.invalid'),
  ('00000000-0000-0000-0000-000000013000', 'm2-coordinator@test.invalid'),
  ('00000000-0000-0000-0000-000000014000', 'm2-viewer@test.invalid');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000011000', 'Milestone two administrator'),
  ('00000000-0000-0000-0000-000000012000', 'Milestone two registration officer'),
  ('00000000-0000-0000-0000-000000013000', 'Milestone two coordinator'),
  ('00000000-0000-0000-0000-000000014000', 'Milestone two viewer');

insert into public.houses (id, code, name) values
  ('11000000-0000-4000-8000-000000000001', 'M2A', 'Milestone Two Active House'),
  ('11000000-0000-4000-8000-000000000002', 'M2B', 'Milestone Two Linked House');

insert into public.students (id, student_number, house_id, legal_first_name, legal_last_name) values
  ('41000000-0000-4000-8000-000000000001', 'M2-EXISTING', '11000000-0000-4000-8000-000000000002', 'Existing', 'Student');

insert into public.user_roles (user_id, role, granted_by) values
  ('00000000-0000-0000-0000-000000011000', 'system_administrator', '00000000-0000-0000-0000-000000011000'),
  ('00000000-0000-0000-0000-000000012000', 'registration_officer', '00000000-0000-0000-0000-000000011000'),
  ('00000000-0000-0000-0000-000000013000', 'sports_coordinator', '00000000-0000-0000-0000-000000011000'),
  ('00000000-0000-0000-0000-000000014000', 'public_viewer', '00000000-0000-0000-0000-000000011000');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000011000', true);
select results_eq($$select count(*) from public.students where student_number = 'M2-EXISTING'$$, array[1::bigint], 'administrator can read the private register');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000012000', true);
select lives_ok(
  $$insert into public.students(student_number, house_id, legal_first_name, legal_last_name) values ('M2-REG-001', '11000000-0000-4000-8000-000000000001', 'Registration', 'Officer')$$,
  'registration officer can create a student record'
);
select throws_ok(
  $$insert into public.students(student_number, house_id, legal_first_name, legal_last_name) values ('m2-reg-001', '11000000-0000-4000-8000-000000000001', 'Duplicate', 'Identifier')$$,
  'duplicate student identifiers are rejected case-insensitively'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000014000', true);
select results_eq($$select count(*) from public.students$$, array[0::bigint], 'public viewer cannot read the student register');
select results_eq(
  $$with changed as (update public.students set enrollment_status = 'graduated' where id = '41000000-0000-4000-8000-000000000001' returning id) select count(*) from changed$$,
  array[0::bigint],
  'unauthorized users cannot change academic status'
);
select throws_ok(
  $$select public.verify_student_eligibility('41000000-0000-4000-8000-000000000001', 'eligible', 'test verification')$$,
  'unauthorized users cannot verify eligibility'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000013000', true);
select lives_ok(
  $$update public.houses set is_active = false where id = '11000000-0000-4000-8000-000000000002'$$,
  'sports coordinator can deactivate a linked house without deleting it'
);
select results_eq(
  $$select count(*) from public.students where house_id = '11000000-0000-4000-8000-000000000002'$$,
  array[1::bigint],
  'deactivation preserves linked student records'
);
select results_eq(
  $$with changed as (update public.students set house_id = '11000000-0000-4000-8000-000000000001' where id = '41000000-0000-4000-8000-000000000001' returning id) select count(*) from changed$$,
  array[0::bigint],
  'sports coordinators cannot modify official house assignments'
);
select results_eq(
  $$select count(*) > 0 from public.audit_logs where table_name = 'houses' and record_id = '11000000-0000-4000-8000-000000000002' and action = 'update'$$,
  array[true],
  'house deactivation creates an audit record'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000012000', true);
select lives_ok(
  $$select public.verify_student_eligibility('41000000-0000-4000-8000-000000000001', 'eligible', 'Academic record checked')$$,
  'registration officer can use the controlled eligibility workflow'
);
select results_eq(
  $$select count(*) from public.student_eligibility_history where student_id = '41000000-0000-4000-8000-000000000001' and new_status = 'eligible'$$,
  array[1::bigint],
  'eligibility changes create protected history'
);
select throws_ok(
  $$update public.students set eligibility_status = 'ineligible' where id = '41000000-0000-4000-8000-000000000001'$$,
  'eligibility cannot be changed by directly updating the student row'
);

select lives_ok(
  $$select public.stage_student_import(
    'transactional-test.csv', 'csv', 100, repeat('a', 64),
    '{"studentNumber":0,"firstName":1,"lastName":2,"otherNames":null,"academicStatus":3,"house":4}'::jsonb,
    '[
      {"row_number":2,"student_number":"M2-IMPORT-NEW","legal_first_name":"New","legal_last_name":"Student","other_names":null,"enrollment_status":"enrolled","house_id":"11000000-0000-4000-8000-000000000001","source_house":"M2A","issues":[]},
      {"row_number":3,"student_number":"M2-EXISTING","legal_first_name":"Conflict","legal_last_name":"Student","other_names":null,"enrollment_status":"enrolled","house_id":"11000000-0000-4000-8000-000000000001","source_house":"M2A","issues":["student_number_exists"]}
    ]'::jsonb
  )$$,
  'authorized staff can stage a validated import'
);
select lives_ok(
  $$select public.commit_student_import((select id from public.student_import_batches where file_name = 'transactional-test.csv'))$$,
  'a mixed batch completes transparently without an all-or-nothing mystery failure'
);
select results_eq(
  $$select imported_rows::bigint, rejected_rows::bigint from public.student_import_batches where file_name = 'transactional-test.csv'$$,
  $$values (1::bigint, 1::bigint)$$,
  'partial import outcome records accepted and rejected row totals'
);

reset role;
update public.profiles set is_active = false where id = '00000000-0000-0000-0000-000000012000';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000012000', true);
select results_eq(
  $$select count(*) from public.students$$,
  array[0::bigint],
  'a deactivated staff profile loses database role authority'
);

reset role;
select results_eq(
  $$select count(*) > 0 from public.audit_logs where table_name = 'students' and record_id = '41000000-0000-4000-8000-000000000001'$$,
  array[true],
  'student changes create a redacted audit record'
);
select throws_ok(
  $$update public.student_eligibility_history set reason = 'rewritten' where student_id = '41000000-0000-4000-8000-000000000001'$$,
  'eligibility audit history cannot be rewritten even by a database owner'
);

select * from finish();
rollback;

