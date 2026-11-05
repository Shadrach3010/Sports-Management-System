import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(`
    select m.id, m.name, m.year, m.status, m.starts_on, m.ends_on,
      count(distinct mh.house_id) filter (where mh.is_active) as active_houses,
      count(distinct c.id) as categories,
      count(distinct e.id) as events,
      count(distinct sr.id) as scoring_rules,
      m.standings_status
    from public.sports_meets m
    left join public.meet_houses mh on mh.sports_meet_id = m.id
    left join public.sport_categories c on c.sports_meet_id = m.id
    left join public.events e on e.sports_meet_id = m.id
    left join public.scoring_rules sr on sr.sports_meet_id = m.id
    group by m.id order by m.created_at desc
  `);
  console.log(JSON.stringify(result.rows));
} finally {
  await client.end();
}
