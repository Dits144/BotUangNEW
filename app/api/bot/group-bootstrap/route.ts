import { fetchBotOwnerResource } from "@/app/lib/bot-owner-data";
import {
  buildBootstrapDecision,
  normalizeBotRental,
  type RentalSnapshot,
  unwrapBotArray,
} from "@/app/lib/data-unification";
import { authenticateOwner } from "@/app/lib/owner-auth";

async function buildPlan(request: Request) {
  const auth = await authenticateOwner(request);
  if (!auth.ok) return { auth } as const;

  const [botGroups, rentals] = await Promise.all([
    fetchBotOwnerResource("groups"),
    auth.admin
      .from("group_rentals")
      .select("group_id,group_name,is_active,start_at,expire_at,updated_at"),
  ]);

  if (!botGroups.ok) {
    return {
      auth,
      error: { message: botGroups.message, status: 503 as const },
    } as const;
  }
  if (rentals.error) {
    return {
      auth,
      error: { message: "Data sewa Supabase tidak dapat dibaca", status: 503 as const },
    } as const;
  }

  const current = new Map<string, RentalSnapshot>();
  for (const row of rentals.data ?? []) {
    current.set(row.group_id, {
      group_id: row.group_id,
      group_name: row.group_name,
      is_active: Boolean(row.is_active),
      start_at: row.start_at,
      expire_at: row.expire_at,
      updated_at: row.updated_at,
    });
  }

  const botRentals = unwrapBotArray(botGroups.data)
    .map(normalizeBotRental)
    .filter((item): item is RentalSnapshot => Boolean(item));
  const plan = botRentals.map((rental) =>
    buildBootstrapDecision(rental, current.get(rental.group_id) ?? null),
  );

  return { auth, plan } as const;
}

export async function GET(request: Request) {
  const result = await buildPlan(request);
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
  if (!result.plan) {
    return Response.json(
      { ok: false, message: "Rencana bootstrap tidak tersedia" },
      { status: 503 },
    );
  }

  return Response.json({
    ok: true,
    mode: "dry-run",
    apply_enabled: process.env.PHASE_J_ALLOW_APPLY === "true",
    plan: result.plan,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { apply?: boolean };
  const result = await buildPlan(request);
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
  if (!result.plan) {
    return Response.json(
      { ok: false, message: "Rencana bootstrap tidak tersedia" },
      { status: 503 },
    );
  }
  if (!body.apply) {
    return Response.json({ ok: true, mode: "dry-run", plan: result.plan });
  }
  if (process.env.PHASE_J_ALLOW_APPLY !== "true") {
    return Response.json(
      {
        ok: false,
        message: "Apply bootstrap dinonaktifkan sampai migrasi Supabase disetujui",
        plan: result.plan,
      },
      { status: 409 },
    );
  }

  const actionable = result.plan.filter(
    (item) => item.action === "insert" || item.action === "update",
  );
  const rentalRows = actionable.map((item) => ({
    group_id: item.proposed.group_id,
    group_name: item.proposed.group_name,
    is_active: item.proposed.is_active,
    start_at: item.proposed.start_at,
    expire_at: item.proposed.expire_at,
    updated_by: "phase-j-group-bootstrap",
    updated_at: new Date().toISOString(),
  }));
  const write = rentalRows.length
    ? await result.auth.admin
        .from("group_rentals")
        .upsert(rentalRows, { onConflict: "group_id" })
    : { error: null };
  if (write.error) {
    return Response.json(
      {
        ok: false,
        message: "Bootstrap dibatalkan karena penulisan Supabase gagal",
        applied: [],
      },
      { status: 500 },
    );
  }

  const nameSyncFailed: string[] = [];
  for (const item of actionable) {
    const accessUpdate = await result.auth.admin
      .from("user_group_access")
      .update({ group_name: item.proposed.group_name })
      .eq("group_id", item.group_id);
    if (accessUpdate.error) nameSyncFailed.push(item.group_id);
  }

  return Response.json({
    ok: nameSyncFailed.length === 0,
    mode: "apply",
    applied: actionable.map((item) => item.group_id),
    group_name_sync_failed: nameSyncFailed,
    plan: result.plan,
  });
}
