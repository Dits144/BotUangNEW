'use strict';

const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { TIMEZONE } = require('../config');
const { formatRupiah } = require('../utils/format');

function monthlyReport(ctx) {
  if (!/^(laporan|report)$/i.test(ctx.text.trim())) return null;

  const now = DateTime.now().setZone(TIMEZONE);
  const start = now.startOf('month').toISO();
  const end = now.plus({ months: 1 }).startOf('month').toISO();
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
      COUNT(*) AS total
    FROM transactions
    WHERE group_id = ?
      AND deleted_at IS NULL
      AND datetime(created_at) >= datetime(?)
      AND datetime(created_at) < datetime(?)
  `).get(ctx.groupId, start, end);

  const income = Number(totals?.income || 0);
  const expense = Number(totals?.expense || 0);
  const balance = income - expense;

  return [
    `*LAPORAN KAS - ${now.setLocale('id').toFormat('LLLL yyyy').toUpperCase()}*`,
    '',
    `Pemasukan: +Rp ${formatRupiah(income)}`,
    `Pengeluaran: -Rp ${formatRupiah(expense)}`,
    `Saldo: Rp ${formatRupiah(balance)}`,
    `Transaksi: ${Number(totals?.total || 0)}`,
  ].join('\n');
}

function agenda(ctx) {
  if (!/^agenda$/i.test(ctx.text.trim())) return null;

  const todos = db.prepare(`
    SELECT todo_text
    FROM todos
    WHERE group_id = ? AND deleted_at IS NULL AND COALESCE(is_done, 0) = 0
    ORDER BY id ASC
    LIMIT 5
  `).all(ctx.groupId);
  const reminders = db.prepare(`
    SELECT remind_value, remind_text
    FROM reminders
    WHERE group_id = ? AND deleted_at IS NULL
    ORDER BY id ASC
    LIMIT 5
  `).all(ctx.groupId);

  if (!todos.length && !reminders.length) {
    return '*AGENDA GRUP*\n\nBelum ada todo atau reminder aktif.';
  }

  const lines = ['*AGENDA GRUP*'];
  if (todos.length) {
    lines.push('', '*Todo aktif*');
    todos.forEach((item, index) => lines.push(`${index + 1}. ${item.todo_text}`));
  }
  if (reminders.length) {
    lines.push('', '*Reminder aktif*');
    reminders.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.remind_value} - ${item.remind_text}`);
    });
  }
  return lines.join('\n');
}

function handleInsights(ctx) {
  return monthlyReport(ctx) || agenda(ctx);
}

module.exports = { handleInsights, monthlyReport, agenda };
