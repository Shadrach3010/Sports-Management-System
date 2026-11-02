-- Private application directory. Authentication remains in auth.users;
-- roles remain in public.user_roles. No passwords are copied here.
begin;

create table public.users (
  id uuid primary key references public.profiles(id) on delete cascade,
  email text,
  display_name text not null check (length(trim(display_name)) > 0),
  is_active boolean not null,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index users_email_lookup_idx on public.users(lower(email));

alter table public.users enable row level security;
revoke all on public.users from public, anon, authenticated;
grant select on public.users to authenticated;
create policy users_self_or_admin_read on public.users for select to authenticated
using (id = auth.uid() or private.has_role('system_administrator'));

insert into public.users(id,email,display_name,is_active,created_at,updated_at)
select p.id,a.email,p.display_name,p.is_active,p.created_at,p.updated_at
from public.profiles p join auth.users a on a.id=p.id;

create function private.sync_public_user_from_profile()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  insert into public.users(id,email,display_name,is_active,created_at,updated_at)
  select new.id,a.email,new.display_name,new.is_active,new.created_at,new.updated_at
  from auth.users a where a.id=new.id
  on conflict(id) do update set
    email=excluded.email,display_name=excluded.display_name,
    is_active=excluded.is_active,updated_at=excluded.updated_at;
  return new;
end;
$$;

create function private.sync_public_user_email()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  update public.users set email=new.email,updated_at=now() where id=new.id;
  return new;
end;
$$;

create trigger profiles_sync_public_users after insert or update of display_name,is_active on public.profiles
for each row execute function private.sync_public_user_from_profile();
create trigger auth_sync_public_user_email after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function private.sync_public_user_email();
create trigger audit_public_users after insert or update or delete on public.users
for each row execute function private.write_audit_log();

revoke all on function private.sync_public_user_from_profile() from public,anon,authenticated;
revoke all on function private.sync_public_user_email() from public,anon,authenticated;

commit;
