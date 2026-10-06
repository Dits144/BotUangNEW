import { fetchBotOwnerResource } from "@/app/lib/bot-owner-data";
import {
  comparePresence,
  compareRental,
  compareValue,
  normalizeBotRental,
  type RentalSnapshot,
  type SyncState,
  unwrapBotArray,
} from "@/app/lib/data-unification";
import { authenticateOwner } from "@/app/lib/owner-auth";

type CountMap = Map<string, number>;

function countByGroup(rows: Array<{ group_id?: string | null }>): CountMap {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.group_id) continue;
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return counts;
}

function botGroupStats(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, unknown>;
  const root = value as Record<string, unknown>;
  const nested = root.data && typeof root.data === "object"
    ? (root.data as Record<string, unknown>)
    : root;
  return nested.groups_stats && typeof nested.groups_stats === "object"
    ? (nested.groups_stats as Record<string, unknown>)
    : {};
}

function readBotCount(
  stats: Record<string, unknown>,
  groupId: string,
  field: "commands" | "reminders",
) {
  const group = stats[groupId];
  if (!group || typeof group !== "object") return null;
  const count = Number((group as Record<string, unknown>)[field]);
  return Number.isFinite(count) ? count : null;
}

function overallStatus(states: SyncState[]): SyncState {
  if (states.includes("different")) return "different";
  if (states.includes("missing_supabase")) return "missing_supabase";
  if (states.includes("missing_bot")) return "missing_bot";
  if (states.every((state) => state === "synced")) return "synced";
  return "unavailable";
}

export async function GET(request: Request) {
  const auth = await authenticateOwner(request);
  if (!auth.ok) {
    return Response.json(
      { ok: false, message: auth.message },
      { status: auth.status },
    );
  }

  const [rentals, accesses, reminders, commands, mappings, botGroups, botStats] =
    await Promise.all([
      auth.admin
        .from("group_rentals")
        .select("group_id,group_name,is_active,start_at,expire_at,updated_at"),
      auth.admin.from("user_group_access").select("group_id,group_name"),
      auth.admin.from("reminders").select("group_id").is("deleted_at", null),
      auth.admin
        .from("custom_commands")
        .select("group_id")
        .is("deleted_at", null),
      auth.admin
        .from("bot_data_mappings")
        .select("group_id,synced_at")
        .order("synced_at", { ascending: false })
        .limit(1000),
      fetchBotOwnerResource("groups"),
      fetchBotOwnerResource("db-stats"),
    ]);

  const databaseError =
    rentals.error ?? accesses.error ?? reminders.error ?? commands.error;
  if (databaseError) {
    return Response.json(
      { ok: false, message: "Data Supabase tidak dapat diperiksa" },
      { status: 503 },
    );
  }

  const rentalMap = new Map<string, RentalSnapshot>();
  for (const row of rentals.data ?? []) {
    rentalMap.set(row.group_id, {
      group_id: row.group_id,
      group_name: row.group_name,
      is_active: Boolean(row.is_active),
      start_at: row.start_at,
      expire_at: row.expire_at,
      updated_at: row.updated_at,
    });
  }

  const accessNames = new Map<string, string | null>();
  for (const row of accesses.data ?? []) {
    if (!accessNames.has(row.group_id)) accessNames.set(row.group_id, row.group_name);
  }

  const botRentalMap = new Map<string, RentalSnapshot>();
  if (botGroups.ok) {
    for (const raw of unwrapBotArray(botGroups.data)) {
      const normalized = normalizeBotRental(raw);
      if (normalized) botRentalMap.set(normalized.group_id, normalized);
    }
  }

  const latestSync = new Map<string, string>();
  if (!mappings.error) {
    for (const row of mappings.data ?? []) {
      if (!latestSync.has(row.group_id)) latestSync.set(row.group_id, row.synced_at);
    }
  }

  const reminderCounts = countByGroup(reminders.data ?? []);
  const commandCounts = countByGroup(commands.data ?? []);
  const stats = botStats.ok ? botGroupStats(botStats.data) : {};
  const groupIds = new Set([
    ...rentalMap.keys(),
    ...accessNames.keys(),
    ...botRentalMap.keys(),
  ]);

  const groups = Array.from(groupIds)
    .sort()
    .map((groupId) => {
      const supabaseRental = rentalMap.get(groupId) ?? null;
      const botRental = botRentalMap.get(groupId) ?? null;
      const supabasePresent = Boolean(supabaseRental || accessNames.has(groupId));
      const botPresent = Boolean(botRental);
      const supabaseName = supabaseRental?.group_name ?? accessNames.get(groupId) ?? null;
      const botName = botRental?.group_name ?? null;
      const botReminderCount = readBotCount(stats, groupId, "reminders");
      const botCommandCount = readBotCount(stats, groupId, "commands");
      const checks = {
        group: comparePresence(supabasePresent, botPresent),
        group_name: compareValue(supabaseName, botName),
        rental: compareRental(supabaseRental, botRental),
        reminders: compareValue(reminderCounts.get(groupId) ?? 0, botReminderCount),
        commands: compareValue(commandCounts.get(groupId) ?? 0, botCommandCount),
      };

      return {
        group_id: groupId,
        display_name: botName ?? supabaseName ?? "Grup WhatsApp",
        status: overallStatus(Object.values(checks)),
        supabase: {
          connected: supabasePresent,
          group_name: supabaseName,
          rental_active: supabaseRental?.is_active ?? null,
          rental_expire_at: supabaseRental?.expire_at ?? null,
          reminders: reminderCounts.get(groupId) ?? 0,
          commands: commandCounts.get(groupId) ?? 0,
        },
        bot_runtime: {
          connected: botPresent,
          group_name: botName,
          rental_active: botRental?.is_active ?? null,
          rental_expire_at: botRental?.expire_at ?? null,
          reminders: botReminderCount,
          commands: botCommandCount,
        },
        checks,
        latest_sync_at: latestSync.get(groupId) ?? null,
      };
    });

  return Response.json({
    ok: true,
    canonical_source: "supabase",
    bot_runtime_available: botGroups.ok,
    provenance_available: !mappings.error,
    groups,
  });
}
