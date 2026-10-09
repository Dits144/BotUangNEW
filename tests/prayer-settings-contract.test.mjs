import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");
const settingsRoute = fs.readFileSync("app/api/settings/route.ts", "utf8");
const prayerScheduler = fs.readFileSync("BotUang/utils/prayerScheduler.js", "utf8");
const botEntry = fs.readFileSync("BotUang/index.js", "utf8");

test("prayer activation persists settings before checking the schedule", () => {
  assert.match(dashboard, /async function persistSettings/);
  assert.match(dashboard, /prayerEnabledValue: true/);
  assert.match(dashboard, /Aktifkan & Cek Jadwal/);
  assert.match(dashboard, /fetchGroupSettings\(groupId, "PUT", payload\)/);
  assert.match(dashboard, /sharedLocationRef/);
  assert.match(dashboard, /Mengambil lokasi\.\.\./);
  assert.match(dashboard, /parseCoordinateInput/);
});

test("settings API authorizes group access and writes through the server client", () => {
  assert.match(settingsRoute, /getAuthorizedContext/);
  assert.match(settingsRoute, /platform_role/);
  assert.match(settingsRoute, /user_group_access/);
  assert.match(settingsRoute, /\.from\("group_settings"\)/);
  assert.match(settingsRoute, /\.upsert\(/);
  assert.match(settingsRoute, /legacyFields/);
  assert.match(settingsRoute, /isMissingSchemaField/);
});

test("bot starts the dashboard prayer scheduler on a fixed interval", () => {
  assert.match(prayerScheduler, /\/api\/prayer\/run/);
  assert.match(prayerScheduler, /60 \* 1000/);
  assert.match(prayerScheduler, /Authorization: `Bearer \$\{token\}`/);
  assert.match(botEntry, /startPrayerScheduler\(\)/);
});
