import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve(
  "supabase/migrations/202610060002_data_unification_support.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

test("provenance mapping is unique and protected by RLS", () => {
  assert.match(sql, /^\s*--[\s\S]*\bbegin;/i);
  assert.match(sql, /commit;\s*$/i);
  assert.match(sql, /create table if not exists public\.bot_data_mappings/i);
  assert.match(sql, /unique\s*\(entity, source_system, source_record_id\)/i);
  assert.match(sql, /alter table public\.bot_data_mappings enable row level security/i);
  assert.doesNotMatch(sql, /create policy[\s\S]+bot_data_mappings/i);
});

test("command schema converges without destructive statements", () => {
  assert.match(sql, /add column if not exists updated_at timestamptz/i);
  assert.match(sql, /add column if not exists media_url text/i);
  assert.match(sql, /custom_commands_active_group_keyword_idx/i);
  assert.doesNotMatch(sql, /\b(drop table|truncate|delete from)\b/i);
});
