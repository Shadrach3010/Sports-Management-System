import { readFileSync } from "node:fs";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const check = await client.query(
    "select to_regclass('private.student_publication_authorizations') as applied",
  );
  if (check.rows[0].applied) {
    console.log("Migration 013 already applied.");
  } else {
    const sql = readFileSync(
      new URL(
        "../supabase/migrations/202611030013_custom_accounts_publication_guard.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await client.query(sql);
    console.log("Migration 013 applied.");
  }
} finally {
  await client.end();
}
