import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ownerPage = fs.readFileSync("app/components/owner-dashboard-page.tsx", "utf8");
const ownerRoute = fs.readFileSync("app/api/bot/owner/route.ts", "utf8");
const botRoutes = fs.readFileSync("BotUang/api-routes.js", "utf8");

test("owner rental rows expose add reduce and remove actions", () => {
  assert.match(ownerPage, /Tambah Sewa/);
  assert.match(ownerPage, /Kurangi Sewa/);
  assert.match(ownerPage, /"Menghapus\.\.\." : "Hapus"/);
  assert.doesNotMatch(ownerPage, /Pilih Grup/);
  assert.doesNotMatch(ownerPage, />\s*Buka\s*</);
});

test("dashboard owner proxy supports reduce and remove rental actions", () => {
  assert.match(ownerRoute, /reduce: \{ path: "\/owner\/rentals\/reduce"/);
  assert.match(ownerRoute, /"remove-rental": \{ path: "\/owner\/rentals\/remove"/);
});

test("bot API reduces and removes rental records safely", () => {
  assert.match(botRoutes, /router\.post\('\/owner\/rentals\/reduce'/);
  assert.match(botRoutes, /currentExpire\.minus\(\{ days: daysToReduce \}\)/);
  assert.match(botRoutes, /router\.post\('\/owner\/rentals\/remove'/);
  assert.match(botRoutes, /DELETE FROM group_rentals WHERE group_id = \?/);
});

test("owner list only shows rental records and activation automatically re-adds them", () => {
  assert.match(botRoutes, /if \(!r && !includeUnrented\) continue/);
  assert.match(botRoutes, /fetchMergedGroups\(sock, \{ includeUnrented: true \}\)/);
  assert.match(botRoutes, /INSERT INTO group_rentals \(group_id, is_active, expire_at, updated_at\)/);
});
