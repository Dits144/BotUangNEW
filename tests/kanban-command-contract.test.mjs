import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const todoCommand = fs.readFileSync("BotUang/commands/todo.js", "utf8");
const botEntry = fs.readFileSync("BotUang/index.js", "utf8");
const botHelp = fs.readFileSync("BotUang/commands/help.js", "utf8");
const dashboard = fs.readFileSync("app/components/fernly-dashboard.tsx", "utf8");

test("Kanban commands are parsed and routed by the active bot", () => {
  assert.match(todoCommand, /\^task\\\+\\s\+\(\.\+\)/);
  assert.match(todoCommand, /\^movetask\\s\+\(\\d\+\)@/);
  assert.match(todoCommand, /\[stage:/);
  assert.match(todoCommand, /\[due:/);
  assert.match(botEntry, /'task\+'/);
  assert.match(botEntry, /'movetask'/);
  assert.match(botEntry, /task\\\+/);
  assert.match(botEntry, /movetask\\s\+/);
});

test("Kanban commands stay visible in WhatsApp and dashboard help", () => {
  for (const source of [botHelp, dashboard]) {
    assert.match(source, /task\+ todo@20\/10\/2026@high@Judul/);
    assert.match(source, /movetask 2@review/);
  }
});

test("dashboard task metadata supports stage, due date, owner, and drag", () => {
  assert.match(dashboard, /function buildTaskText/);
  assert.match(dashboard, /due:\s*dueDate/);
  assert.match(dashboard, /owner:\s*assignee/);
  assert.match(dashboard, /onDragStart/);
  assert.match(dashboard, /onDrop/);
});

test("numeric bot task ids never reach Supabase UUID filters", () => {
  assert.match(dashboard, /function isUuid/);
  assert.match(dashboard, /isUuid\(todo\.id\)[\s\S]*?\.eq\("id", todo\.id\)/);
  assert.match(dashboard, /isUuid\(editTodo\.id\)[\s\S]*?\.eq\("id", editTodo\.id\)/);
  assert.match(dashboard, /Task bot belum dapat dipindahkan/);
});
