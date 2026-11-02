-- Break the sports_meets -> events -> sports_meets RLS cycle.
begin;

create or replace function private.can_view_unpublished_meet(p_meet_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select private.has_role('system_administrator')
      or private.has_role('sports_coordinator')
      or private.has_role('registration_officer')
      or exists (
        select 1 from public.meet_houses mh
        where mh.sports_meet_id = p_meet_id and mh.is_active
          and private.has_house_role('house_representative', mh.house_id)
      )
      or exists (
        select 1 from public.events e
        where e.sports_meet_id = p_meet_id
          and (private.is_event_official('event_judge', e.id)
            or private.is_event_official('check_in_officer', e.id))
      );
$$;
revoke all on function private.can_view_unpublished_meet(uuid) from public, anon, authenticated;
grant execute on function private.can_view_unpublished_meet(uuid) to authenticated;

drop policy if exists meets_authenticated_read on public.sports_meets;
create policy meets_authenticated_read on public.sports_meets
for select to authenticated
using (published_at is not null or private.can_view_unpublished_meet(id));

commit;
