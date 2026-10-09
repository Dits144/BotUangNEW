import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");

test("calendar keeps reminders visible on dates that also contain holidays", () => {
  assert.match(dashboard, /dayReminders\.slice\(0, 2\)\.map/);
  assert.doesNotMatch(dashboard, /!holiday \? dayReminders/);
  assert.match(dashboard, /aria-label=\{`\$\{dayReminders\.length\} reminder`\}/);
});

test("reminder list can focus its date without squeezing the calendar at 1366px", () => {
  assert.match(dashboard, /function focusReminder\(reminder: Reminder\)/);
  assert.match(dashboard, /onClick=\{\(\) => focusReminder\(reminder\)\}/);
  assert.match(dashboard, /xl:col-span-2 min-\[1440px\]:col-span-1/);
});
