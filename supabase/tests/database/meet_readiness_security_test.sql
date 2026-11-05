begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into public.houses(id,code,name) values
  ('e1000000-0000-4000-8000-000000000001','E1A','Event Readiness House');
insert into public.sports_meets(id,name,year,starts_on,ends_on,status,registration_opens_at,registration_closes_at)
values ('e2000000-0000-4000-8000-000000000001','Event Readiness Test Meet',
  extract(year from current_date + interval '20 days')::integer,
  current_date + 20,current_date + 22,'draft',now() - interval '1 day',now() + interval '10 days');
insert into public.meet_houses(sports_meet_id,house_id,added_by)
select 'e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001',id
from auth.users order by created_at limit 1;

select throws_ok(
  $$update public.sports_meets set status='registration_open',published_at=now() where id='e2000000-0000-4000-8000-000000000001'$$,
  '22023', 'create at least one event before opening registration',
  'an eventless meet cannot open registration'
);

insert into public.sport_categories(id,sports_meet_id,code,name,created_by)
select 'e3000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','TRACK','Track',id
from auth.users order by created_at limit 1;
insert into public.events(id,sports_meet_id,sport_category_id,code,name,event_type,format_code,maximum_participants_per_house,registration_status,starts_at,ends_at)
values ('e4000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001',
  'RUN','Run','individual','race',5,'closed',
  (current_date + 20) + time '10:00',(current_date + 20) + time '11:00');

select lives_ok(
  $$update public.sports_meets set status='registration_open',published_at=now() where id='e2000000-0000-4000-8000-000000000001'$$,
  'a complete meet can open registration'
);
select throws_ok(
  $$update public.sports_meets set status='draft',published_at=null where id='e2000000-0000-4000-8000-000000000001'$$,
  '55000', 'only an eventless, unscored meet can return to draft',
  'a meet with an event cannot return to draft'
);
select throws_ok(
  $$update public.events set status='check_in_open',roster_status='locked',roster_locked_at=now() where id='e4000000-0000-4000-8000-000000000001'$$,
  '55000', 'meet registration must be closed before event check-in opens',
  'event check-in cannot open while meet registration is still open'
);
select lives_ok(
  $$update public.sports_meets set status='registration_closed' where id='e2000000-0000-4000-8000-000000000001'$$,
  'registration can close after opening'
);
select lives_ok(
  $$update public.sports_meets set status='in_progress' where id='e2000000-0000-4000-8000-000000000001'$$,
  'the meet can progress after registration closes'
);
select throws_ok(
  $$update public.sports_meets set status='completed' where id='e2000000-0000-4000-8000-000000000001'$$,
  '55000', 'complete or cancel every event before completing the meet',
  'a meet with a scheduled event cannot be completed'
);
select lives_ok(
  $$update public.events set status='cancelled' where id='e4000000-0000-4000-8000-000000000001'$$,
  'a meet manager can cancel an unfinished event'
);
select lives_ok(
  $$update public.sports_meets set status='completed' where id='e2000000-0000-4000-8000-000000000001'$$,
  'a meet with only cancelled events can be completed'
);
select throws_ok(
  $$update public.events set status='scheduled' where id='e4000000-0000-4000-8000-000000000001'$$,
  '55000', 'event lifecycle is locked after meet closure',
  'a completed meet does not allow event lifecycle changes'
);

select * from finish();
rollback;
