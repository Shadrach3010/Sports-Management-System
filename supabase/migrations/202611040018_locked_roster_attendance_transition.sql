-- Attendance is recorded after roster lock. Permit only the status/attendance
-- fields produced by the trusted check-in and independent void workflows.
create or replace function private.guard_roster_changes()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
declare target_event uuid := coalesce(new.event_id, old.event_id);
begin
  if not exists (
    select 1 from public.events where id = target_event and roster_status = 'locked'
  ) then return coalesce(new, old); end if;

  if current_setting('app.late_roster_change_authorized', true) = 'true'
  then return coalesce(new, old); end if;

  if tg_op = 'UPDATE' and auth.uid() is not null
    and to_jsonb(new) - array['status','checked_in_by','checked_in_at','updated_at']
      = to_jsonb(old) - array['status','checked_in_by','checked_in_at','updated_at']
  then
    if old.status = 'approved' and new.status = 'checked_in'
      and new.checked_in_by = auth.uid() and new.checked_in_at is not null
      and exists (
        select 1 from public.attendance a
        where a.registration_id = old.id and a.event_id = old.event_id
          and a.voided_at is null and a.identity_confirmed
          and a.checked_in_by = auth.uid()
      )
    then return new; end if;
    if old.status = 'checked_in' and new.status = 'approved'
      and new.checked_in_by is null and new.checked_in_at is null
      and exists (
        select 1 from public.attendance a
        join public.attendance_corrections c on c.attendance_id = a.id
        where a.registration_id = old.id and a.event_id = old.event_id
          and a.voided_at is not null and a.voided_by = auth.uid()
          and c.approved_by = auth.uid()
      )
    then return new; end if;
  end if;

  raise exception 'event roster is locked' using errcode = '42501';
end;
$$;

revoke all on function private.guard_roster_changes() from public, anon, authenticated;
