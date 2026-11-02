-- Populate application profiles and roles for pre-existing Supabase Auth users.
-- Only a trusted Auth administrator can set raw_app_meta_data. This migration
-- never creates Auth identities, passwords, houses, students, or event results.

create or replace function private.provision_marked_staff()
returns integer
language plpgsql
set search_path = pg_catalog
as $$
declare
  staff record;
  scope_house_id uuid;
  scope_event_id uuid;
  provisioned integer := 0;
begin
  for staff in
    select id, email, email_confirmed_at, raw_app_meta_data
    from auth.users
    where raw_app_meta_data->>'csmis_staff_role' is not null
  loop
    if staff.email_confirmed_at is null then
      raise exception 'Staff Auth identity % must have a confirmed email', staff.id;
    end if;
    if staff.raw_app_meta_data->>'csmis_staff_role' not in (
      'system_administrator', 'sports_coordinator', 'registration_officer',
      'house_representative', 'check_in_officer', 'event_judge',
      'results_verifier', 'protest_committee', 'public_viewer'
    ) then
      raise exception 'Unsupported CSMIS role for Auth identity %', staff.id;
    end if;
    if length(trim(coalesce(staff.raw_app_meta_data->>'csmis_display_name', ''))) < 2 then
      raise exception 'CSMIS display name required for Auth identity %', staff.id;
    end if;
    if exists (select 1 from public.profiles where id = staff.id and not is_active) then
      raise exception 'Inactive profile % requires a separate reactivation decision', staff.id;
    end if;

    scope_house_id := null;
    scope_event_id := null;
    if staff.raw_app_meta_data->>'csmis_staff_role' = 'house_representative' then
      if staff.raw_app_meta_data ? 'csmis_event_id' then
        raise exception 'House representative cannot have event scope for Auth identity %', staff.id;
      end if;
      select id into scope_house_id from public.houses
      where code = staff.raw_app_meta_data->>'csmis_house_code' and is_active;
      if scope_house_id is null then
        raise exception 'Active house scope required for Auth identity %', staff.id;
      end if;
    elsif staff.raw_app_meta_data->>'csmis_staff_role' = 'event_judge' then
      if staff.raw_app_meta_data ? 'csmis_house_code' then
        raise exception 'Event judge cannot have house scope for Auth identity %', staff.id;
      end if;
      if coalesce(staff.raw_app_meta_data->>'csmis_event_id', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        raise exception 'Valid event scope required for Auth identity %', staff.id;
      end if;
      scope_event_id := (staff.raw_app_meta_data->>'csmis_event_id')::uuid;
      if not exists (select 1 from public.events where id = scope_event_id) then
        raise exception 'Event scope does not exist for Auth identity %', staff.id;
      end if;
    elsif staff.raw_app_meta_data ?| array['csmis_house_code', 'csmis_event_id'] then
      raise exception 'Global role cannot have house or event scope for Auth identity %', staff.id;
    end if;
    if exists (
      select 1 from public.user_roles
      where user_id = staff.id and (
        role is distinct from staff.raw_app_meta_data->>'csmis_staff_role'
        or house_id is distinct from scope_house_id
        or event_id is distinct from scope_event_id
      )
    ) then
      raise exception 'Existing role assignment differs for Auth identity %; review it manually', staff.id;
    end if;

    insert into public.profiles(id, display_name)
    values (staff.id, trim(staff.raw_app_meta_data->>'csmis_display_name'))
    on conflict (id) do nothing;

    insert into public.user_roles(user_id, role, house_id, event_id)
    values (staff.id, staff.raw_app_meta_data->>'csmis_staff_role', scope_house_id, scope_event_id)
    on conflict (user_id, role, house_id, event_id) do nothing;
    provisioned := provisioned + 1;
  end loop;
  return provisioned;
end;
$$;

revoke all on function private.provision_marked_staff() from public, anon, authenticated;

-- Runs once during migration. A database owner may call it again after adding
-- further trusted Auth users with the approved metadata fields.
select private.provision_marked_staff();
