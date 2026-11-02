-- Explicit demo fixtures for reviewing all nine CSMIS roles.
-- These Auth placeholders receive mock passwords and email identities in 009.
-- Replace them with real, invited staff accounts before operational use.
begin;

insert into public.houses(id,code,name,official_color) values
('d1000000-0000-4000-8000-000000000001','DEV-BLUE','Demo Blue House','#2563EB'),
('d1000000-0000-4000-8000-000000000002','DEV-GOLD','Demo Gold House','#EAB308'),
('d1000000-0000-4000-8000-000000000003','DEV-RED','Demo Red House','#DC2626')
on conflict (id) do nothing;

insert into public.sports_meets(id,name,year,starts_on,ends_on,registration_opens_at,registration_closes_at,status)
values('d2000000-0000-4000-8000-000000000001','CSMIS Demo Sports Meet 2026',2026,
  '2026-11-20','2026-11-21','2026-11-01T08:00:00Z','2026-11-18T18:00:00Z','draft')
on conflict (id) do nothing;

insert into auth.users(id,email,raw_user_meta_data) values
('d5000000-0000-4000-8000-000000000001','admin@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000002','coordinator@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000003','registration@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000004','representative@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000005','checkin@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000006','judge@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000007','verifier@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000008','committee@gmail.com','{}'::jsonb),
('d5000000-0000-4000-8000-000000000009','viewer@gmail.com','{}'::jsonb)
on conflict (id) do nothing;

insert into public.sport_categories(id,sports_meet_id,code,name,created_by)
values('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',
  'DEV-TRACK','Demo Track & Field','d5000000-0000-4000-8000-000000000001')
on conflict (id) do nothing;

insert into public.meet_houses(sports_meet_id,house_id,added_by) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','d5000000-0000-4000-8000-000000000001'),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000003','d5000000-0000-4000-8000-000000000001')
on conflict (sports_meet_id,house_id) do nothing;

insert into public.events(id,sports_meet_id,sport_category_id,code,name,event_type,format_code,starts_at,ends_at)
values('d4000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001','DEV-100','Demo 100 Metres','individual','race',
  '2026-11-20T10:00:00Z','2026-11-20T11:00:00Z')
on conflict (id) do nothing;

insert into public.events(id,sports_meet_id,sport_category_id,code,name,event_type,
  minimum_team_size,maximum_team_size,format_code,starts_at,ends_at)
values('d4000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001',
  'd3000000-0000-4000-8000-000000000001','DEV-RELAY','Demo Relay','team',4,4,'relay',
  '2026-11-20T11:30:00Z','2026-11-20T12:30:00Z')
on conflict (id) do nothing;

insert into public.profiles(id,display_name) values
('d5000000-0000-4000-8000-000000000001','Demo System Administrator'),
('d5000000-0000-4000-8000-000000000002','Demo Sports Coordinator'),
('d5000000-0000-4000-8000-000000000003','Demo Registration Officer'),
('d5000000-0000-4000-8000-000000000004','Demo House Representative'),
('d5000000-0000-4000-8000-000000000005','Demo Check-in Officer'),
('d5000000-0000-4000-8000-000000000006','Demo Event Judge'),
('d5000000-0000-4000-8000-000000000007','Demo Results Verifier'),
('d5000000-0000-4000-8000-000000000008','Demo Protest Committee'),
('d5000000-0000-4000-8000-000000000009','Demo Public Viewer')
on conflict (id) do nothing;

insert into public.user_roles(user_id,role,house_id,event_id,granted_by) values
('d5000000-0000-4000-8000-000000000001','system_administrator',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000002','sports_coordinator',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000003','registration_officer',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000004','house_representative','d1000000-0000-4000-8000-000000000001',null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000005','check_in_officer',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000006','event_judge',null,'d4000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000007','results_verifier',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000008','protest_committee',null,null,'d5000000-0000-4000-8000-000000000001'),
('d5000000-0000-4000-8000-000000000009','public_viewer',null,null,'d5000000-0000-4000-8000-000000000001')
on conflict (user_id,role,house_id,event_id) do nothing;

insert into public.event_officials(event_id,user_id,official_role,assigned_by) values
('d4000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000005',
 'check_in_officer','d5000000-0000-4000-8000-000000000001'),
('d4000000-0000-4000-8000-000000000001','d5000000-0000-4000-8000-000000000006',
 'event_judge','d5000000-0000-4000-8000-000000000001')
on conflict (event_id,user_id,official_role) do nothing;

commit;
