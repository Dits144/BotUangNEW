import { createSupabaseAdminClient, createSupabaseServerClient } from "@/app/lib/supabase-server";
import {
  fetchPrayerSchedule,
  getDateInTimezone,
  getMinutesUntil,
  getNextPrayer,
  getTimezoneLabel,
  parseCoordinate,
  parseCoordinatePair,
  type PrayerSettingsLike,
} from "@/app/lib/prayer";

function getAccessToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

function getCoordinates(settings: PrayerSettingsLike & { azan_location?: string | null; weather_location?: string | null }) {
  const latitude = parseCoordinate(settings.location_latitude);
  const longitude = parseCoordinate(settings.location_longitude);
  if (latitude !== null && longitude !== null) return { latitude, longitude };

  return parseCoordinatePair(settings.azan_location) ?? parseCoordinatePair(settings.weather_location);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("group_id") ?? "";
  const accessToken = getAccessToken(request);

  if (!groupId) {
    return Response.json({ ok: false, message: "Group ID tidak ditemukan" }, { status: 200 });
  }

  const supabase = createSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("group_settings")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, message: error.message }, { status: 200 });
  }

  const settings = data as (PrayerSettingsLike & {
    azan_location?: string | null;
    weather_location?: string | null;
    prayer_last_check_at?: string | null;
    prayer_last_error?: string | null;
  }) | null;

  if (!settings?.prayer_enabled) {
    return Response.json({
      ok: true,
      configured: false,
      status: "disabled",
      message: "Pengingat azan belum aktif.",
    });
  }

  const timezone = settings.location_timezone || "Asia/Jakarta";
  const coordinates = getCoordinates(settings);
  const locationName = settings.location_name || settings.azan_location || settings.weather_location || "";

  if (!coordinates) {
    return Response.json({
      ok: true,
      configured: false,
      status: "incomplete",
      message: "Koordinat lokasi azan belum lengkap.",
      location: locationName,
      timezone,
      timezoneLabel: getTimezoneLabel(timezone),
    });
  }

  try {
    const method = Number(settings.prayer_method ?? 20);
    const today = getDateInTimezone(timezone);
    const cached =
      settings.prayer_schedule_cached_for === today && settings.prayer_schedule_cache
        ? {
            date: today,
            schedule: settings.prayer_schedule_cache,
          }
        : null;
    const resolved = cached ?? await fetchPrayerSchedule({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezone,
      method: Number.isFinite(method) ? method : 20,
    });
    const nextPrayer = getNextPrayer(resolved.schedule, settings);
    const minutesUntil = nextPrayer
      ? getMinutesUntil(nextPrayer.time, timezone)
      : null;

    if (!cached) {
      const admin = createSupabaseAdminClient();
      await (admin ?? supabase)
        .from("group_settings")
        .update({
          prayer_schedule_cache: resolved.schedule,
          prayer_schedule_cached_for: resolved.date,
          prayer_schedule_cached_at: new Date().toISOString(),
          prayer_last_check_at: new Date().toISOString(),
          prayer_last_error: null,
        })
        .eq("group_id", groupId);
    }

    return Response.json({
      ok: true,
      configured: true,
      status: "active",
      location: locationName,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezone,
      timezoneLabel: getTimezoneLabel(timezone),
      schedule: resolved.schedule,
      scheduleDate: resolved.date,
      scheduleLoaded: true,
      nextPrayer: nextPrayer
        ? {
            key: nextPrayer.key,
            time: nextPrayer.time,
            minutesUntil,
          }
        : null,
      reminderOffsetMinutes: Number(settings.prayer_reminder_offset_minutes ?? 0),
      scheduler: "bot-backend",
      lastCheckAt: new Date().toISOString(),
      lastError: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Jadwal azan tidak tersedia.";
    const admin = createSupabaseAdminClient();
    await (admin ?? supabase)
      .from("group_settings")
      .update({
        prayer_last_check_at: new Date().toISOString(),
        prayer_last_error: message,
      })
      .eq("group_id", groupId);

    return Response.json({
      ok: true,
      configured: false,
      status: "error",
      message,
      location: locationName,
      timezone,
      timezoneLabel: getTimezoneLabel(timezone),
    });
  }
}
