'use strict';

let schedulerStarted = false;
let schedulerTimer = null;
let requestRunning = false;

function getSchedulerConfig() {
  const dashboardUrl = (
    process.env.DASHBOARD_URL ||
    'https://www.dashboardits.tech'
  ).replace(/\/$/, '');
  const token = process.env.BOT_API_TOKEN || process.env.LOVABLE_API_KEY || '';
  return { dashboardUrl, token };
}

async function runPrayerScheduler() {
  if (requestRunning) return;
  const { dashboardUrl, token } = getSchedulerConfig();
  if (!token) {
    console.error('[PrayerScheduler] BOT_API_TOKEN/LOVABLE_API_KEY belum dikonfigurasi.');
    return;
  }

  requestRunning = true;
  try {
    const response = await fetch(`${dashboardUrl}/api/prayer/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok === false) {
      throw new Error(result.message || `HTTP ${response.status}`);
    }
    if (result.sent?.length) {
      console.log(`[PrayerScheduler] ${result.sent.length} pengingat azan terkirim.`);
    }
    if (result.failed?.length) {
      console.error('[PrayerScheduler] Gagal:', result.failed);
    }
  } catch (error) {
    console.error('[PrayerScheduler]', error.message);
  } finally {
    requestRunning = false;
  }
}

function startPrayerScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const intervalMs = 60 * 1000;
  const delayToBoundary = intervalMs - (Date.now() % intervalMs);
  setTimeout(() => {
    void runPrayerScheduler();
    schedulerTimer = setInterval(() => void runPrayerScheduler(), intervalMs);
    schedulerTimer.unref?.();
  }, delayToBoundary).unref?.();

  console.log('[PrayerScheduler] Scheduler started (every 60 sec)');
}

module.exports = {
  runPrayerScheduler,
  startPrayerScheduler
};
