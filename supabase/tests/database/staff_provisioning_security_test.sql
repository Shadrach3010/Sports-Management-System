begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000051000','provision-admin@test.invalid'),
('00000000-0000-4000-8000-000000052000','provision-ordinary@test.invalid'),
('00000000-0000-4000-8000-000000053000','provision-target@test.invalid');
insert into public.profiles(id,display_name) values
('00000000-0000-4000-8000-000000051000','Provision administrator'),
('00000000-0000-4000-8000-000000052000','Provision ordinary user');
insert into public.user_roles(user_id,role,granted_by) values
('00000000-0000-4000-8000-000000051000','system_administrator','00000000-0000-4000-8000-000000051000'),
('00000000-0000-4000-8000-000000052000','public_viewer','00000000-0000-4000-8000-000000051000');
insert into public.houses(id,code,name) values
('15000000-0000-4000-8000-000000000001','PUB','Publication Test House');
insert into public.students(id,student_number,house_id,legal_first_name,legal_last_name) values
('45000000-0000-4000-8000-000000000001','PUBLIC-001','15000000-0000-4000-8000-000000000001','Private','Athlete');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000052000',true);
select throws_ok($$select public.provision_staff_user('00000000-0000-4000-8000-000000053000','Target user','results_verifier',null,null,null)$$,'ordinary users cannot provision roles');
select throws_ok($$select public.set_student_public_result_identity('45000000-0000-4000-8000-000000000001','Public Athlete',true)$$,'ordinary users cannot publish a student result identity');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000051000',true);
select lives_ok($$select public.provision_staff_user('00000000-0000-4000-8000-000000053000','Target verifier','results_verifier',null,null,null)$$,'administrator provisions an existing Auth identity');
select lives_ok($$select public.set_student_public_result_identity('45000000-0000-4000-8000-000000000001','Public Athlete',true)$$,'administrator records an approved public result identity');
select results_eq($$select concat(public_results_name,',',public_results_consent_at is not null) from public.students where id='45000000-0000-4000-8000-000000000001'$$,array['Public Athlete,true'],'public identity decision is stored without changing legal identity');
select results_eq($$select display_name from public.profiles where id='00000000-0000-4000-8000-000000053000'$$,array['Target verifier'],'profile is created centrally');
select results_eq($$select role from public.user_roles where user_id='00000000-0000-4000-8000-000000053000'$$,array['results_verifier'],'explicit role is assigned');
select results_eq($$select granted_by from public.user_roles where user_id='00000000-0000-4000-8000-000000053000'$$,array['00000000-0000-4000-8000-000000051000'::uuid],'role grant records the administrator');
select throws_ok($$select public.provision_staff_user('00000000-0000-4000-8000-000000059999','Missing Auth identity','public_viewer',null,null,null)$$,'missing Auth identities cannot be provisioned');
select throws_ok($$select public.provision_staff_user('00000000-0000-4000-8000-000000053000','Invalid scope','results_verifier','13000000-0000-4000-8000-000000000001',null,null)$$,'global roles reject client-supplied house scope');

reset role;
select results_eq($$select has_function_privilege('anon','public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz)','EXECUTE')$$,array[false],'anonymous users cannot execute provisioning');
select results_eq($$select has_function_privilege('anon','public.get_public_competition_results()','EXECUTE')$$,array[true],'anonymous users may execute the filtered public scoreboard function');

select * from finish();
rollback;
