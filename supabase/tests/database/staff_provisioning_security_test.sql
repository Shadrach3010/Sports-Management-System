begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
insert into public.users(id,email,display_name,password_hash) values
('00000000-0000-4000-8000-000000051000','provision-admin@test.invalid','Provision administrator',extensions.crypt('temporary-admin-password',extensions.gen_salt('bf'))),
('00000000-0000-4000-8000-000000052000','provision-viewer@test.invalid','Provision viewer',extensions.crypt('temporary-viewer-password',extensions.gen_salt('bf')));
insert into public.profiles(id,display_name) values
('00000000-0000-4000-8000-000000051000','Provision administrator'),
('00000000-0000-4000-8000-000000052000','Provision viewer');
insert into public.user_roles(user_id,role,granted_by) values
('00000000-0000-4000-8000-000000051000','system_administrator','00000000-0000-4000-8000-000000051000'),
('00000000-0000-4000-8000-000000052000','public_viewer','00000000-0000-4000-8000-000000051000');
insert into public.houses(id,code,name) values ('15000000-0000-4000-8000-000000000001','PUB','Publication Test House');
insert into public.students(id,student_number,house_id,legal_first_name,legal_last_name) values
('45000000-0000-4000-8000-000000000001','PUBLIC-001','15000000-0000-4000-8000-000000000001','Private','Athlete');

select results_eq($$select count(*)::integer from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and c.confrelid='auth.users'::regclass and n.nspname='public'$$,array[0],'application tables no longer depend on Auth identities');
select results_eq($$select has_column_privilege('authenticated','public.users','password_hash','SELECT')$$,array[false],'password hashes stay private');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000052000',true);
select throws_ok($$select public.set_student_public_result_identity('45000000-0000-4000-8000-000000000001','Public Athlete',true)$$);
select throws_ok($$insert into public.user_roles(user_id,role) values('00000000-0000-4000-8000-000000052000','system_administrator')$$);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000051000',true);
select lives_ok($$select public.set_student_public_result_identity('45000000-0000-4000-8000-000000000001','Public Athlete',true)$$,'administrator records publication authority');
select throws_ok($$update public.students set public_results_name='Unapproved' where id='45000000-0000-4000-8000-000000000001'$$);
select results_eq($$select public_results_name from public.students where id='45000000-0000-4000-8000-000000000001'$$,array['Public Athlete'],'authorized publication is retained');
reset role;
select * from finish();
rollback;
