import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");
const login = fs.readFileSync("app/components/login-page.tsx", "utf8");

test("overview project progress uses real task stages and a three-state gauge", () => {
  assert.match(dashboard, /project-pending-pattern/);
  assert.match(dashboard, /inProgressTodoCount/);
  assert.match(dashboard, /Pending \(\{pendingTodoCount\}\)/);
  assert.match(dashboard, /isAnimationActive=\{!reduceMotion\}/);
});

test("dashboard bell exposes rental expiry notifications", () => {
  assert.match(dashboard, /Masa aktif sewa tinggal \$\{days\} hari/);
  assert.match(dashboard, /days > 3/);
  assert.match(dashboard, /<SheetTitle>Notifikasi<\/SheetTitle>/);
  assert.match(dashboard, /botuang\.notification\.seen/);
  assert.match(dashboard, /rotate: \[0, -12, 10, -7, 5, 0\]/);
  assert.match(dashboard, /<FadeUp variant="compact" delay=\{0\.05\} className="mt-5">/);
});

test("overview project and member headers use compact Fernly actions", () => {
  assert.match(dashboard, /<Plus className="h-4 w-4" \/>\s+New/);
  assert.match(dashboard, /<Plus className="h-4 w-4" \/>\s+Add/);
  assert.doesNotMatch(dashboard, /Buka Board/);
  assert.doesNotMatch(dashboard, /Kelola Semua/);
});

test("signup confirmation returns to production and reports active account", () => {
  assert.match(login, /https:\/\/www\.dashboardits\.tech/);
  assert.match(login, /emailRedirectTo: getEmailConfirmationRedirect\(\)/);
  assert.match(login, /exchangeCodeForSession/);
  assert.match(login, /Akun sudah aktif/);
  assert.match(login, /Kirim ulang email verifikasi/);
});
