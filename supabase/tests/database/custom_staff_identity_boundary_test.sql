begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select ok(
  to_regprocedure('private.provision_marked_staff()') is null,
  'obsolete Auth-metadata staff importer is retired'
);
select results_eq(
  $$select confrelid='public.users'::regclass from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_id_fkey'$$,
  array[true], 'profiles reference application-owned users'
);
select results_eq(
  $$select has_column_privilege('authenticated','public.users','password_hash','SELECT')$$,
  array[false], 'browser database role cannot select password hashes'
);

select * from finish();
rollback;
