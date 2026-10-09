import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const apiRoutes = fs.readFileSync("BotUang/api-routes.js", "utf8");
const botEntry = fs.readFileSync("BotUang/index.js", "utf8");
const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");

test("participants endpoint merges live WhatsApp members with tracked records", () => {
  assert.match(apiRoutes, /groupMetadata\(groupId\)/);
  assert.match(apiRoutes, /metadata\.participants/);
  assert.match(apiRoutes, /source: 'whatsapp'/);
  assert.match(apiRoutes, /trackedByNumber/);
});

test("bot remembers push names for participant display", () => {
  assert.match(botEntry, /botuangContactNames/);
  assert.match(botEntry, /botuangPhoneNumbers/);
  assert.match(botEntry, /whatsapp_member_profiles/);
  assert.match(botEntry, /cacheWhatsAppMemberProfile/);
  assert.match(apiRoutes, /sock\.botuangContactNames/);
  assert.match(apiRoutes, /sock\.botuangPhoneNumbers/);
  assert.match(apiRoutes, /formatWhatsAppDisplayName/);
});

test("dashboard shows WhatsApp roles and safely creates contribution profiles", () => {
  assert.match(dashboard, /function isWhatsappOnly/);
  assert.match(dashboard, /Profil kontribusi anggota disimpan/);
  assert.match(dashboard, /memberRole === "owner"/);
  assert.match(dashboard, /Anggota WhatsApp tidak dapat dihapus/);
});
