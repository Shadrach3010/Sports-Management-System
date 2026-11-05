-- Read-policy regression: a house representative can inspect assigned meet
-- and event records without recursive RLS evaluation.
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d5000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
begin
  if not exists (
    select 1 from public.sports_meets
    where id = 'd2000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'House representative cannot read the assigned demo meet';
  end if;
  if not exists (
    select 1 from public.events
    where id = 'd4000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'House representative cannot read the assigned demo event';
  end if;
end;
$$;
rollback;
