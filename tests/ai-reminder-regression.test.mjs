import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadParserAt(instant) {
  const source = fs.readFileSync("app/api/ai/transaction-parser/route.ts", "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const OriginalDate = globalThis.Date;
  class FrozenDate extends OriginalDate {
    constructor(...args) { super(...(args.length ? args : [instant])); }
    static now() { return new OriginalDate(instant).valueOf(); }
  }
  const evaluate = new Function("module", "exports", "require", "Date", js);
  evaluate(module, module.exports, require, FrozenDate);
  return module.exports.POST;
}

async function parse(post, text) {
  const response = await post(new Request("http://localhost/api/ai/parse", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }),
  }));
  return response.json();
}

test("25 Oktober pukul 03.00 WIB: besok acara jam 10.30 adalah reminder tanggal 26", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "besok ada acara jam 10.30");
  assert.equal(result.ok, true);
  assert.equal(result.intent.action, "reminder");
  assert.equal(result.intent.remind_type, "datetime");
  assert.equal(result.intent.remind_value, "2026-10-26T10:30:00+07:00");
  assert.match(result.intent.remind_text, /acara/i);
});

test("reminder eksplisit di jam dini hari memakai tanggal WIB dan bukan UTC", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "ingatkan besok jam 10.30 acara");
  assert.equal(result.intent.action, "reminder");
  assert.equal(result.intent.remind_value, "2026-10-26T10:30:00+07:00");
});

test("perintah bayar acara bernominal tetap transaksi", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "bayar acara 10 ribu besok jam 10.30");
  assert.equal(result.intent.action, "transaction");
});

test("nominal transaksi tetap diklasifikasi transaksi, bukan reminder", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "bayar konsumsi 10.000");
  assert.equal(result.intent.action, "transaction");
  assert.equal(result.intent.amount, 10000);
});
