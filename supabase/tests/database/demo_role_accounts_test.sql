begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select results_eq(
  $$select count(*)::integer from public.user_roles where user_id::text like 'd5000000-0000-4000-8000-00000000000%'$$,
  array[9], 'all nine demo roles are present'
);
select results_eq(
  $$select count(*)::integer from auth.users where id::text like 'd5000000-0000-4000-8000-00000000000%' and encrypted_password is not null and email_confirmed_at is not null$$,
  array[9], 'all demo users have a password hash and confirmed email'
);
select results_eq(
  $$select count(*)::integer from auth.identities where user_id::text like 'd5000000-0000-4000-8000-00000000000%' and provider='email'$$,
  array[9], 'all demo users have an email identity'
);
select results_eq(
  $$select extensions.crypt('admin123',encrypted_password)=encrypted_password from auth.users where id='d5000000-0000-4000-8000-000000000001'$$,
  array[true], 'the documented mock administrator password matches its stored hash'
);
select results_eq(
  $$select count(*)::integer from public.event_officials where event_id='d4000000-0000-4000-8000-000000000001'$$,
  array[2], 'judge and check-in officer have event assignments'
);
select results_eq(
  $$select count(*)::integer from public.students where house_id in
    ('d1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003')$$,
  array[0], 'demo fixture adds no student records'
);

select * from finish();
rollback;
