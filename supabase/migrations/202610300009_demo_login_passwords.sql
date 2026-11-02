-- Disposable mock credentials for the nine DEMO identities created by 008.
-- Never reuse these credentials for real staff accounts or production data.
begin;

do $$
declare matching_users integer;
declare conflicting_passwords integer;
begin
  select count(*) into matching_users
  from auth.users u
  join (values
    ('d5000000-0000-4000-8000-000000000001'::uuid,'admin@gmail.com'),
    ('d5000000-0000-4000-8000-000000000002'::uuid,'coordinator@gmail.com'),
    ('d5000000-0000-4000-8000-000000000003'::uuid,'registration@gmail.com'),
    ('d5000000-0000-4000-8000-000000000004'::uuid,'representative@gmail.com'),
    ('d5000000-0000-4000-8000-000000000005'::uuid,'checkin@gmail.com'),
    ('d5000000-0000-4000-8000-000000000006'::uuid,'judge@gmail.com'),
    ('d5000000-0000-4000-8000-000000000007'::uuid,'verifier@gmail.com'),
    ('d5000000-0000-4000-8000-000000000008'::uuid,'committee@gmail.com'),
    ('d5000000-0000-4000-8000-000000000009'::uuid,'viewer@gmail.com')
  ) expected(id,email) on expected.id=u.id and expected.email=u.email
  ;
  if matching_users <> 9 then
    raise exception 'Expected nine demo Auth users from migration 008; found % matching IDs and emails', matching_users;
  end if;
  select count(*) into conflicting_passwords
  from auth.users u join (values
    ('d5000000-0000-4000-8000-000000000001'::uuid,'admin123'),
    ('d5000000-0000-4000-8000-000000000002'::uuid,'coordinator123'),
    ('d5000000-0000-4000-8000-000000000003'::uuid,'register123'),
    ('d5000000-0000-4000-8000-000000000004'::uuid,'rep123'),
    ('d5000000-0000-4000-8000-000000000005'::uuid,'check123'),
    ('d5000000-0000-4000-8000-000000000006'::uuid,'judge123'),
    ('d5000000-0000-4000-8000-000000000007'::uuid,'verify123'),
    ('d5000000-0000-4000-8000-000000000008'::uuid,'commit123'),
    ('d5000000-0000-4000-8000-000000000009'::uuid,'view123')
  ) expected(id,password) on expected.id=u.id
  where coalesce(u.encrypted_password,'') <> ''
    and extensions.crypt(expected.password,u.encrypted_password) is distinct from u.encrypted_password;
  if conflicting_passwords > 0 then
    raise exception '% demo Auth users have a different password; refusing to overwrite them', conflicting_passwords;
  end if;
end;
$$;

with credentials(id,email,password) as (values
  ('d5000000-0000-4000-8000-000000000001'::uuid,'admin@gmail.com','admin123'),
  ('d5000000-0000-4000-8000-000000000002'::uuid,'coordinator@gmail.com','coordinator123'),
  ('d5000000-0000-4000-8000-000000000003'::uuid,'registration@gmail.com','register123'),
  ('d5000000-0000-4000-8000-000000000004'::uuid,'representative@gmail.com','rep123'),
  ('d5000000-0000-4000-8000-000000000005'::uuid,'checkin@gmail.com','check123'),
  ('d5000000-0000-4000-8000-000000000006'::uuid,'judge@gmail.com','judge123'),
  ('d5000000-0000-4000-8000-000000000007'::uuid,'verifier@gmail.com','verify123'),
  ('d5000000-0000-4000-8000-000000000008'::uuid,'committee@gmail.com','commit123'),
  ('d5000000-0000-4000-8000-000000000009'::uuid,'viewer@gmail.com','view123')
)
update auth.users u set
  instance_id='00000000-0000-0000-0000-000000000000'::uuid,
  aud='authenticated',
  role='authenticated',
  encrypted_password=extensions.crypt(c.password,extensions.gen_salt('bf')),
  email_confirmed_at=now(),
  raw_app_meta_data='{"provider":"email","providers":["email"]}'::jsonb,
  confirmation_token='', recovery_token='', email_change='',
  email_change_token_current='', email_change_token_new='',
  phone_change='', phone_change_token='', reauthentication_token='',
  updated_at=now()
from credentials c where u.id=c.id and u.email=c.email
  and coalesce(u.encrypted_password,'') = '';

insert into auth.identities(id,user_id,provider,provider_id,identity_data,created_at,updated_at)
select u.id,u.id,'email',u.id::text,
  jsonb_build_object('sub',u.id::text,'email',u.email),now(),now()
from auth.users u
where u.id::text like 'd5000000-0000-4000-8000-00000000000%'
on conflict do nothing;

commit;
