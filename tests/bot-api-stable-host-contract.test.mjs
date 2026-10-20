import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const constants = fs.readFileSync("app/lib/constants.ts", "utf8");
const server = fs.readFileSync("app/lib/bot-server-config.ts", "utf8");
const resolver = fs.readFileSync("app/lib/bot-api.ts", "utf8");

// A browser cannot use stale temporary tunnel URLs, even when supplied in a link.
test("BotUang defaults to its stable public API and trusts that origin", () => {
  assert.match(constants, /DEFAULT_BOT_API_URL\s*=\s*"https:\/\/api\.dashboardits\.tech"/);
  assert.match(constants, /TRUSTED_BOT_API_ORIGINS\s*=\s*\[\s*DEFAULT_BOT_API_URL/);
  assert.doesNotMatch(constants, /trycloudflare\.com/);
});

test("the API resolver rejects outdated link origins instead of following them", () => {
  assert.match(resolver, /TRUSTED_BOT_API_ORIGINS\.includes\(origin\)/);
  assert.match(resolver, /return fallback/);
  assert.doesNotMatch(constants, /shoppers-rebates|expressions-bay/);
});

test("server-side API fallback does not retry temporary hostnames", () => {
  assert.match(server, /DEFAULT_BOT_API_URL/);
  assert.doesNotMatch(server, /trycloudflare\.com/);
});
