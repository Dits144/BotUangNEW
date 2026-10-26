import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadParserAt(instant, options = {}) {
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
  const evaluate = new Function("module", "exports", "require", "Date", "fetch", "process", js);
  evaluate(module, module.exports, require, FrozenDate, options.fetch ?? globalThis.fetch, { env: options.env ?? {} });
  return module.exports.POST;
}

async function parse(post, text) {
  const response = await post(new Request("http://localhost/api/ai/parse", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }),
  }));
  return response.json();
}

test("Indonesian thousands separator: 10.000 diartikan Rp10.000 bukan Rp10", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z"); // 25 Okt 03:00 WIB
  const result = await parse(post, "bayar konsumsi 10.000");
  assert.equal(result.ok, true);
  assert.equal(result.source, "local");
  assert.equal(result.intent.action, "transaction");
  assert.equal(result.intent.type, "expense");
  assert.equal(result.intent.amount, 10000);
});

test("Variasi nominal rupiah: 25k, 50rb, 1.5jt, Rp 150.000 diparse tepat dan instan", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");

  const r1 = await parse(post, "beli token listrik 100k");
  assert.equal(r1.intent.amount, 100000);
  assert.equal(r1.intent.type, "expense");
  assert.equal(r1.source, "local");

  const r2 = await parse(post, "masuk iuran kas 50rb dari radit");
  assert.equal(r2.intent.amount, 50000);
  assert.equal(r2.intent.type, "income");
  assert.equal(r2.source, "local");

  const r3 = await parse(post, "sewa tempat 1.5jt");
  assert.equal(r3.intent.amount, 1500000);
  assert.equal(r3.intent.type, "expense");
  assert.equal(r3.source, "local");

  const r4 = await parse(post, "pemasukan donasi Rp 250.000");
  assert.equal(r4.intent.amount, 250000);
  assert.equal(r4.intent.type, "income");
  assert.equal(r4.source, "local");
});

test("catat pengeluaran hari ini bernominal tetap transaksi, bukan query", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "catat pengeluaran 30rb hari ini");
  assert.equal(result.intent?.action, "transaction");
  assert.equal(result.intent?.amount, 30000);
});

test("Transaksi kemarin otomatis menghitung tanggal H-1 WIB", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z"); // 25 Okt 03:00 WIB
  const result = await parse(post, "kemarin beli bensin 30rb");
  assert.equal(result.intent.action, "transaction");
  assert.equal(result.intent.amount, 30000);
  assert.equal(result.intent.date, "2026-10-24");
});

test("Reminder ragam bahasa sehari-hari: jam pagi/siang/sore/malam terkonversi jam 24h", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z"); // 25 Okt 03:00 WIB

  const pagi = await parse(post, "ingatkan besok jam 8 pagi rapat pengurus");
  assert.equal(pagi.intent.action, "reminder");
  assert.equal(pagi.intent.remind_value, "2026-10-26T08:00:00+07:00");

  const siang = await parse(post, "ingatkan besok jam 2 siang kumpul panitia");
  assert.equal(siang.intent.action, "reminder");
  assert.equal(siang.intent.remind_value, "2026-10-26T14:00:00+07:00");

  const malam = await parse(post, "jangan lupa besok jam 8 malam evaluasi bulanan");
  assert.equal(malam.intent.action, "reminder");
  assert.equal(malam.intent.remind_value, "2026-10-26T20:00:00+07:00");
});

test("Tanya keuangan (query): cek saldo, rekap, total pengeluaran diproses lokal instan", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");

  const q1 = await parse(post, "sisa saldo kas berapa?");
  assert.equal(q1.intent.action, "query");
  assert.equal(q1.intent.query_type, "balance");
  assert.equal(q1.source, "local");

  const q2 = await parse(post, "rekap pengeluaran minggu ini");
  assert.equal(q2.intent.action, "query");
  assert.equal(q2.intent.query_type, "expense");
  assert.equal(q2.source, "local");
});

test("Gemini request dibatasi waktu dan tidak mencoba banyak model berurutan", () => {
  const source = fs.readFileSync("app/api/ai/transaction-parser/route.ts", "utf8");
  assert.match(source, /AbortSignal\.timeout\(/);
  assert.doesNotMatch(source, /for \(const model of getGeminiModels\(\)\)/);
  assert.match(source, /gemini-3\.5-flash-lite/);
});

test("AI cloud lambat dibatasi deadline dan hanya satu model dicoba", async () => {
  let attempts = 0;
  const post = loadParserAt("2026-10-24T20:00:00.000Z", {
    env: { GEMINI_API_KEY: "test-only" },
    fetch: async (_url, options) => {
      attempts += 1;
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("deadline")), 5200);
        options.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(options.signal.reason);
        }, { once: true });
      });
    },
  });
  const started = performance.now();
  const result = await parse(post, "atur sesuatu yang belum dipahami");
  assert.equal(attempts, 1);
  assert.ok(performance.now() - started < 5000);
  assert.equal(result.ok, false);
  assert.match(result.message, /waktu|coba|tersedia/i);
});

test("Gemini sekali sukses tetap menerima hasil, tanpa retry", async () => {
  let attempts = 0;
  const post = loadParserAt("2026-10-24T20:00:00.000Z", {
    env: { GEMINI_API_KEY: "test-only" },
    fetch: async () => {
      attempts += 1;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ action: "todo", todo_text: "Follow up pelanggan" }) }] } }] }), { status: 200 });
    },
  });
  const result = await parse(post, "follow up pelanggan nanti");
  assert.equal(attempts, 1);
  assert.equal(result.intent.action, "todo");
  assert.equal(result.source, "gemini");
});

test("kalimat tanpa nominal tidak diam-diam jadi transaksi karena angka tanggal atau jam", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "pertemuan tanggal 27 Oktober jam 10.30");
  assert.notEqual(result.intent?.action, "transaction");
});

test("jam pembayaran tanpa nominal bukan transaksi Rp10,30", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "bayar kas besok jam 10.30");
  assert.notEqual(result.intent?.action, "transaction");
});

test("tanggal pembayaran tanpa nominal tidak dianggap Rp27", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "bayar kas tanggal 27 Oktober");
  assert.notEqual(result.intent?.action, "transaction");
});

test("nominal sesudah tanggal tetap dikenali sebagai uang", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "bayar kas tanggal 27 Oktober 30rb");
  assert.equal(result.intent?.amount, 30000);
});

test("perintah belum dipahami tanpa key memberi umpan balik, bukan transaksi palsu", async () => {
  const post = loadParserAt("2026-10-24T20:00:00.000Z");
  const result = await parse(post, "tolong atur hal yang belum ada");
  assert.equal(result.ok, false);
  assert.match(result.message, /belum/i);
});
