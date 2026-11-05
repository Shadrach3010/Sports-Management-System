-- Preserve identities referenced by audit and competition records when an
-- administrator removes an account from the active directory.
begin;
alter table public.users add column if not exists deleted_at timestamptz;
grant select(deleted_at) on public.users to authenticated;
create index if not exists users_active_directory_idx on public.users(display_name) where deleted_at is null;
commit;
