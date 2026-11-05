import { readFileSync } from "node:fs";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const check = await client.query(
    "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='deleted_at') applied",
  );
  if (check.rows[0].applied) console.log("Migration 014 already applied.");
  else {
    await client.query(
      readFileSync(
        new URL(
          "../supabase/migrations/202611030014_staff_account_lifecycle.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    console.log("Migration 014 applied.");
  }
} finally {
  await client.end();
}
