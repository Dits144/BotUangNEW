import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve(
  "supabase/migrations/202610060001_fix_finance_crud_update_policies.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

test("finance CRUD policies never grant unconditional access", () => {
  assert.match(sql, /^\s*--[\s\S]*?\bbegin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /from pg_policies/i);
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /with\s+check\s*\(\s*true\s*\)/i);
});

for (const table of ["transactions", "todos", "reminders", "custom_commands"]) {
  test(`${table} policies bind authenticated users to matching groups`, () => {
    const tablePolicies = sql
      .split(/create policy/i)
      .filter((block) => block.includes(`public.${table}`))
      .join("\n");

    assert.match(tablePolicies, /to authenticated/i);
    assert.match(tablePolicies, /auth\.uid\(\) is not null/i);
    assert.match(tablePolicies, /access\.user_id\s*=\s*auth\.uid\(\)/i);
    assert.match(
      tablePolicies,
      new RegExp(`access\\.group_id\\s*=\\s*${table}\\.group_id`, "i"),
    );
    assert.match(tablePolicies, /for insert/i);
    assert.match(tablePolicies, /for select/i);
    assert.match(tablePolicies, /for update/i);
    assert.match(tablePolicies, /for delete/i);
  });
}
