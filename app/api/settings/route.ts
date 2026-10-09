import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/app/lib/supabase-server";

const ownerEmails = new Set(
  (process.env.OWNER_EMAILS ?? "dits144@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const allowedFields = new Set([
  "header_text",
  "location_name",
  "location_latitude",
  "location_longitude",
  "location_timezone",
  "weather_location",
  "azan_location",
  "emergency_location",
  "weather_enabled",
  "azan_enabled",
  "prayer_enabled",
  "prayer_method",
  "prayer_subuh_enabled",
  "prayer_dzuhur_enabled",
  "prayer_ashar_enabled",
  "prayer_maghrib_enabled",
  "prayer_isya_enabled",
  "prayer_reminder_offset_minutes",
  "prayer_schedule_cache",
  "prayer_schedule_cached_for",
  "prayer_schedule_cached_at",
  "prayer_last_error",
  "emergency_enabled",
  "typo_enabled",
  "spreadsheet_url",
  "updated_at",
]);

const legacyFields = new Set([
  "header_text",
  "weather_location",
  "typo_enabled",
  "azan_location",
  "emergency_location",
  "weather_enabled",
  "azan_enabled",
  "emergency_enabled",
  "spreadsheet_url",
  "updated_at",
]);

function isMissingSchemaField(message = "") {
  return /column .* does not exist|schema cache/i.test(message);
}

async function getAuthorizedContext(request: Request, groupId: string) {
  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!accessToken) return { ok: false as const, message: "Session tidak valid" };

  const client = createSupabaseServerClient(accessToken);
  const auth = await client.auth.getUser(accessToken);
  const user = auth.data.user;
  if (auth.error || !user) {
    return { ok: false as const, message: "Session tidak valid" };
  }

  const admin = createSupabaseAdminClient();
  const lookupClient = admin ?? client;
  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  if (ownerEmails.has(normalizedEmail)) {
    return { ok: true as const, client: lookupClient };
  }

  const profile = await lookupClient
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile.data?.platform_role === "owner") {
    return { ok: true as const, client: lookupClient };
  }

  const access = await lookupClient
    .from("user_group_access")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!access.data) {
    return { ok: false as const, message: "Akses grup tidak valid" };
  }

  return { ok: true as const, client: lookupClient };
}

function getGroupId(request: Request) {
  return new URL(request.url).searchParams.get("group_id")?.trim() ?? "";
}

export async function GET(request: Request) {
  const groupId = getGroupId(request);
  if (!groupId) {
    return Response.json({ ok: false, message: "Group ID tidak ditemukan" }, { status: 400 });
  }

  const context = await getAuthorizedContext(request, groupId);
  if (!context.ok) {
    return Response.json({ ok: false, message: context.message }, { status: 403 });
  }

  const result = await context.client
    .from("group_settings")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  if (result.error) {
    return Response.json({ ok: false, message: result.error.message }, { status: 200 });
  }
  return Response.json({ ok: true, data: result.data }, { status: 200 });
}

export async function PUT(request: Request) {
  const groupId = getGroupId(request);
  if (!groupId) {
    return Response.json({ ok: false, message: "Group ID tidak ditemukan" }, { status: 400 });
  }

  const context = await getAuthorizedContext(request, groupId);
  if (!context.ok) {
    return Response.json({ ok: false, message: context.message }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = Object.fromEntries(
    Object.entries(body).filter(([key]) => allowedFields.has(key)),
  );

  let result = await context.client
    .from("group_settings")
    .upsert(
      {
        ...payload,
        group_id: groupId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id" },
    )
    .select("*")
    .single();

  // Older BotUang databases only have the original location service fields.
  // Keep core Weather/Azan/Emergency controls usable until the additive prayer
  // migration is installed, without masking unrelated database failures.
  if (result.error && isMissingSchemaField(result.error.message)) {
    const legacyPayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => legacyFields.has(key)),
    );
    result = await context.client
      .from("group_settings")
      .upsert(
        {
          ...legacyPayload,
          group_id: groupId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "group_id" },
      )
      .select("*")
      .single();
  }

  if (result.error) {
    return Response.json({ ok: false, message: result.error.message }, { status: 200 });
  }
  return Response.json({ ok: true, data: result.data }, { status: 200 });
}
