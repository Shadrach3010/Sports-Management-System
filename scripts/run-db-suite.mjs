import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

const directory = new URL("../supabase/tests/database/", import.meta.url);
const files = readdirSync(directory).filter((name) => name.endsWith(".sql"));
let failed = 0;
for (const file of files) {
  const sql = readFileSync(new URL(file, directory), "utf8");
  if (!/\bbegin\s*;/i.test(sql) || !/rollback\s*;\s*$/i.test(sql)) {
    console.log(`${file}: skipped because it is not transaction-wrapped`);
    failed++;
    continue;
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query(sql);
    const lines = result.flatMap((item) =>
      item.rows.map((row) => Object.values(row)[0]),
    );
    const failedAssertions = lines.filter((line) =>
      /^not ok\b/.test(String(line)),
    );
    if (failedAssertions.length) {
      failed++;
      console.log(`${file}: ${failedAssertions.length} failed assertions`);
      for (const line of failedAssertions) console.log(`  ${line}`);
    } else {
      const passed = lines.filter((line) => /^ok\b/.test(String(line)));
      console.log(`${file}: ${passed.length} assertions passed`);
    }
  } catch (error) {
    failed++;
    console.log(
      `${file}: execution error ${error.code ?? ""} ${error.message}`,
    );
    await client.query("rollback").catch(() => {});
  } finally {
    await client.end().catch(() => {});
  }
}
console.log(`${files.length - failed}/${files.length} database suites passed`);
if (failed) process.exitCode = 1;
