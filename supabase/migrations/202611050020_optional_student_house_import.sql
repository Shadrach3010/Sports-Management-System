-- A register entry may precede house assignment. Competition entries still
-- require the student's assigned house and the existing eligibility checks.
alter table public.students alter column house_id drop not null;

-- Once a student has a competition entry, changing their house would make
-- the official register disagree with that entry's recorded house.
create function private.guard_student_house_after_registration()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
begin
  if old.house_id is distinct from new.house_id and exists (
    select 1 from public.event_registrations er where er.student_id = old.id
  ) then
    raise exception 'student house cannot change after competition registration'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger student_house_after_registration_guard
before update of house_id on public.students
for each row execute function private.guard_student_house_after_registration();

revoke all on function private.guard_student_house_after_registration()
  from public, anon, authenticated;

-- Preserve the existing audited, role-limited import ledger and partial
-- conflict handling. A null house is accepted only when the source supplied
-- no house. A supplied but unmatched house remains a rejected row.
create or replace function public.commit_student_import(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  batch_record public.student_import_batches%rowtype;
  import_row public.student_import_rows%rowtype;
  duplicate_count integer;
  new_student_id uuid;
  imported_count integer := 0;
  rejected_count integer := 0;
begin
  if not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'student import role required' using errcode = '42501';
  end if;

  select * into batch_record from public.student_import_batches
  where id = p_batch_id for update;
  if not found then raise exception 'import batch not found' using errcode = 'P0002'; end if;
  if batch_record.status <> 'staged' then
    raise exception 'import batch is no longer pending confirmation' using errcode = '55000';
  end if;

  for import_row in
    select * from public.student_import_rows
    where batch_id = p_batch_id order by row_number
  loop
    select count(*) into duplicate_count
    from public.student_import_rows duplicate_row
    where duplicate_row.batch_id = p_batch_id
      and lower(duplicate_row.student_number) = lower(import_row.student_number)
      and import_row.student_number is not null;

    if import_row.validation_status <> 'valid'
       or import_row.student_number is null
       or import_row.legal_first_name is null
       or import_row.legal_last_name is null
       or import_row.enrollment_status is null
       or (import_row.source_house is null and import_row.house_id is not null)
       or (import_row.source_house is not null and import_row.house_id is null)
       or duplicate_count > 1
       or (import_row.house_id is not null and not exists (
         select 1 from public.houses h
         where h.id = import_row.house_id and h.is_active
       ))
       or exists (
         select 1 from public.students s
         where lower(s.student_number) = lower(import_row.student_number)
       )
    then
      update public.student_import_rows
      set validation_status = case
        when exists (
          select 1 from public.students s
          where lower(s.student_number) = lower(import_row.student_number)
        ) then 'conflict'
        else 'rejected'
      end,
      issues = issues || case
        when duplicate_count > 1 then '["duplicate_in_file"]'::jsonb
        when exists (
          select 1 from public.students s
          where lower(s.student_number) = lower(import_row.student_number)
        ) then '["student_number_exists"]'::jsonb
        else '[]'::jsonb
      end
      where id = import_row.id;
      rejected_count := rejected_count + 1;
      continue;
    end if;

    begin
      insert into public.students (
        student_number, legal_first_name, legal_last_name, other_names,
        enrollment_status, house_id, eligibility_status
      ) values (
        import_row.student_number, import_row.legal_first_name,
        import_row.legal_last_name, import_row.other_names,
        import_row.enrollment_status, import_row.house_id, 'unverified'
      ) returning id into new_student_id;

      update public.student_import_rows
      set validation_status = 'imported', created_student_id = new_student_id
      where id = import_row.id;
      imported_count := imported_count + 1;
    exception when unique_violation then
      update public.student_import_rows
      set validation_status = 'conflict',
          issues = issues || '["student_number_exists"]'::jsonb
      where id = import_row.id;
      rejected_count := rejected_count + 1;
    when check_violation or not_null_violation or foreign_key_violation or string_data_right_truncation then
      update public.student_import_rows
      set validation_status = 'rejected',
          issues = issues || '["database_constraint_failure"]'::jsonb
      where id = import_row.id;
      rejected_count := rejected_count + 1;
    end;
  end loop;

  update public.student_import_batches
  set status = 'completed', imported_rows = imported_count,
      rejected_rows = rejected_count, confirmed_by = auth.uid(), completed_at = now()
  where id = p_batch_id;

  return jsonb_build_object(
    'batch_id', p_batch_id,
    'imported_rows', imported_count,
    'rejected_rows', rejected_count
  );
end;
$$;

revoke all on function public.commit_student_import(uuid) from public, anon;
grant execute on function public.commit_student_import(uuid) to authenticated;
