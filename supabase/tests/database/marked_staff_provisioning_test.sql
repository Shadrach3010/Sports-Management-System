begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
('00000000-0000-4000-8000-000000071001','marked-admin@test.invalid',now(),
 '{"csmis_staff_role":"system_administrator","csmis_display_name":"Marked Administrator"}'::jsonb),
('00000000-0000-4000-8000-000000071002','unmarked@test.invalid',now(),'{}'::jsonb),
('00000000-0000-4000-8000-000000071003','marked-unconfirmed@test.invalid',null,
 '{"csmis_staff_role":"registration_officer","csmis_display_name":"Unconfirmed Officer"}'::jsonb);

select throws_ok($$select private.provision_marked_staff()$$,'unconfirmed Auth identities are rejected');
update auth.users set raw_app_meta_data='{}'::jsonb where id='00000000-0000-4000-8000-000000071003';
select lives_ok($$select private.provision_marked_staff()$$,'confirmed marked Auth identity is provisioned');
select results_eq($$select role from public.user_roles where user_id='00000000-0000-4000-8000-000000071001'$$,
 array['system_administrator'],'marked identity receives its approved role');
select results_eq($$select count(*)::integer from public.profiles where id='00000000-0000-4000-8000-000000071002'$$,
 array[0],'unmarked identity is not provisioned');
select results_eq($$select has_function_privilege('authenticated','private.provision_marked_staff()','EXECUTE')$$,
 array[false],'authenticated users cannot invoke the owner provisioning function');

select * from finish();
rollback;
