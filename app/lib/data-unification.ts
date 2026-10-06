export type SyncState =
  | "synced"
  | "different"
  | "missing_supabase"
  | "missing_bot"
  | "unavailable";

export type RentalSnapshot = {
  group_id: string;
  group_name: string | null;
  is_active: boolean;
  start_at: string | null;
  expire_at: string | null;
  updated_at?: string | null;
};

export type BootstrapDecision = {
  group_id: string;
  action: "insert" | "update" | "skip" | "conflict";
  reasons: string[];
  current: RentalSnapshot | null;
  proposed: RentalSnapshot;
};

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameInstant(left: string | null, right: string | null) {
  const leftDate = asDate(left);
  const rightDate = asDate(right);
  if (!leftDate || !rightDate) return left === right;
  return leftDate.getTime() === rightDate.getTime();
}

export function comparePresence(
  supabasePresent: boolean,
  botPresent: boolean,
): SyncState {
  if (supabasePresent && botPresent) return "synced";
  if (botPresent) return "missing_supabase";
  if (supabasePresent) return "missing_bot";
  return "unavailable";
}

export function compareValue(
  supabaseValue: string | number | boolean | null | undefined,
  botValue: string | number | boolean | null | undefined,
): SyncState {
  if (supabaseValue == null && botValue == null) return "unavailable";
  if (supabaseValue == null) return "missing_supabase";
  if (botValue == null) return "missing_bot";
  return supabaseValue === botValue ? "synced" : "different";
}

export function compareRental(
  supabaseRental: RentalSnapshot | null,
  botRental: RentalSnapshot | null,
): SyncState {
  const presence = comparePresence(Boolean(supabaseRental), Boolean(botRental));
  if (presence !== "synced" || !supabaseRental || !botRental) return presence;
  return supabaseRental.is_active === botRental.is_active &&
    sameInstant(supabaseRental.start_at, botRental.start_at) &&
    sameInstant(supabaseRental.expire_at, botRental.expire_at)
    ? "synced"
    : "different";
}

export function buildBootstrapDecision(
  bot: RentalSnapshot,
  current: RentalSnapshot | null,
): BootstrapDecision {
  const reasons: string[] = [];
  const botExpiry = asDate(bot.expire_at);
  const currentExpiry = asDate(current?.expire_at);
  const laterExpiry =
    currentExpiry && (!botExpiry || currentExpiry > botExpiry)
      ? current?.expire_at ?? null
      : bot.expire_at;

  if (!bot.group_id || !bot.group_name?.trim()) {
    reasons.push("metadata_bot_tidak_lengkap");
  }
  if (!current && (!bot.start_at || !bot.expire_at)) {
    reasons.push("periode_sewa_bot_tidak_lengkap");
  }
  if (currentExpiry && botExpiry && currentExpiry > botExpiry) {
    reasons.push("masa_sewa_supabase_lebih_panjang_dipertahankan");
  }

  const proposed: RentalSnapshot = {
    group_id: bot.group_id,
    group_name: bot.group_name?.trim() || current?.group_name || null,
    is_active: Boolean(current?.is_active || bot.is_active),
    start_at: current?.start_at || bot.start_at,
    expire_at: laterExpiry,
    updated_at: new Date().toISOString(),
  };

  const blockingReason = reasons.some((reason) =>
    ["metadata_bot_tidak_lengkap", "periode_sewa_bot_tidak_lengkap"].includes(reason),
  );
  if (blockingReason) {
    return { group_id: bot.group_id, action: "conflict", reasons, current, proposed };
  }

  if (!current) {
    return {
      group_id: bot.group_id,
      action: "insert",
      reasons: ["grup_belum_ada_di_supabase", ...reasons],
      current,
      proposed,
    };
  }

  const changed =
    current.group_name !== proposed.group_name ||
    current.is_active !== proposed.is_active ||
    !sameInstant(current.start_at, proposed.start_at) ||
    !sameInstant(current.expire_at, proposed.expire_at);

  return {
    group_id: bot.group_id,
    action: changed ? "update" : "skip",
    reasons: changed ? ["metadata_berbeda", ...reasons] : ["sudah_sinkron"],
    current,
    proposed,
  };
}

export function normalizeBotRental(value: unknown): RentalSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const groupId = String(row.group_id ?? row.id ?? "").trim();
  if (!groupId) return null;
  const rawActive = row.is_active ?? row.status ?? row.rental_status;
  const isActive =
    rawActive === true ||
    rawActive === 1 ||
    ["active", "aktif"].includes(String(rawActive ?? "").toLowerCase());

  return {
    group_id: groupId,
    group_name: String(row.group_name ?? row.name ?? "").trim() || null,
    is_active: isActive,
    start_at: typeof row.start_at === "string" ? row.start_at : null,
    expire_at:
      typeof (row.expire_at ?? row.expired_at) === "string"
        ? String(row.expire_at ?? row.expired_at)
        : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export function unwrapBotArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const row = value as Record<string, unknown>;
  if (Array.isArray(row.data)) return row.data;
  if (Array.isArray(row.groups)) return row.groups;
  return [];
}
