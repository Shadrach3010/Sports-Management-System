import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";

const file = new URL(
  "../supabase/migrations/202611030013_custom_accounts_publication_guard.sql",
  import.meta.url,
);
const sql = readFileSync(file, "utf8")
  .replace(/^begin;\s*$/m, "")
  .replace(/^commit;\s*$/m, "");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  const applied = await client.query(
    "select to_regclass('private.student_publication_authorizations') as applied",
  );
  if (!applied.rows[0].applied) await client.query(sql);
  const { rows: admins } = await client.query(
    "select user_id from public.user_roles where role='system_administrator' limit 1",
  );
  const { rows: students } = await client.query(
    "select id from public.students limit 1",
  );
  assert(
    admins[0] && students[0],
    "Demo administrator and student are required",
  );
  const adminId = admins[0].user_id;
  const studentId = students[0].id;
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
    adminId,
  ]);
  await client.query(
    "select public.set_student_public_result_identity($1,$2,true)",
    [studentId, "Demo Public Athlete"],
  );
  console.log("authorized publication: passed");
  await client.query("savepoint direct_change");
  try {
    await client.query(
      "update public.students set public_results_name=$1 where id=$2",
      ["Bypass", studentId],
    );
    throw new Error("Direct publication update unexpectedly succeeded");
  } catch (error) {
    if (error.message === "Direct publication update unexpectedly succeeded")
      throw error;
    assert.equal(error.code, "42501");
    await client.query("rollback to savepoint direct_change");
    console.log("direct publication denied: passed");
  }
  await client.query("reset role");
  const { rows: created } = await client.query(
    "insert into public.users(email,display_name,password_hash) values($1,$2,extensions.crypt($3,extensions.gen_salt('bf',12))) returning id",
    [
      "migration-check@example.invalid",
      "Migration Check",
      "temporary-test-password",
    ],
  );
  await client.query(
    "insert into public.profiles(id,display_name) values($1,$2)",
    [created[0].id, "Migration Check"],
  );
  await client.query(
    "insert into public.user_roles(user_id,role,granted_by) values($1,'public_viewer',$2)",
    [created[0].id, adminId],
  );
  console.log("custom account and role creation: passed");

  const { rows: reps } = await client.query(
    "select user_id,house_id from public.user_roles where role='house_representative' and house_id is not null limit 1",
  );
  const { rows: eligible } = await client.query(
    "select id from public.students where house_id=$1 and eligibility_status='eligible' and enrollment_status='enrolled' limit 1",
    [reps[0]?.house_id],
  );
  const { rows: events } = await client.query(
    "select id,sports_meet_id from public.events where event_type='team' limit 1",
  );
  if (reps[0] && eligible[0] && events[0]) {
    await client.query(
      "update public.sports_meets set status='registration_open' where id=$1",
      [events[0].sports_meet_id],
    );
    await client.query(
      "update public.events set registration_status='open' where id=$1",
      [events[0].id],
    );
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [
      reps[0].user_id,
    ]);
    const team = await client.query(
      "select public.create_event_team($1,$2) id",
      [events[0].id, "Migration Check Team"],
    );
    await client.query(
      "select public.register_event_participant($1,$2,$3,false)",
      [events[0].id, eligible[0].id, team.rows[0].id],
    );
    console.log("team creation and eligible athlete registration: passed");
  } else {
    console.log(
      "registration dry-run: no matching demo representative/eligible athlete/team event",
    );
  }
} finally {
  await client.query("rollback");
  await client.end();
}
