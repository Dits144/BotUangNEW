import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const connectPage = fs.readFileSync("app/components/connect-page.tsx", "utf8");
const landingPage = fs.readFileSync("app/components/landing-page.tsx", "utf8");
const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");

test("connect page stays open for authenticated users adding another group", () => {
  assert.doesNotMatch(connectPage, /router\.replace\("\/dashboard"\)/);
  assert.match(landingPage, /<Link href="\/connect">/);
});

test("calendar matches the Fernly month and upcoming layout", () => {
  assert.match(dashboard, /calendarDays\.map/);
  assert.match(dashboard, /Hari Libur Mendatang/);
  assert.match(dashboard, /upcomingHolidays\.map/);
  assert.match(dashboard, /Tanggal terpilih/);
  assert.match(dashboard, /border-l-\[3px\] border-emerald-600/);
});

test("the requested upcoming 2026 and 2027 holidays are available", () => {
  for (const holiday of [
    "2026-12-25",
    "2027-01-01",
    "2027-01-05",
    "2027-02-06",
    "2027-03-08",
  ]) {
    assert.match(dashboard, new RegExp(holiday));
  }
});
