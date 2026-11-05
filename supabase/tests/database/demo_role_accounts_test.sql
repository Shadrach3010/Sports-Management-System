begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select results_eq(
  $$select count(*)::integer from public.user_roles where user_id::text like 'd5000000-0000-4000-8000-00000000000%'$$,
  array[9], 'all nine demo roles are present'
);
select results_eq(
  $$select count(*)::integer from public.users where id::text like 'd5000000-0000-4000-8000-00000000000%' and password_hash is not null and is_active$$,
  array[9], 'all demo users have an active custom-login account'
);
select results_eq(
  $$select count(*)::integer from public.profiles where id::text like 'd5000000-0000-4000-8000-00000000000%' and is_active$$,
  array[9], 'all demo users have an active staff profile'
);
select results_eq(
  $$select extensions.crypt('admin123',password_hash)=password_hash from public.users where id='d5000000-0000-4000-8000-000000000001'$$,
  array[true], 'the documented mock administrator password matches its stored hash'
);
select results_eq(
  $$select count(*)::integer from public.event_officials where event_id='d4000000-0000-4000-8000-000000000001'$$,
  array[2], 'judge and check-in officer have event assignments'
);
select results_eq(
  $$select count(*)::integer from public.events where sports_meet_id='d2000000-0000-4000-8000-000000000001'$$,
  array[2], 'demo meet has one individual and one team event'
);

select * from finish();
rollback;
