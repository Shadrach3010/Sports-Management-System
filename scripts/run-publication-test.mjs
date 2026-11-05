import { readFileSync } from "node:fs";
import pg from "pg";

const sql = readFileSync(
  new URL(
    "../supabase/tests/database/staff_provisioning_security_test.sql",
    import.meta.url,
  ),
  "utf8",
);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const results = await client.query(sql);
  const tap = results
    .flatMap((result) => result.rows ?? [])
    .map((row) => Object.values(row)[0])
    .filter((value) => typeof value === "string");
  const failed = tap.filter((line) => line.startsWith("not ok"));
  console.log(
    `pgTAP: ${tap.filter((line) => line.startsWith("ok ")).length} passed, ${failed.length} failed`,
  );
  if (failed.length) {
    console.log(failed.join("\n"));
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
