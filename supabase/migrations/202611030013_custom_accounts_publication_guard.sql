-- Complete the move to application-owned staff identities. Existing UUIDs stay
-- unchanged so historical attribution and audit references remain valid.
begin;

alter table public.users drop constraint if exists users_id_fkey;
alter table public.users alter column id set default extensions.gen_random_uuid();
alter table public.users alter column created_at set default now();
alter table public.users alter column is_active set default true;
alter table public.users alter column email set not null;
alter table public.users alter column password_hash set not null;

drop trigger if exists profiles_sync_public_users on public.profiles;
drop trigger if exists auth_sync_public_user_email on auth.users;
drop function if exists private.sync_public_user_from_profile();
drop function if exists private.sync_public_user_email();
drop function if exists public.provision_staff_user(uuid,text,text,uuid,uuid,timestamptz);

-- Repoint only application-owned references. Supabase's own auth tables remain
-- untouched, while staff created here never need an auth.users row.
do $$
declare item record; definition text;
begin
  for item in
    select n.nspname, c.relname, f.conname, pg_get_constraintdef(f.oid) as definition
    from pg_constraint f
    join pg_class c on c.oid = f.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where f.contype = 'f' and f.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
  loop
    definition := replace(item.definition, 'REFERENCES auth.users(id)', 'REFERENCES public.users(id)');
    if definition = item.definition then
      raise exception 'Unrecognized Auth foreign key: %.%', item.relname, item.conname;
    end if;
    execute format('alter table %I.%I drop constraint %I', item.nspname, item.relname, item.conname);
    execute format('alter table %I.%I add constraint %I %s', item.nspname, item.relname, item.conname, definition);
  end loop;
end $$;

create or replace function private.sync_public_user_from_profile()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
begin
  update public.users set display_name = new.display_name,
    is_active = new.is_active, updated_at = now() where id = new.id;
  return new;
end;
$$;
create trigger profiles_sync_public_users after update of display_name,is_active on public.profiles
for each row execute function private.sync_public_user_from_profile();
revoke all on function private.sync_public_user_from_profile() from public,anon,authenticated;

-- A private transaction marker is checked by the row guard. Ordinary API
-- roles cannot forge one; the marker is removed before the RPC returns.
create table private.student_publication_authorizations (
  backend_pid integer not null,
  transaction_id bigint not null,
  student_id uuid not null,
  actor_id uuid not null,
  primary key (backend_pid, transaction_id, student_id)
);
revoke all on private.student_publication_authorizations from public,anon,authenticated;

create or replace function private.guard_student_public_result_identity()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.public_results_name is null and new.public_results_consent_at is null
      and new.public_results_consent_recorded_by is null then return new; end if;
  elsif old.public_results_name is not distinct from new.public_results_name
    and old.public_results_consent_at is not distinct from new.public_results_consent_at
    and old.public_results_consent_recorded_by is not distinct from new.public_results_consent_recorded_by then
    return new;
  end if;
  if not exists (
    select 1 from private.student_publication_authorizations a
    where a.backend_pid = pg_backend_pid() and a.transaction_id = txid_current()
      and a.student_id = new.id and a.actor_id = auth.uid()
  ) then
    raise exception 'public result identity requires the controlled publication workflow' using errcode='42501';
  end if;
  return new;
end;
$$;

create or replace function public.set_student_public_result_identity(
  p_student_id uuid, p_public_name text, p_consent boolean
)
returns void language plpgsql security definer set search_path = pg_catalog
as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'student publication authority required' using errcode='42501';
  end if;
  if p_consent and length(trim(coalesce(p_public_name,''))) < 2 then
    raise exception 'an approved public result name is required' using errcode='22023';
  end if;
  insert into private.student_publication_authorizations
    (backend_pid, transaction_id, student_id, actor_id)
  values (pg_backend_pid(), txid_current(), p_student_id, actor);
  update public.students
  set public_results_name = case when p_consent then trim(p_public_name) else null end,
    public_results_consent_at = case when p_consent then now() else null end,
    public_results_consent_recorded_by = case when p_consent then actor else null end
  where id = p_student_id;
  if not found then raise exception 'student not found' using errcode='P0002'; end if;
  delete from private.student_publication_authorizations
  where backend_pid = pg_backend_pid() and transaction_id = txid_current() and student_id = p_student_id;
end;
$$;

revoke all on function private.guard_student_public_result_identity() from public,anon,authenticated;
revoke all on function public.set_student_public_result_identity(uuid,text,boolean) from public,anon;
grant execute on function public.set_student_public_result_identity(uuid,text,boolean) to authenticated;

commit;
