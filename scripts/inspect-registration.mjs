import pg from "pg";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result =
    await client.query(`select now() as database_now, m.name meet, m.status meet_status,
    m.registration_opens_at, m.registration_closes_at, e.name event,
    e.registration_status event_status, e.roster_status,
    now() between m.registration_opens_at and m.registration_closes_at as inside_window
    from public.events e join public.sports_meets m on m.id=e.sports_meet_id
    order by m.name,e.name`);
  console.log(JSON.stringify(result.rows));
  const judges = await client.query(`select e.name, e.status, eo.official_role,
    exists(select 1 from public.user_roles ur where ur.user_id=eo.user_id and ur.role='event_judge' and ur.event_id=e.id and (ur.expires_at is null or ur.expires_at>now())) as scoped_role
    from public.event_officials eo join public.events e on e.id=eo.event_id
    where eo.official_role='event_judge'`);
  console.log("judge assignments", JSON.stringify(judges.rows));
  const rosters =
    await client.query(`select s.status, e.name event, h.code house,
    (select count(*) from public.event_registrations r where r.event_id=s.event_id and r.house_id=s.house_id and r.status <> 'withdrawn') athletes
    from public.event_roster_submissions s join public.events e on e.id=s.event_id join public.houses h on h.id=s.house_id`);
  console.log("roster summaries", JSON.stringify(rosters.rows));
} finally {
  await client.end();
}
