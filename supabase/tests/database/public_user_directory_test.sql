begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select results_eq(
  $$select count(*)::integer from public.users where id::text like 'd5000000-0000-4000-8000-00000000000%'$$,
  array[9], 'all nine demo profiles appear in the public users directory'
);
select results_eq(
  $$select has_table_privilege('anon','public.users','SELECT')$$,
  array[false], 'anonymous users cannot read the directory'
);
select results_eq(
  $$select has_table_privilege('authenticated','public.users','UPDATE')$$,
  array[false], 'authenticated users cannot edit directory records directly'
);
update public.profiles set display_name='Updated Demo Viewer'
where id='d5000000-0000-4000-8000-000000000009';
select results_eq(
  $$select display_name from public.users where id='d5000000-0000-4000-8000-000000000009'$$,
  array['Updated Demo Viewer'], 'profile changes synchronize to the directory'
);
select results_eq(
  $$select count(*)::integer from public.audit_logs where table_name='users' and action='update' and record_id='d5000000-0000-4000-8000-000000000009'$$,
  array[1], 'directory change is audited'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','d5000000-0000-4000-8000-000000000009',true);
select results_eq(
  $$select count(*)::integer from public.users$$,
  array[1], 'ordinary user sees only their own directory row'
);
select set_config('request.jwt.claim.sub','d5000000-0000-4000-8000-000000000001',true);
select results_eq(
  $$select count(*)::integer from public.users where id::text like 'd5000000-0000-4000-8000-00000000000%'$$,
  array[9], 'administrator can read the staff directory'
);

select * from finish();
rollback;
