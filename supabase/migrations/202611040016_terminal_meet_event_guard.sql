-- Keep an archived, completed or cancelled meet's event lifecycle immutable.
create function private.guard_event_after_meet_closure()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  if old.status is distinct from new.status and exists (
    select 1 from public.sports_meets m
    where m.id = old.sports_meet_id and m.status in ('completed','cancelled','archived')
  ) then
    raise exception 'event lifecycle is locked after meet closure' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger event_after_meet_closure_guard
before update on public.events for each row
execute function private.guard_event_after_meet_closure();

revoke all on function private.guard_event_after_meet_closure() from public, anon, authenticated;
