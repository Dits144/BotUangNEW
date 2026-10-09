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
});

test("signup confirmation returns to production and reports active account", () => {
  assert.match(login, /https:\/\/www\.dashboardits\.tech/);
  assert.match(login, /emailRedirectTo: getEmailConfirmationRedirect\(\)/);
  assert.match(login, /exchangeCodeForSession/);
  assert.match(login, /Akun sudah aktif/);
  assert.match(login, /Kirim ulang email verifikasi/);
});
