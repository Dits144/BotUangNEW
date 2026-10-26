import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
const ts = createRequire(import.meta.url)("typescript");
function loadFunctions(code, names) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('USE_CANONICAL_SUPABASE_DATA', `${js}\nreturn { ${names.join(', ')} };`)(false);
}

const source = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");
const aiSave = source.slice(source.indexOf("  async function saveIntent()"), source.indexOf("  function updateIntent(", source.indexOf("  async function saveIntent()")));
const load = source.slice(source.indexOf("  async function loadData("), source.indexOf("  async function loadAccessibleGroups()"));
const aiParse = source.slice(source.indexOf("  async function parse(event?: FormEvent)"), source.indexOf("  async function saveIntent()"));

test("kegagalan jaringan AI selalu mengakhiri status loading dan memberi pesan", () => {
  assert.match(aiParse, /finally\s*\{\s*setLoading\(false\)/);
  assert.match(aiParse, /catch\s*\{/);
  assert.match(aiParse, /signal: AbortSignal\.timeout\(/);
});

test("AI reminder requires a successful bot write before reporting saved", () => {
  assert.match(aiSave, /if \(intent\.action === "reminder" && !botOk && shouldWriteLegacyBot\(\)\) \{/);
  assert.match(aiSave, /Reminder belum disimpan di bot WA/);
});

test("AI reminder list includes bot items and nonduplicate Supabase-only items", () => {
  assert.match(load, /mergeReminderLists\(botReminders, \(reminderResult\.data \?\? \[\]\) as Reminder\[\]\)/);
});

test("reminder schedule is validated before AI save", () => {
  assert.match(aiSave, /validateReminderSchedule\(/);
});

test("edited and manual datetime reminders produce ISO+WIB accepted by scheduler", () => {
  assert.match(source, /return `\$\{dateValue\}T\$\{timeValue\}:00\+07:00`/);
});

test("AI save uses only the canonical configured reminder destination", () => {
  assert.match(aiSave, /shouldWriteLegacyBot\(\)\s*\? \{ error: null \}/);
});

test("manual reminder save validates schedule before any write", () => {
  const add = source.slice(source.indexOf("  async function add(event: FormEvent)", source.indexOf("function ReminderScheduleFields")), source.indexOf("  async function remove(reminder: Reminder)"));
  assert.match(add, /validateReminderSchedule\(type, value\)/);
});

test("Supabase-only reminder is not marked as bot scheduled", () => {
  assert.match(aiSave, /Reminder tersimpan di dashboard, tetapi belum terjadwal di bot WA/);
});

test("AI ISO+WIB value populates both editable date and time fields", () => {
  const dateFunction = source.match(/function toDateInputValue\(value: string\) \{[\s\S]*?\n\}/)?.[0];
  const timeFunction = source.match(/function toTimeInputValue\(value: string\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(dateFunction && timeFunction);
  const helpers = loadFunctions(`${dateFunction}\n${timeFunction}`, ['toDateInputValue', 'toTimeInputValue']);
  const value = "2026-10-26T10:30:00+07:00";
  assert.equal(helpers.toDateInputValue(value), "2026-10-26");
  assert.equal(helpers.toTimeInputValue(value), "10:30");
});

test("reminder merge retains Supabase-only and deduplicates bot mirror", () => {
  const mergeFunction = source.match(/function mergeReminderLists\(botItems: Reminder\[\] \| null, supabaseItems: Reminder\[\]\): Reminder\[\] \{[\s\S]*?\n\}/)?.[0];
  assert.ok(mergeFunction);
  const { mergeReminderLists: merge } = loadFunctions(mergeFunction, ['mergeReminderLists']);
  const bot = { group_id: "g", remind_type: "datetime", remind_value: "2026-10-26T10:30:00+07:00", remind_text: "acara" };
  const onlyInSupabase = { ...bot, remind_text: "rapat" };
  assert.deepEqual(merge([bot], [bot, onlyInSupabase]), [bot, onlyInSupabase]);
});
