import { readFileSync } from "node:fs";
import pg from "pg";

const sql = readFileSync(
  new URL(
    "../supabase/tests/database/meet_readiness_security_test.sql",
    import.meta.url,
  ),
  "utf8",
);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(sql);
  const lines = result.flatMap((item) =>
    item.rows.map((row) => Object.values(row)[0]),
  );
  console.log(lines.join("\n"));
  if (lines.some((line) => /^not ok\b/.test(String(line))))
    process.exitCode = 1;
} finally {
  await client.end();
}
