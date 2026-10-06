import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bootstrap = fs.readFileSync(
  "app/api/bot/group-bootstrap/route.ts",
  "utf8",
);
const health = fs.readFileSync("app/api/bot/sync-health/route.ts", "utf8");
const dashboard = fs.readFileSync("app/components/dashboard-page.tsx", "utf8");

test("group bootstrap is dry-run by default and requires a server-only apply gate", () => {
  assert.match(bootstrap, /mode:\s*"dry-run"/);
  assert.match(bootstrap, /process\.env\.PHASE_J_ALLOW_APPLY\s*!==\s*"true"/);
  assert.doesNotMatch(bootstrap, /password\s*:/i);
  assert.doesNotMatch(bootstrap, /delete\s*\(/i);
  assert.match(bootstrap, /searchParams\.get\("group_id"\)/);
  assert.match(bootstrap, /item\.group_id === requestedGroupId/);
});

test("sync health returns aggregate diagnostics without protected fields", () => {
  assert.match(health, /authenticateOwner\(request\)/);
  assert.match(health, /canonical_source:\s*"supabase"/);
  assert.doesNotMatch(health, /select\([^)]*password/i);
  assert.doesNotMatch(health, /select\([^)]*token/i);
  assert.doesNotMatch(health, /select\([^)]*proof_image/i);
});

test("canonical dashboard mode suppresses legacy Bot writes", () => {
  assert.match(
    dashboard,
    /NEXT_PUBLIC_CANONICAL_DATA_SOURCE\s*===\s*"supabase"/,
  );
  assert.match(
    dashboard,
    /return !USE_CANONICAL_SUPABASE_DATA && Boolean\(botApiUrl\)/,
  );
  assert.match(dashboard, /if \(USE_CANONICAL_SUPABASE_DATA\) return supabaseItems/);
  assert.doesNotMatch(dashboard, /if \(botApiUrl(?:\s|\)|&&)/);
});
