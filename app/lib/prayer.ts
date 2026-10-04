export type PrayerKey = "subuh" | "dzuhur" | "ashar" | "maghrib" | "isya";

export type PrayerSchedule = Record<PrayerKey, string>;

export type PrayerSettingsLike = {
  group_id: string;
  location_name?: string | null;
  location_latitude?: number | string | null;
  location_longitude?: number | string | null;
  location_timezone?: string | null;
  prayer_enabled?: boolean | null;
  prayer_method?: number | string | null;
  prayer_subuh_enabled?: boolean | null;
  prayer_dzuhur_enabled?: boolean | null;
  prayer_ashar_enabled?: boolean | null;
  prayer_maghrib_enabled?: boolean | null;
  prayer_isya_enabled?: boolean | null;
  prayer_reminder_offset_minutes?: number | string | null;
  prayer_schedule_cache?: PrayerSchedule | null;
  prayer_schedule_cached_for?: string | null;
};

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

const ALADHAN_KEYS: Record<PrayerKey, string> = {
  subuh: "Fajr",
  dzuhur: "Dhuhr",
  ashar: "Asr",
  maghrib: "Maghrib",
  isya: "Isha",
};

export function getTimezoneLabel(timezone: string) {
  if (timezone === "Asia/Makassar") return "WITA";
  if (timezone === "Asia/Jayapura") return "WIT";
  return "WIB";
}

export function getDateInTimezone(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function getTimeInTimezone(timezone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function parseCoordinate(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCoordinatePair(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function normalizePrayerSchedule(timings: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(ALADHAN_KEYS).map(([key, apiKey]) => {
      const raw = String(timings[apiKey] ?? "");
      const time = raw.match(/\d{1,2}:\d{2}/)?.[0] ?? "";
      return [key, time.padStart(5, "0")];
    }),
  ) as PrayerSchedule;
}

export function getEnabledPrayerKeys(settings: PrayerSettingsLike) {
  return (Object.keys(PRAYER_LABELS) as PrayerKey[]).filter((key) => {
    const field = `prayer_${key}_enabled` as keyof PrayerSettingsLike;
    return settings[field] !== false;
  });
}

export function getNextPrayer(
  schedule: PrayerSchedule,
  settings: PrayerSettingsLike,
  now = new Date(),
) {
  const timezone = settings.location_timezone || "Asia/Jakarta";
  const current = getTimeInTimezone(timezone, now);
  const enabledKeys = getEnabledPrayerKeys(settings);
  const nextToday = enabledKeys
    .map((key) => ({ key, time: schedule[key] }))
    .filter((item) => item.time && item.time >= current)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  return nextToday ?? enabledKeys.map((key) => ({ key, time: schedule[key] })).filter((item) => item.time)[0] ?? null;
}

export function getMinutesUntil(time: string, timezone: string, now = new Date()) {
  const current = getTimeInTimezone(timezone, now);
  const [currentHour, currentMinute] = current.split(":").map(Number);
  const [targetHour, targetMinute] = time.split(":").map(Number);
  if (![currentHour, currentMinute, targetHour, targetMinute].every(Number.isFinite)) return null;

  const currentTotal = currentHour * 60 + currentMinute;
  const targetTotal = targetHour * 60 + targetMinute;
  const diff = targetTotal - currentTotal;
  return diff >= 0 ? diff : diff + 24 * 60;
}

export async function fetchPrayerSchedule({
  latitude,
  longitude,
  timezone,
  method,
  date = new Date(),
}: {
  latitude: number;
  longitude: number;
  timezone: string;
  method: number;
  date?: Date;
}) {
  const localDate = getDateInTimezone(timezone, date);
  const [year, month, day] = localDate.split("-");
  const apiDate = `${day}-${month}-${year}`;
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    method: String(method),
    timezonestring: timezone,
  });
  const response = await fetch(`https://api.aladhan.com/v1/timings/${apiDate}?${params}`, {
    next: { revalidate: 60 * 60 * 6 },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.data?.timings) {
    throw new Error("Jadwal azan tidak bisa diambil dari provider.");
  }

  return {
    date: localDate,
    schedule: normalizePrayerSchedule(data.data.timings as Record<string, unknown>),
  };
}
