-- Milestone 2: houses, student eligibility, and controlled import staging.

alter table public.houses
  add column official_color text,
  add constraint houses_name_reasonable_length check (length(trim(name)) <= 100) not valid,
  add constraint houses_official_color_format
    check (official_color is null or official_color ~ '^#[0-9A-F]{6}$');

create unique index houses_name_case_insensitive_uidx on public.houses(lower(name));

-- A deactivated staff profile must lose authority at the database boundary,
-- including callers that bypass the application UI and use the Data API.
create or replace function private.has_role(required_role text)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = auth.uid()
      and ur.role = required_role
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function private.has_house_role(required_role text, required_house uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = auth.uid()
      and ur.role = required_role
      and ur.house_id = required_house
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function private.has_event_role(required_role text, required_event uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id and p.is_active
    where ur.user_id = auth.uid()
      and ur.role = required_role
      and ur.event_id = required_event
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

revoke all on function private.has_role(text) from public, anon;
revoke all on function private.has_house_role(text, uuid) from public, anon;
revoke all on function private.has_event_role(text, uuid) from public, anon;
grant execute on function private.has_role(text) to authenticated;
grant execute on function private.has_house_role(text, uuid) to authenticated;
grant execute on function private.has_event_role(text, uuid) to authenticated;

alter table public.students
  add column other_names text,
  add column eligibility_status text not null default 'unverified'
    check (eligibility_status in ('unverified', 'eligible', 'ineligible')),
  add column eligibility_reason text,
  add column eligibility_verified_by uuid references auth.users(id) on delete restrict,
  add column eligibility_verified_at timestamptz,
  add constraint students_number_reasonable_length check (length(trim(student_number)) <= 64) not valid,
  add constraint students_first_name_reasonable_length check (length(trim(legal_first_name)) <= 100) not valid,
  add constraint students_last_name_reasonable_length check (length(trim(legal_last_name)) <= 100) not valid,
  add constraint students_other_names_reasonable_length check (other_names is null or length(trim(other_names)) <= 150) not valid,
  add constraint students_eligibility_verification_consistency check (
    (eligibility_status = 'unverified' and eligibility_verified_by is null and eligibility_verified_at is null)
    or
    (eligibility_status in ('eligible', 'ineligible') and eligibility_verified_by is not null and eligibility_verified_at is not null)
  );

create index students_name_search_idx
  on public.students(lower(legal_last_name), lower(legal_first_name));
create unique index students_number_case_insensitive_uidx
  on public.students(lower(student_number));
create index students_eligibility_status_idx on public.students(eligibility_status);

-- Trusted house/student administrators must still be able to identify an
-- inactive house so it can be reactivated and existing assignments stay clear.
drop policy if exists houses_authenticated_read on public.houses;
create policy houses_authenticated_read
  on public.houses for select to authenticated
  using (
    is_active
    or private.has_role('system_administrator')
    or private.has_role('sports_coordinator')
    or private.has_role('registration_officer')
  );

create table public.student_import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  file_type text not null check (file_type in ('csv', 'xlsx')),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 5242880),
  file_sha256 text not null check (file_sha256 ~ '^[a-f0-9]{64}$'),
  column_mapping jsonb not null check (jsonb_typeof(column_mapping) = 'object'),
  status text not null default 'staged'
    check (status in ('staged', 'completed', 'failed', 'cancelled')),
  total_rows integer not null check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  confirmed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (valid_rows + invalid_rows = total_rows),
  check ((status = 'completed' and confirmed_by is not null and completed_at is not null) or status <> 'completed')
);

create index student_import_batches_created_by_idx
  on public.student_import_batches(created_by, created_at desc);

create table public.student_import_rows (
  id uuid primary key default extensions.gen_random_uuid(),
  batch_id uuid not null references public.student_import_batches(id) on delete restrict,
  row_number integer not null check (row_number > 1),
  student_number text,
  legal_first_name text,
  legal_last_name text,
  other_names text,
  enrollment_status text check (enrollment_status in ('enrolled', 'suspended', 'graduated', 'withdrawn')),
  house_id uuid references public.houses(id) on delete restrict,
  source_house text,
  validation_status text not null
    check (validation_status in ('valid', 'invalid', 'conflict', 'imported', 'rejected')),
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  created_student_id uuid references public.students(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

alter table public.student_import_rows
  add constraint import_rows_student_number_length check (student_number is null or length(trim(student_number)) <= 64),
  add constraint import_rows_first_name_length check (legal_first_name is null or length(trim(legal_first_name)) <= 100),
  add constraint import_rows_last_name_length check (legal_last_name is null or length(trim(legal_last_name)) <= 100),
  add constraint import_rows_other_names_length check (other_names is null or length(trim(other_names)) <= 150),
  add constraint import_rows_source_house_length check (source_house is null or length(trim(source_house)) <= 100);

create index student_import_rows_batch_status_idx
  on public.student_import_rows(batch_id, validation_status);
create index student_import_rows_student_number_idx
  on public.student_import_rows(student_number) where student_number is not null;

create table public.student_eligibility_history (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  previous_status text not null check (previous_status in ('unverified', 'eligible', 'ineligible')),
  new_status text not null check (new_status in ('unverified', 'eligible', 'ineligible')),
  reason text,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (previous_status <> new_status)
);

create index student_eligibility_history_student_idx
  on public.student_eligibility_history(student_id, changed_at desc);

alter table public.student_import_batches enable row level security;
alter table public.student_import_rows enable row level security;
alter table public.student_eligibility_history enable row level security;

revoke all on public.student_import_batches, public.student_import_rows,
  public.student_eligibility_history from anon, authenticated;
grant select on public.student_import_batches, public.student_import_rows,
  public.student_eligibility_history to authenticated;

create policy import_batches_staff_read
  on public.student_import_batches for select to authenticated
  using (
    private.has_role('system_administrator')
    or private.has_role('registration_officer')
  );

create policy import_rows_staff_read
  on public.student_import_rows for select to authenticated
  using (
    private.has_role('system_administrator')
    or private.has_role('registration_officer')
  );

create policy eligibility_history_staff_read
  on public.student_eligibility_history for select to authenticated
  using (
    private.has_role('system_administrator')
    or private.has_role('registration_officer')
    or private.has_role('sports_coordinator')
  );

-- Tighten student writes: coordinators retain read access but cannot change
-- official identity, academic status, house, or eligibility records.
drop policy if exists students_registration_write on public.students;
create policy students_registration_write
  on public.students for all to authenticated
  using (
    private.has_role('system_administrator')
    or private.has_role('registration_officer')
  )
  with check (
    private.has_role('system_administrator')
    or private.has_role('registration_officer')
  );

create or replace function private.prevent_import_ledger_mutation()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception '% is append-only after creation', tg_table_name using errcode = '42501';
end;
$$;

create or replace function private.write_student_audit_log()
returns trigger language plpgsql security definer
set search_path = pg_catalog
as $$
declare
  old_row jsonb := case when tg_op = 'INSERT' then null else jsonb_build_object(
    'house_id', old.house_id,
    'enrollment_status', old.enrollment_status,
    'eligibility_status', old.eligibility_status
  ) end;
  new_row jsonb := case when tg_op = 'DELETE' then null else jsonb_build_object(
    'house_id', new.house_id,
    'enrollment_status', new.enrollment_status,
    'eligibility_status', new.eligibility_status
  ) end;
begin
  insert into public.audit_logs(actor_id, action, table_name, record_id, old_data, new_data, request_id)
  values (
    auth.uid(), lower(tg_op), tg_table_name, coalesce(new.id, old.id),
    old_row, new_row,
    nullif(current_setting('request.headers', true), '')::jsonb->>'x-request-id'
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_students on public.students;
create trigger audit_students
  after insert or update or delete on public.students
  for each row execute function private.write_student_audit_log();

create or replace function private.guard_student_eligibility_update()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin
  if (
    old.eligibility_status is distinct from new.eligibility_status
    or old.eligibility_reason is distinct from new.eligibility_reason
    or old.eligibility_verified_by is distinct from new.eligibility_verified_by
    or old.eligibility_verified_at is distinct from new.eligibility_verified_at
  ) and current_setting('app.eligibility_change_authorized', true) is distinct from 'true'
  then
    raise exception 'eligibility must be changed through the verification workflow' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger student_eligibility_update_guard
  before update on public.students
  for each row execute function private.guard_student_eligibility_update();

create trigger eligibility_history_append_only
  before update or delete on public.student_eligibility_history
  for each row execute function private.prevent_import_ledger_mutation();

create or replace function public.stage_student_import(
  p_file_name text,
  p_file_type text,
  p_file_size_bytes bigint,
  p_file_sha256 text,
  p_column_mapping jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  batch_id uuid;
  row_count integer;
  valid_count integer;
begin
  if not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'student import role required' using errcode = '42501';
  end if;
  if p_file_type not in ('csv', 'xlsx') or p_file_size_bytes not between 1 and 5242880 then
    raise exception 'invalid import file metadata' using errcode = '22023';
  end if;
  if p_file_sha256 !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid import payload' using errcode = '22023';
  end if;

  row_count := jsonb_array_length(p_rows);
  if row_count < 1 or row_count > 5000 then
    raise exception 'import must contain between 1 and 5000 data rows' using errcode = '22023';
  end if;

  select count(*) into valid_count
  from jsonb_array_elements(p_rows) row_data
  where jsonb_typeof(row_data->'issues') = 'array'
    and jsonb_array_length(row_data->'issues') = 0;

  insert into public.student_import_batches (
    file_name, file_type, file_size_bytes, file_sha256, column_mapping,
    total_rows, valid_rows, invalid_rows, created_by
  ) values (
    left(trim(p_file_name), 255), p_file_type, p_file_size_bytes,
    p_file_sha256, p_column_mapping, row_count, valid_count,
    row_count - valid_count, auth.uid()
  ) returning id into batch_id;

  insert into public.student_import_rows (
    batch_id, row_number, student_number, legal_first_name, legal_last_name,
    other_names, enrollment_status, house_id, source_house,
    validation_status, issues
  )
  select
    batch_id,
    (row_data->>'row_number')::integer,
    nullif(trim(row_data->>'student_number'), ''),
    nullif(trim(row_data->>'legal_first_name'), ''),
    nullif(trim(row_data->>'legal_last_name'), ''),
    nullif(trim(row_data->>'other_names'), ''),
    nullif(row_data->>'enrollment_status', ''),
    nullif(row_data->>'house_id', '')::uuid,
    nullif(trim(row_data->>'source_house'), ''),
    case when jsonb_array_length(row_data->'issues') = 0 then 'valid' else 'invalid' end,
    row_data->'issues'
  from jsonb_array_elements(p_rows) row_data;

  return batch_id;
end;
$$;

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
  if batch_record.status <> 'staged' then raise exception 'import batch is no longer pending confirmation' using errcode = '55000'; end if;

  for import_row in
    select * from public.student_import_rows where batch_id = p_batch_id order by row_number
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
       or import_row.house_id is null
       or duplicate_count > 1
       or not exists (select 1 from public.houses h where h.id = import_row.house_id and h.is_active)
       or exists (select 1 from public.students s where lower(s.student_number) = lower(import_row.student_number))
    then
      update public.student_import_rows
      set validation_status = case
        when exists (select 1 from public.students s where lower(s.student_number) = lower(import_row.student_number)) then 'conflict'
        else 'rejected'
      end,
      issues = issues || case
        when duplicate_count > 1 then '["duplicate_in_file"]'::jsonb
        when exists (select 1 from public.students s where lower(s.student_number) = lower(import_row.student_number)) then '["student_number_exists"]'::jsonb
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

create or replace function public.verify_student_eligibility(
  p_student_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  prior_status text;
begin
  if not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'eligibility verification role required' using errcode = '42501';
  end if;
  if p_status not in ('unverified', 'eligible', 'ineligible') then
    raise exception 'invalid eligibility status' using errcode = '22023';
  end if;
  if p_status = 'ineligible' and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'an ineligibility reason is required' using errcode = '22023';
  end if;

  select eligibility_status into prior_status from public.students
  where id = p_student_id for update;
  if not found then raise exception 'student not found' using errcode = 'P0002'; end if;
  if prior_status = p_status then raise exception 'eligibility status is unchanged' using errcode = '22023'; end if;

  perform set_config('app.eligibility_change_authorized', 'true', true);
  update public.students
  set eligibility_status = p_status,
      eligibility_reason = nullif(trim(coalesce(p_reason, '')), ''),
      eligibility_verified_by = case when p_status = 'unverified' then null else auth.uid() end,
      eligibility_verified_at = case when p_status = 'unverified' then null else now() end
  where id = p_student_id;
  perform set_config('app.eligibility_change_authorized', 'false', true);

  insert into public.student_eligibility_history (
    student_id, previous_status, new_status, reason, changed_by
  ) values (p_student_id, prior_status, p_status, nullif(trim(coalesce(p_reason, '')), ''), auth.uid());
end;
$$;

create or replace function public.check_existing_student_numbers(p_numbers text[])
returns table(student_number text)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if not (private.has_role('system_administrator') or private.has_role('registration_officer')) then
    raise exception 'student import role required' using errcode = '42501';
  end if;
  return query select s.student_number
  from public.students s
  where lower(s.student_number) in (
      select lower(trim(candidate)) from unnest(p_numbers) candidate
    );
end;
$$;

revoke all on function public.stage_student_import(text, text, bigint, text, jsonb, jsonb) from public, anon;
revoke all on function public.commit_student_import(uuid) from public, anon;
revoke all on function public.verify_student_eligibility(uuid, text, text) from public, anon;
revoke all on function public.check_existing_student_numbers(text[]) from public, anon;
grant execute on function public.stage_student_import(text, text, bigint, text, jsonb, jsonb) to authenticated;
grant execute on function public.commit_student_import(uuid) to authenticated;
grant execute on function public.verify_student_eligibility(uuid, text, text) to authenticated;
grant execute on function public.check_existing_student_numbers(text[]) to authenticated;

create trigger audit_import_batches
  after insert or update on public.student_import_batches
  for each row execute function private.write_audit_log();

revoke all on function private.prevent_import_ledger_mutation() from public, anon, authenticated;
revoke all on function private.write_student_audit_log() from public, anon, authenticated;
revoke all on function private.guard_student_eligibility_update() from public, anon, authenticated;
