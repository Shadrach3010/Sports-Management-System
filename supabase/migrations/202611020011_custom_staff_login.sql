-- Custom CSMIS login. Existing demo hashes are copied once; plaintext is never stored.
begin;

alter table public.users add column if not exists password_hash text;
create unique index if not exists users_email_unique_ci on public.users (lower(email)) where email is not null;

update public.users u set password_hash = a.encrypted_password
from auth.users a
where u.id = a.id and u.password_hash is null and nullif(a.encrypted_password, '') is not null;

create table if not exists private.staff_sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint staff_sessions_expiry_check check (expires_at > created_at)
);
create index if not exists staff_sessions_user_idx on private.staff_sessions(user_id);
create index if not exists staff_sessions_expiry_idx on private.staff_sessions(expires_at);
revoke all on private.staff_sessions from public, anon, authenticated;

-- A row may be readable to its owner, but its password hash must never be
-- available through PostgREST. Server login uses a private PostgreSQL connection.
revoke all on public.users from public, anon, authenticated;
grant select(id,email,display_name,is_active,created_at,updated_at) on public.users to authenticated;

commit;
