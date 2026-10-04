import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrls, getServerBotToken } from "@/app/lib/bot-server-config";
import { createSupabaseAdminClient } from "@/app/lib/supabase-server";
import {
  PRAYER_LABELS,
  fetchPrayerSchedule,
  getDateInTimezone,
  getEnabledPrayerKeys,
  getTimeInTimezone,
  getTimezoneLabel,
  parseCoordinate,
  parseCoordinatePair,
  type PrayerKey,
  type PrayerSchedule,
  type PrayerSettingsLike,
} from "@/app/lib/prayer";

type SchedulerSettings = PrayerSettingsLike & {
  azan_location?: string | null;
  weather_location?: string | null;
};

function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function getCoordinates(settings: SchedulerSettings) {
  const latitude = parseCoordinate(settings.location_latitude);
  const longitude = parseCoordinate(settings.location_longitude);
  if (latitude !== null && longitude !== null) return { latitude, longitude };
  return parseCoordinatePair(settings.azan_location) ?? parseCoordinatePair(settings.weather_location);
}

function subtractMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number);
  if (![hour, minute].every(Number.isFinite)) return "";
  const total = (hour * 60 + minute - minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function buildPrayerMessage({
  prayer,
  time,
  offset,
  location,
  timezone,
}: {
  prayer: PrayerKey;
  time: string;
  offset: number;
  location: string;
  timezone: string;
}) {
  const label = PRAYER_LABELS[prayer];
  const timezoneLabel = getTimezoneLabel(timezone);

  if (offset > 0) {
    return `🕌 ${label} ${offset} Menit Lagi\n\nWaktu ${label} untuk wilayah ${location} diperkirakan pukul ${time} ${timezoneLabel}.`;
  }

  return `🕌 Waktu ${label}\n\nTelah masuk waktu ${label} untuk wilayah ${location} dan sekitarnya.\n\n${label}: ${time} ${timezoneLabel}\n\nSemoga ibadah kita diterima Allah SWT.`;
}

async function sendWhatsAppMessage(groupId: string, message: string) {
  const token = getServerBotToken();
  if (!token) return { ok: false, message: "BOT_API_TOKEN belum dikonfigurasi." };

  const payload = {
    group_id: groupId,
    type: "prayer_reminder",
    message,
  };

  for (const baseUrl of getServerBotApiUrls(BOT_API_URL)) {
    const root = baseUrl.replace(/\/$/, "");
    const endpoints = [
      `${root}/api/prayer/send`,
      `${root}/api/groups/${encodeURIComponent(groupId)}/prayer/send`,
      `${root}/api/groups/${encodeURIComponent(groupId)}/messages`,
      `${root}/send-message`,
      `${root}/send`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Group-Id": groupId,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok !== false) return { ok: true };
      } catch {
        continue;
      }
    }
  }

  return { ok: false, message: "Bot API tidak menerima pesan pengingat azan." };
}

async function resolveSchedule(settings: SchedulerSettings) {
  const timezone = settings.location_timezone || "Asia/Jakarta";
  const today = getDateInTimezone(timezone);
  if (settings.prayer_schedule_cached_for === today && settings.prayer_schedule_cache) {
    return {
      date: today,
      schedule: settings.prayer_schedule_cache as PrayerSchedule,
    };
  }

  const coordinates = getCoordinates(settings);
  if (!coordinates) throw new Error("Koordinat lokasi belum lengkap.");

  return fetchPrayerSchedule({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    timezone,
    method: Number(settings.prayer_method ?? 20),
  });
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  const botToken = getServerBotToken();

  if (!botToken || token !== botToken) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ ok: false, message: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("group_settings")
    .select("*")
    .eq("prayer_enabled", true);

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 200 });
  }

  const sent: Array<{ group_id: string; prayer: string; time: string }> = [];
  const skipped: Array<{ group_id: string; reason: string }> = [];
  const failed: Array<{ group_id: string; reason: string }> = [];

  for (const rawSettings of (data ?? []) as SchedulerSettings[]) {
    const settings = rawSettings;
    const timezone = settings.location_timezone || "Asia/Jakarta";
    const groupId = settings.group_id;

    try {
      const resolved = await resolveSchedule(settings);
      const nowTime = getTimeInTimezone(timezone);
      const offset = Number(settings.prayer_reminder_offset_minutes ?? 0);
      const location = settings.location_name || settings.azan_location || settings.weather_location || "lokasi grup";

      if (settings.prayer_schedule_cached_for !== resolved.date) {
        await supabase
          .from("group_settings")
          .update({
            prayer_schedule_cache: resolved.schedule,
            prayer_schedule_cached_for: resolved.date,
            prayer_schedule_cached_at: new Date().toISOString(),
            prayer_last_error: null,
          })
          .eq("group_id", groupId);
      }

      for (const prayer of getEnabledPrayerKeys(settings)) {
        const prayerTime = resolved.schedule[prayer];
        const dueTime = subtractMinutes(prayerTime, offset);
        if (dueTime !== nowTime) continue;

        const { data: existing } = await supabase
          .from("prayer_reminder_logs")
          .select("id")
          .eq("group_id", groupId)
          .eq("prayer_date", resolved.date)
          .eq("prayer_name", prayer)
          .eq("offset_minutes", offset)
          .eq("status", "sent")
          .maybeSingle();

        if (existing) continue;

        const message = buildPrayerMessage({
          prayer,
          time: prayerTime,
          offset,
          location,
          timezone,
        });
        const delivery = await sendWhatsAppMessage(groupId, message);
        if (!delivery.ok) {
          failed.push({ group_id: groupId, reason: delivery.message ?? "Gagal kirim WhatsApp" });
          continue;
        }

        const { error: logError } = await supabase.from("prayer_reminder_logs").insert({
          group_id: groupId,
          prayer_date: resolved.date,
          prayer_name: prayer,
          offset_minutes: offset,
          scheduled_time: prayerTime,
          sent_at: new Date().toISOString(),
          status: "sent",
        });

        if (!logError) {
          sent.push({ group_id: groupId, prayer, time: prayerTime });
        }
      }

      await supabase
        .from("group_settings")
        .update({
          prayer_last_check_at: new Date().toISOString(),
          prayer_last_error: null,
        })
        .eq("group_id", groupId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduler azan gagal.";
      failed.push({ group_id: groupId, reason: message });
      await supabase
        .from("group_settings")
        .update({
          prayer_last_check_at: new Date().toISOString(),
          prayer_last_error: message,
        })
        .eq("group_id", groupId);
    }
  }

  if (!sent.length && !failed.length) {
    skipped.push({ group_id: "*", reason: "Belum ada jadwal azan yang due pada menit ini." });
  }

  return Response.json({
    ok: true,
    checked: data?.length ?? 0,
    sent,
    failed,
    skipped,
    checkedAt: new Date().toISOString(),
  });
}
