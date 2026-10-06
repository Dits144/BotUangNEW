import { createHash } from "node:crypto";
import { fetchBotOwnerResource } from "@/app/lib/bot-owner-data";
import { authenticateOwner } from "@/app/lib/owner-auth";

type SourceReminder = {
  id: number;
  group_id: string;
  remind_type: string;
  remind_value: string;
  remind_text: string;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

type SourceCommand = {
  id: number;
  group_id: string;
  keyword: string;
  response: string;
  media_path: string | null;
  media_url: string | null;
  media_type: string | null;
  caption_text: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

type SourceExport = {
  group_id?: string;
  reminders?: SourceReminder[];
  commands?: SourceCommand[];
};

type PlanEntry = {
  entity: "reminders" | "custom_commands";
  source_id: string;
  target_id: string;
  action: "import" | "map" | "skip" | "conflict";
  label: string;
  reason: string;
  source_hash: string;
  source_updated_at: string;
  source: SourceReminder | SourceCommand;
};

function deterministicUuid(entity: string, groupId: string, sourceId: string) {
  const hex = createHash("sha256")
    .update(`vps-sqlite:${entity}:${groupId}:${sourceId}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function publicPlan(plan: PlanEntry[]) {
  return plan.map(({ source: _source, ...entry }) => entry);
}

function fingerprint(plan: PlanEntry[]) {
  return createHash("sha256").update(JSON.stringify(publicPlan(plan))).digest("hex");
}

async function buildPlan(request: Request) {
  const auth = await authenticateOwner(request);
  if (!auth.ok) return { auth } as const;

  const groupId = new URL(request.url).searchParams.get("group_id")?.trim() ?? "";
  if (!groupId) {
    return { auth, error: { status: 400, message: "group_id wajib diisi" } } as const;
  }

  const sourceResult = await fetchBotOwnerResource(
    `reconciliation?group_id=${encodeURIComponent(groupId)}`,
  );
  if (!sourceResult.ok) {
    return {
      auth,
      error: { status: 503, message: sourceResult.message },
    } as const;
  }
  const source = (sourceResult.data ?? {}) as SourceExport;
  if (source.group_id !== groupId) {
    return {
      auth,
      error: { status: 409, message: "Group ID sumber tidak cocok" },
    } as const;
  }

  const [reminders, commands, mappings] = await Promise.all([
    auth.admin.from("reminders").select("*").eq("group_id", groupId),
    auth.admin.from("custom_commands").select("*").eq("group_id", groupId),
    auth.admin
      .from("bot_data_mappings")
      .select("entity,source_record_id,target_record_id")
      .eq("source_system", "vps-sqlite")
      .eq("group_id", groupId),
  ]);
  const databaseError = reminders.error ?? commands.error ?? mappings.error;
  if (databaseError) {
    return {
      auth,
      error: { status: 503, message: "Data rekonsiliasi Supabase tidak tersedia" },
    } as const;
  }

  const mapped = new Map(
    (mappings.data ?? []).map((row) => [
      `${row.entity}:${row.source_record_id}`,
      row.target_record_id,
    ]),
  );
  const reminderById = new Map((reminders.data ?? []).map((row) => [row.id, row]));
  const commandById = new Map((commands.data ?? []).map((row) => [row.id, row]));
  const activeCommandByKeyword = new Map(
    (commands.data ?? [])
      .filter((row) => !row.deleted_at)
      .map((row) => [String(row.keyword).trim().toLowerCase(), row]),
  );
  const plan: PlanEntry[] = [];

  for (const item of source.reminders ?? []) {
    const sourceId = String(item.id);
    const targetId = deterministicUuid("reminders", groupId, sourceId);
    const mappedId = mapped.get(`reminders:${sourceId}`);
    const existing = reminderById.get(targetId);
    plan.push({
      entity: "reminders",
      source_id: sourceId,
      target_id: targetId,
      action: mappedId ? "skip" : existing && !existing.deleted_at ? "map" : existing ? "conflict" : "import",
      label: item.remind_text,
      reason: mappedId
        ? "provenance_sudah_ada"
        : existing && !existing.deleted_at
          ? "target_deterministik_sudah_ada"
          : existing
            ? "target_pernah_dihapus"
            : "belum_ada_di_supabase",
      source_hash: createHash("sha256").update(JSON.stringify(item)).digest("hex"),
      source_updated_at: item.created_at,
      source: item,
    });
  }

  for (const item of source.commands ?? []) {
    const sourceId = String(item.id);
    const targetId = deterministicUuid("custom_commands", groupId, sourceId);
    const mappedId = mapped.get(`custom_commands:${sourceId}`);
    const existing = commandById.get(targetId);
    const keywordCollision = activeCommandByKeyword.get(item.keyword.trim().toLowerCase());
    const action = mappedId
      ? "skip"
      : keywordCollision && keywordCollision.id !== targetId
        ? "conflict"
        : existing && !existing.deleted_at
          ? "map"
          : existing
            ? "conflict"
            : "import";
    plan.push({
      entity: "custom_commands",
      source_id: sourceId,
      target_id: targetId,
      action,
      label: item.keyword,
      reason: mappedId
        ? "provenance_sudah_ada"
        : keywordCollision && keywordCollision.id !== targetId
          ? "keyword_aktif_sudah_ada"
          : existing && !existing.deleted_at
            ? "target_deterministik_sudah_ada"
            : existing
              ? "target_pernah_dihapus"
              : "belum_ada_di_supabase",
      source_hash: createHash("sha256").update(JSON.stringify(item)).digest("hex"),
      source_updated_at: item.updated_at ?? item.created_at,
      source: item,
    });
  }

  return { auth, groupId, plan } as const;
}

function errorResponse(result: Awaited<ReturnType<typeof buildPlan>>) {
  if (!result.auth.ok) {
    return Response.json(
      { ok: false, message: result.auth.message },
      { status: result.auth.status },
    );
  }
  if ("error" in result && result.error) {
    return Response.json(
      { ok: false, message: result.error.message },
      { status: result.error.status },
    );
  }
  return null;
}

export async function GET(request: Request) {
  const result = await buildPlan(request);
  const error = errorResponse(result);
  if (error) return error;
  if (!("plan" in result) || !result.plan) {
    return Response.json({ ok: false, message: "Rencana tidak tersedia" }, { status: 503 });
  }
  return Response.json({
    ok: true,
    mode: "dry-run",
    confirmation_token: fingerprint(result.plan),
    summary: {
      reminders: result.plan.filter((item) => item.entity === "reminders").length,
      commands: result.plan.filter((item) => item.entity === "custom_commands").length,
      conflicts: result.plan.filter((item) => item.action === "conflict").length,
    },
    plan: publicPlan(result.plan),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    apply?: boolean;
    confirmation_token?: string;
  };
  const result = await buildPlan(request);
  const error = errorResponse(result);
  if (error) return error;
  if (!("plan" in result) || !result.plan || !("groupId" in result)) {
    return Response.json({ ok: false, message: "Rencana tidak tersedia" }, { status: 503 });
  }

  const expected = fingerprint(result.plan);
  if (!body.apply || body.confirmation_token !== expected) {
    return Response.json(
      { ok: false, message: "Dry-run belum dikonfirmasi atau telah berubah" },
      { status: 409 },
    );
  }
  if (result.plan.some((item) => item.action === "conflict")) {
    return Response.json(
      { ok: false, message: "Rekonsiliasi memiliki konflik yang belum diselesaikan" },
      { status: 409 },
    );
  }

  const imports = result.plan.filter((item) => item.action === "import");
  const reminderRows = imports
    .filter((item) => item.entity === "reminders")
    .map((item) => {
      const source = item.source as SourceReminder;
      return {
        id: item.target_id,
        group_id: source.group_id,
        remind_type: source.remind_type,
        remind_value: source.remind_value,
        remind_text: source.remind_text,
        created_by: source.created_by,
        created_at: source.created_at,
        deleted_at: source.deleted_at,
      };
    });
  const commandRows = imports
    .filter((item) => item.entity === "custom_commands")
    .map((item) => {
      const source = item.source as SourceCommand;
      return {
        id: item.target_id,
        group_id: source.group_id,
        keyword: source.keyword,
        response: source.response,
        media_path: source.media_path,
        media_url: source.media_url,
        media_type: source.media_type,
        caption_text: source.caption_text,
        created_at: source.created_at,
        updated_at: source.updated_at,
        deleted_at: source.deleted_at,
      };
    });

  if (reminderRows.length) {
    const insert = await result.auth.admin.from("reminders").insert(reminderRows);
    if (insert.error) {
      return Response.json({ ok: false, message: "Import Reminder gagal" }, { status: 500 });
    }
  }
  if (commandRows.length) {
    const insert = await result.auth.admin.from("custom_commands").insert(commandRows);
    if (insert.error) {
      return Response.json({ ok: false, message: "Import Command gagal" }, { status: 500 });
    }
  }

  const mappingEntries = result.plan
    .filter((item) => item.action === "import" || item.action === "map")
    .map((item) => ({
      entity: item.entity,
      source_system: "vps-sqlite",
      source_record_id: item.source_id,
      target_record_id: item.target_id,
      group_id: result.groupId,
      source_updated_at:
        item.entity === "custom_commands"
          ? (item.source as SourceCommand).updated_at
          : (item.source as SourceReminder).created_at,
      synced_at: new Date().toISOString(),
    }));
  if (mappingEntries.length) {
    const mapping = await result.auth.admin
      .from("bot_data_mappings")
      .upsert(mappingEntries, { onConflict: "entity,source_system,source_record_id" });
    if (mapping.error) {
      return Response.json(
        { ok: false, message: "Data terimpor tetapi provenance mapping gagal" },
        { status: 500 },
      );
    }
  }

  return Response.json({
    ok: true,
    mode: "apply",
    imported_reminders: reminderRows.length,
    imported_commands: commandRows.length,
    mappings: mappingEntries.length,
  });
}
