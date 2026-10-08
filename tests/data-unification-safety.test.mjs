import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const bootstrap = fs.readFileSync(
  "app/api/bot/group-bootstrap/route.ts",
  "utf8",
);
const health = fs.readFileSync("app/api/bot/sync-health/route.ts", "utf8");
const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");
const reconciliation = fs.readFileSync("app/api/bot/reconcile/route.ts", "utf8");

test("group bootstrap is dry-run by default and requires reviewed state", () => {
  assert.match(bootstrap, /mode:\s*"dry-run"/);
  assert.match(bootstrap, /process\.env\.PHASE_J_ALLOW_APPLY\s*===\s*"true"/);
  assert.match(bootstrap, /createHash\("sha256"\)/);
  assert.match(bootstrap, /body\.confirmation_token === expectedConfirmation/);
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

test("reconciliation is owner-only, fingerprinted, and provenance-backed", () => {
  assert.match(reconciliation, /authenticateOwner\(request\)/);
  assert.match(reconciliation, /deterministicUuid/);
  assert.match(reconciliation, /source_hash/);
  assert.match(reconciliation, /body\.confirmation_token !== expected/);
  assert.match(reconciliation, /from\("bot_data_mappings"\)/);
  assert.doesNotMatch(reconciliation, /\b(password|dashboard_tokens)\b/i);
  assert.doesNotMatch(reconciliation, /\.delete\(/i);
});
