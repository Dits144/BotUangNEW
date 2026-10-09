'use strict';
require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

/* ── lazy-load baileys (ESM) ── */
let makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion,
    DisconnectReason, downloadContentFromMessage;

const pino    = require('pino');
const qrcode  = require('qrcode-terminal');
const { DateTime } = require('luxon');

const { OWNER_NUMBERS, AUTH_DIR, LOG_LEVEL, TIMEZONE } = require('./config');
const { db, getOwnerNumbers, isRentalActive } = require('./db/database');
const { normalizeJid, getSenderJid, isOwner }  = require('./utils/jid');
const { menuText }       = require('./commands/help');
const { handleCalc }     = require('./commands/calc');
const { handleInsights } = require('./commands/insights');
const finance            = require('./commands/finance');
const participants       = require('./commands/participants');
const customCommands     = require('./commands/customCommands');
const reminder           = require('./commands/reminder');
const todo               = require('./commands/todo');
const weather            = require('./commands/weather');
const { handleOwnerCommand }  = require('./commands/owner');
const { shouldWarnExpiring, handleCekSewa, handlePinCommand } = require('./commands/rental');
const { suggestCommand } = require('./utils/typo');
const { handleClearAll } = require('./commands/adminTools');
const { infoGroup }      = require('./commands/info');
const { startApi }       = require('./api');
const { startPrayerScheduler } = require('./utils/prayerScheduler');

/* ── Pending confirmation sessions (yes/cancel) ── */
let session;
try { session = require('./utils/session'); } catch (_) { session = null; }

/* ── Cooldown map ── */
const cooldown = new Map();

/* ── V2 Command candidates for typo suggestion ── */
const COMMAND_CANDIDATES = [
  // V2 short commands
  'trx','edittrx','deltrx','pt','addpt','editpt','delpt','sethead',
  'r','rl','delr','todo','todo+','task+','movetask','doto','deltodo',
  'cmd','addcmd','editcmd','delcmd','dash','cekbot','pin','newpin',
  'role','calc','wthr','typo','laporan','report','agenda',
  // V1 aliases kept
  'riwayat','listpeserta','saldo','addpeserta','updatepeserta','delpeserta',
  'setheader','command','updatecommand','delcommand','listcommand',
  'remind','listremind','noremind','todolist','dasbor','ceksewa','setpin',
  'menu','help','clearall','reset','edit','hapus','detail'
];

/* ── Helpers ── */
function getText(msg) {
  const c = msg.message;
  return c?.conversation || c?.extendedTextMessage?.text ||
         c?.imageMessage?.caption || c?.videoMessage?.caption || '';
}

function isAdmin(participantsMeta, senderId) {
  const sender = normalizeJid(senderId);
  const p = participantsMeta.find(x => normalizeJid(x.id) === sender);
  return Boolean(p?.admin);
}

function isSenderOwner(senderJid, altJid) {
  const list = [...OWNER_NUMBERS, ...getOwnerNumbers()];
  if (isOwner(senderJid, list)) return true;
  if (altJid && isOwner(altJid, list)) return true;
  return false;
}

function inCooldown(senderId, key, ms = 1000) {
  const now = Date.now();
  const k   = `${senderId}::${key}`;
  if (now - (cooldown.get(k) || 0) < ms) return true;
  cooldown.set(k, now);
  return false;
}

async function streamToBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function extractCommandMedia(msg, text) {
  if (!/^(command|addcmd)\s+/i.test(text)) return null;
  const mediaDir = path.join(process.cwd(), 'media', 'commands');
  fs.mkdirSync(mediaDir, { recursive: true });
  if (msg.message?.imageMessage) {
    const buf = await streamToBuffer(msg.message.imageMessage, 'image');
    const fp  = path.join(mediaDir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`);
    fs.writeFileSync(fp, buf);
    return { type: 'image', path: fp };
  }
  const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted?.imageMessage) {
    const buf = await streamToBuffer(quoted.imageMessage, 'image');
    const fp  = path.join(mediaDir, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`);
    fs.writeFileSync(fp, buf);
    return { type: 'image', path: fp };
  }
  return null;
}

/* ── Rental warning scheduler ── */
let warningSchedulerStarted = false;
let activeWarningSock       = null;

function startRentalWarningScheduler(sock) {
  activeWarningSock = sock;
  if (warningSchedulerStarted) return;
  warningSchedulerStarted = true;
  async function checkAllGroups() {
    if (!activeWarningSock) return;
    const groups = db.prepare('SELECT group_id FROM group_rentals WHERE is_active=1').all();
    for (const g of groups) {
      try {
        const warn = shouldWarnExpiring(g.group_id);
        if (warn) await activeWarningSock.sendMessage(g.group_id, { text: warn });
      } catch (e) { console.error('[RentalWarn]', g.group_id, e.message); }
    }
  }
  setInterval(() => checkAllGroups().catch(console.error), 30 * 60 * 1000);
  setTimeout(()  => checkAllGroups().catch(console.error), 5000);
  console.log('[RentalWarn] Scheduler started (every 30 min)');
}

/* ══════════════════════════════════════════
   MAIN BOT START
═══════════════════════════════════════════ */
async function start() {
  /* Dynamic import baileys (ESM) */
  const baileys = await import('baileys');
  makeWASocket              = baileys.default || baileys.makeWASocket;
  useMultiFileAuthState     = baileys.useMultiFileAuthState;
  fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
  DisconnectReason          = baileys.DisconnectReason;
  downloadContentFromMessage= baileys.downloadContentFromMessage;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version }          = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version, auth: state, printQRInTerminal: true,
    logger: pino({ level: LOG_LEVEL })
  });

  reminder.startReminderWorker(sock);
  startRentalWarningScheduler(sock);
  startPrayerScheduler();
  startApi(sock);

  /* Lovable heartbeat */
  const { sendHeartbeat, syncGroup } = require('./utils/lovableApi');
  if (!global.heartbeatIntervalStarted) {
    global.heartbeatIntervalStarted = true;
    setInterval(() => sendHeartbeat(true).catch(() => {}), 60000);
  }
  sendHeartbeat(true).catch(() => {});

  /* Sync groups to Lovable on startup */
  setTimeout(async () => {
    try {
      const groups = db.prepare('SELECT group_id FROM group_rentals WHERE is_active=1').all();
      let synced = 0;
      for (const g of groups) {
        try {
          const meta = await sock.groupMetadata(g.group_id);
          await syncGroup(g.group_id, meta.subject || g.group_id);
          synced++;
        } catch (_) {}
      }
      if (synced > 0) console.log(`[Lovable Sync] Berhasil sinkronisasi ${synced} grup ke Dashboard.`);
    } catch (e) { console.error('[Lovable Sync]', e.message); }
  }, 5000);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📱 Scan QR berikut di WhatsApp (Linked Devices):');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open')  console.log('✅ Bot V2 connected');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) start().catch(console.error);
    }
  });

  /* ══════════════════════════════════════
     MESSAGE HANDLER
  ═══════════════════════════════════════ */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text      = getText(msg).trim();
    if (!text) return;

    const groupId   = msg.key.remoteJid;
    const isGroup   = groupId.endsWith('@g.us');
    if (!isGroup) return;

    const senderId   = normalizeJid(getSenderJid(msg));
    const senderName = msg.pushName || 'Tanpa Nama';

    try {
      /* ── Determine roles ── */
      const altSenderId  = msg.key?.participantAlt || msg.key?.remoteJidAlt || '';
      const senderIsOwner = isSenderOwner(senderId, altSenderId);

      const meta          = await sock.groupMetadata(groupId);
      const senderIsAdmin = senderIsOwner || isAdmin(meta.participants, senderId);
      const canManage     = senderIsAdmin; // owner implies admin

      /* ── Pending confirmation session (yes/cancel) ── */
      if (session) {
        const pending = session.getPending(senderId, groupId);
        if (pending) {
          if (/^yes$/i.test(text)) {
            session.clear(senderId, groupId);
            const result = await pending.action();
            if (result) await sock.sendMessage(groupId, { text: result }, { quoted: msg });
          } else {
            session.clear(senderId, groupId);
            await sock.sendMessage(groupId, { text: '❌ Dibatalkan.' }, { quoted: msg });
          }
          return;
        }
      }

      /* ── Owner commands (#prefix) ── */
      if (/^#/.test(text) || /^brdcs\s+/i.test(text)) {
        if (!senderIsOwner) return;
        const resp = await handleOwnerCommand({ sock, text, groupId, senderId, isGroupMessage: isGroup });
        if (resp) await sock.sendMessage(groupId, { text: resp }, { quoted: msg });
        return;
      }

      /* ── Role info ── */
      if (/^role$/i.test(text) || /^rolesaya$/i.test(text)) {
        const role = senderIsOwner ? '👑 *Owner Bot*' : senderIsAdmin ? '👮 *Admin Grup*' : '👤 *User biasa*';
        await sock.sendMessage(groupId, { text: `Halo ${senderName},\nRole Anda: ${role}` }, { quoted: msg });
        return;
      }

      /* ── Rental guard ── */
      const isDash = /^(dash|dasbor)$/i.test(text);
      if (!isRentalActive(groupId) && !isDash) {
        if (/^(menu|help)$/i.test(text) && senderIsOwner) {
          await sock.sendMessage(groupId, { text: menuText('owner') }, { quoted: msg });
        }
        return;
      }

      /* ─────────────────────────────────────────
         DASHBOARD / DASBOR
      ───────────────────────────────────────── */
      if (isDash) {
        if (!canManage) {
          await sock.sendMessage(groupId, { text: '❌ Hanya admin yang bisa mengakses dashboard.' }, { quoted: msg });
          return;
        }
        const token     = crypto.randomBytes(8).toString('hex');
        const expiresAt = DateTime.now().setZone(TIMEZONE).plus({ hours: 24 }).toISO();
        db.prepare('INSERT INTO dashboard_tokens (token, group_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
          .run(token, groupId, DateTime.now().setZone(TIMEZONE).toISO(), expiresAt);
        const webUrl = process.env.LOVABLE_API_URL || 'https://dashboardits.tech';
        const link   = `${webUrl}/connect?group_id=${encodeURIComponent(groupId)}&token=${encodeURIComponent(token)}`;
        await sock.sendMessage(groupId, {
          text: `🔐 *Akses Web Dashboard V2*\n\nLink berlaku 24 jam:\n${link}`
        }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         TYPO TOGGLE
      ───────────────────────────────────────── */
      if (/^typo\s+(on|off)$/i.test(text)) {
        if (!canManage) {
          await sock.sendMessage(groupId, { text: '❌ Hanya admin yang bisa mengatur typo.' }, { quoted: msg });
          return;
        }
        const val = /on/i.test(text) ? 1 : 0;
        const now = DateTime.now().setZone(TIMEZONE).toISO();
        db.prepare('INSERT INTO group_settings (group_id, typo_enabled, updated_at) VALUES (?, ?, ?) ON CONFLICT(group_id) DO UPDATE SET typo_enabled=excluded.typo_enabled, updated_at=excluded.updated_at')
          .run(groupId, val, now);
        await sock.sendMessage(groupId, { text: `✅ Typo suggestion: *${val ? 'ON' : 'OFF'}*` }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         MENU / HELP
      ───────────────────────────────────────── */
      if (/^(menu|help)$/i.test(text)) {
        const role = senderIsOwner ? 'owner' : senderIsAdmin ? 'admin' : 'user';
        await sock.sendMessage(groupId, { text: menuText(role) }, { quoted: msg });
        return;
      }

      const ctx = { text, groupId, senderId, senderName, userRole: senderIsOwner ? 'owner' : senderIsAdmin ? 'admin' : 'user' };

      if (/^(laporan|report|agenda)$/i.test(text)) {
        const res = handleInsights(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         FINANCE COMMANDS (V2 + V1 aliases)
         +500k, -75k, trx, edittrx, deltrx
         saldo, riwayat, edit, hapus, detail (V1)
      ───────────────────────────────────────── */
      if (/^[+-]\s*\d/.test(text) || /^inputtransaksi\s+/i.test(text)) {
        if (!canManage) {
          await sock.sendMessage(groupId, { text: '❌ Hanya admin yang bisa mencatat transaksi.' }, { quoted: msg });
          return;
        }
        const res = await finance.recordTransaction(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^trx(\s+\d+)?$/i.test(text) || /^(riwayat|saldo|detail\s+\d+)(\s|$)/i.test(text)) {
        const res = await finance.riwayat(ctx) || await finance.saldo(ctx) || await finance.detail(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(edittrx|edit)\s+/i.test(text)) {
        if (!canManage) {
          await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg });
          return;
        }
        const res = await finance.edit(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(deltrx|hapus)\s+\d+$/i.test(text)) {
        if (!canManage) {
          await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg });
          return;
        }
        const res = await finance.remove(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         PARTICIPANTS (V2: pt/addpt/editpt/delpt/sethead)
         Legacy: listpeserta/addpeserta/updatepeserta/delpeserta/setheader
      ───────────────────────────────────────── */
      if (/^(sethead|setheader)\s*@/i.test(text)) {
        const res = participants.handleSetHeader(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(pt|listpeserta)(\s+\d+)?$/i.test(text)) {
        const res = participants.handleListPeserta(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^\d+$/.test(text)) {
        const res = participants.handleNumericDetail(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(addpt|addpeserta)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = participants.handleAddPeserta(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(delpt|delpeserta)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = participants.handleDeletePeserta(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(editpt|updatepeserta)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = participants.handleUpdatePeserta(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         REMINDER (V2: r, rl, delr)
         Legacy: remind, listremind, noremind
      ───────────────────────────────────────── */
      if (/^(r\s+|remind\s+)/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = reminder.handleRemind(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(rl|listremind)$/i.test(text)) {
        const res = reminder.handleListRemind(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(delr|noremind)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = reminder.handleNoRemind(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         TO-DO (V2: todo, todo+, task+, movetask, doto, deltodo)
         Legacy: todolist
      ───────────────────────────────────────── */
      if (/^(todo\+|task\+|movetask\s+|todo\s+(?!lihat)|todolist\s+.+)/i.test(text) || /^(todo|task)\+\s*/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = todo.handleTodo(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(todo|todolist)$/i.test(text) || /^todo\s+lihat$/i.test(text)) {
        const res = todo.handleTodo(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(doto)\s+\d+$/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = todo.handleTodo(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(deltodo)\s+\d+$/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = todo.handleTodo(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         CUSTOM COMMANDS (V2: cmd/addcmd/editcmd/delcmd)
         Legacy: listcommand, command, updatecommand, delcommand, detailcommand
      ───────────────────────────────────────── */
      if (/^(addcmd|command)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const commandMedia = await extractCommandMedia(msg, text);
        const res = await customCommands.handleSaveCommand({ ...ctx, commandMedia }, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(editcmd|updatecommand|update\s+command)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = customCommands.handleSaveCommand(ctx, canManage); // editcmd treated as update
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(delcmd|delcommand)\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = customCommands.handleDeleteCommand(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(cmd|listcommand)$/i.test(text)) {
        const res = customCommands.handleListCommand(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^detailcommand\s+/i.test(text)) {
        const res = customCommands.handleDetailCommand(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         RENTAL / PIN / BOT STATUS
      ───────────────────────────────────────── */
      if (/^(cekbot|ceksewa|cekaktif)$/i.test(text)) {
        const res = handleCekSewa(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^(pin|setpin)$/i.test(text) || /^setpin\s+/i.test(text)) {
        const res = handlePinCommand(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^newpin$/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = handlePinCommand(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         WEATHER
      ───────────────────────────────────────── */
      if (/^(wthr|weather|cuaca)$/i.test(text)) {
        const res = await weather.handleWeather(ctx);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      if (/^lokweather\s+/i.test(text)) {
        if (!canManage) { await sock.sendMessage(groupId, { text: '❌ Hanya admin.' }, { quoted: msg }); return; }
        const res = weather.handleSetLocation(ctx, canManage);
        if (res) await sock.sendMessage(groupId, { text: res }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         CALC
      ───────────────────────────────────────── */
      const calcRes = handleCalc(text);
      if (calcRes) {
        await sock.sendMessage(groupId, { text: calcRes }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         CLEAR ALL
      ───────────────────────────────────────── */
      const clearRes = handleClearAll(ctx, canManage, [
        finance.clearGroupCache, participants.clearGroupCache, todo.clearGroupCache
      ]);
      if (clearRes) {
        await sock.sendMessage(groupId, { text: clearRes }, { quoted: msg });
        return;
      }

      /* ─────────────────────────────────────────
         AUTO RESPONSE (custom keyword)
      ───────────────────────────────────────── */
      const autoResp = customCommands.handleAutoResponse(ctx);
      if (autoResp) {
        if (autoResp.type === 'image') {
          await sock.sendMessage(groupId, { image: autoResp.buffer, caption: autoResp.caption }, { quoted: msg });
        } else if (autoResp.type === 'video') {
          await sock.sendMessage(groupId, { video: autoResp.buffer, caption: autoResp.caption }, { quoted: msg });
        } else if (autoResp.type === 'audio') {
          await sock.sendMessage(groupId, { audio: autoResp.buffer, mimetype: autoResp.mimetype }, { quoted: msg });
        } else {
          await sock.sendMessage(groupId, { text: autoResp.text }, { quoted: msg });
        }
        return;
      }

      /* ─────────────────────────────────────────
         TYPO SUGGESTION
      ───────────────────────────────────────── */
      const settings    = db.prepare('SELECT typo_enabled FROM group_settings WHERE group_id=?').get(groupId);
      const typoEnabled = settings?.typo_enabled !== undefined ? settings.typo_enabled : 1;
      if (typoEnabled) {
        const suggest = suggestCommand(text, COMMAND_CANDIDATES);
        if (suggest) {
          await sock.sendMessage(groupId, {
            text: `❓ Perintah tidak dikenali.\n\nMaksud Anda: *${suggest}*?`
          }, { quoted: msg });
        }
      }

    } catch (err) {
      console.error('[Handler Error]', err);
      await sock.sendMessage(groupId, { text: '⚠️ Terjadi error saat memproses perintah.' }, { quoted: msg });
    }
  });
}

start().catch(console.error);
