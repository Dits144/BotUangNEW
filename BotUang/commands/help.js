/*
   help.js - Role-based help menu (V2)
   Roles: owner | admin | user
*/

const LINE = '━━━━━━━━━━━━━━━━━━';

const USER_SECTION = [
  LINE,
  '👤 *MENU USER (V2)* 👤',
  LINE,
  'ℹ️ role                 - Cek role Anda di grup',
  '📋 pt                   - Lihat list peserta',
  '📒 trx                  - Lihat riwayat transaksi',
  '🔍 trx 12               - Detail transaksi #12',
  '📊 laporan              - Ringkasan kas bulan berjalan',
  '📅 agenda               - Todo dan reminder aktif',
  '🧮 calc 10 + 5          - Kalkulator cepat',
  '🌤️ wthr                 - Cek cuaca lokasi grup',
  '📝 todo                 - Lihat daftar tugas',
  '⚡ cmd                  - Lihat keyword custom command',
].join('\n');

const ADMIN_SECTION = [
  '',
  LINE,
  '👮 *MENU ADMIN (V2)* 👮',
  LINE,
  '🌐 dash                 - Buka Web Dashboard',
  '💰 +500k Donasi         - Catat pemasukan',
  '💸 -75k Konsumsi        - Catat pengeluaran',
  '✏️ edittrx 12 +600k     - Edit transaksi #12',
  '🗑️ deltrx 12            - Hapus transaksi #12',
  '',
  '➕ addpt Budi@0812      - Tambah peserta',
  '✏️ editpt 12@Budi S    - Edit peserta #12',
  '🗑️ delpt 12             - Hapus peserta #12',
  '⚙️ sethead@Judul        - Atur header peserta',
  '',
  '📌 addcmd KEY@teks      - Buat custom command',
  '✏️ editcmd KEY@teks     - Update custom command',
  '🗑️ delcmd KEY           - Hapus custom command',
  '📄 cmd                  - Lihat semua command',
  '',
  '⚙️ typo on/off          - Koreksi typo perintah',
  '📊 cekbot               - Cek status sewa bot',
  '🔐 pin                  - Cek PIN dashboard',
  '🔐 newpin               - Generate PIN baru',
  '🔄 reset                - Reset data grup',
].join('\n');

const REMINDER_SECTION = [
  '',
  LINE,
  '⏰ *REMINDER (V2)* ⏰',
  LINE,
  '🔔 r 08:00@Rapat             - Reminder hari ini',
  '🔔 r besok 08:00@Rapat       - Reminder besok',
  '🔔 r selasa 08:00@Rapat      - Selasa terdekat',
  '🔔 r 20/08 08:00@Rapat       - Tanggal tertentu',
  '📜 rl                        - Lihat reminder aktif',
  '🗑️ delr 2                    - Hapus reminder #2',
  '',
  LINE,
  '📝 *TO-DO (V2)* 📝',
  LINE,
  '➕ todo+ Beli konsumsi       - Tambah tugas',
  '📋 todo                      - Lihat tugas',
  '✅ doto 2                    - Tandai selesai',
  '🗑️ deltodo 2                 - Hapus tugas',
].join('\n');

const KANBAN_SECTION = [
  '',
  LINE,
  '*KANBAN TASK*',
  LINE,
  'task+ todo@20/10/2026@high@Judul - Tambah task dengan stage dan due date',
  'movetask 2@review                  - Pindahkan task ke stage lain',
].join('\n');

const SERVICES_SECTION = [
  '',
  LINE,
  '📍 *DASHBOARD & LAYANAN* 📍',
  LINE,
  '🌐 dash                       - Link Dashboard grup',
  '📍 lokweather Bogor           - Set lokasi cuaca grup',
  '🌤️ wthr                       - Cek cuaca sesuai lokasi',
  '🕌 Pengingat Azan             - Atur di Dashboard > Setting > Location',
  '🧪 Test Azan                  - Dashboard > Setting > Kirim Test Reminder',
  '🚨 Peringatan Darurat         - Atur di Dashboard > Setting > Location',
  '🤖 AI Assistant               - Dashboard, catat transaksi/todo/reminder/command',
  '📊 Spreadsheet                - Dashboard > Setting > Group Settings',
  '💳 Request Perpanjangan       - Dashboard > Setting > Rental',
].join('\n');

const OWNER_SECTION = [
  '',
  LINE,
  '👑 *MENU OWNER (V2)* 👑',
  LINE,
  'ℹ️ #info (idgrup)            - Info detail grup',
  '✅ #on (idgrup) (hari)       - Aktifkan sewa grup',
  '⛔ #off (idgrup)              - Nonaktifkan sewa grup',
  '📊 #rent                     - Status seluruh sewa',
  '📢 #bc@pesan                 - Broadcast semua grup',
  '📢 #bcnomor 62xxx@pesan      - Broadcast nomor tertentu',
  '🩺 #server                   - Cek status server',
  '🔐 #backup                   - Backup database',
  '🚨 #resettotal               - Reset total dengan konfirmasi',
  '',
  LINE,
  '🧾 *OWNER DASHBOARD* 🧾',
  LINE,
  '💳 Kelola QRIS               - Dashboard > Owner',
  '✅ Approve Perpanjangan      - Dashboard > Owner > Rental Requests',
  '📦 Status semua grup         - Dashboard > Owner > Status Seluruh Sewa',
].join('\n');

const HEADER = [
  '🤖 *BOT KEUANGAN KEGIATAN V2*',
  LINE,
].join('\n');

function menuText(role = 'user') {
  if (role === 'owner') {
    return [
      HEADER,
      USER_SECTION,
      ADMIN_SECTION,
      REMINDER_SECTION,
      KANBAN_SECTION,
      SERVICES_SECTION,
      OWNER_SECTION,
    ].join('\n');
  }

  if (role === 'admin') {
    return [
      HEADER,
      USER_SECTION,
      ADMIN_SECTION,
      REMINDER_SECTION,
      KANBAN_SECTION,
      SERVICES_SECTION,
    ].join('\n');
  }

  return [HEADER, USER_SECTION, SERVICES_SECTION].join('\n');
}

function getHelpText() {
  return menuText('user');
}

module.exports = { menuText, getHelpText };
