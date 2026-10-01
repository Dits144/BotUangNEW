import { BOT_API_URL } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/app/lib/supabase-server";

type GroupAccessRow = {
  group_id: string;
  group_name?: string | null;
  role: "admin" | "owner";
};

const ownerEmails = new Set(
  (process.env.OWNER_EMAILS ?? "dits144@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

type LinkGroupBody = {
  group_id?: string;
  groupId?: string;
  group_name?: string;
  groupName?: string;
  token?: string;
  password?: string;
  api_url?: string;
  apiUrl?: string;
  role?: "admin" | "owner";
};

type BotConnectValidation = {
  group?: { name?: string };
  error?: string;
};

function getAccessToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

async function getAuthenticatedUser(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return { accessToken, userId: "", email: "", error: "Session tidak ditemukan" };

  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);

  if (auth.error || !auth.data.user) {
    return { accessToken, userId: "", email: "", error: "Session tidak valid" };
  }

  return {
    accessToken,
    userId: auth.data.user.id,
    email: auth.data.user.email ?? "",
    error: "",
  };
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (user.error) {
    return Response.json(
      { ok: false, message: user.error, groups: [] },
      { status: 200 },
    );
  }

  const admin = createSupabaseAdminClient();
  const supabase = createSupabaseServerClient(user.accessToken);
  const normalizedEmail = user.email.trim().toLowerCase();
  const fallbackRole = ownerEmails.has(normalizedEmail) ? "owner" : "admin";
  let platformRole: "admin" | "owner" = fallbackRole;

  if (admin) {
    const profileResult = await admin
      .from("user_profiles")
      .upsert(
        {
          user_id: user.userId,
          email: user.email,
          platform_role: fallbackRole,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("platform_role")
      .maybeSingle();

    const dbRole = profileResult.data?.platform_role;
    platformRole = dbRole === "owner" ? "owner" : fallbackRole;
  } else {
    const profileResult = await supabase
      .from("user_profiles")
      .select("platform_role")
      .eq("user_id", user.userId)
      .maybeSingle();

    const dbRole = profileResult.data?.platform_role;
    platformRole = dbRole === "owner" ? "owner" : fallbackRole;
  }

  const { data, error } = await supabase
    .from("user_group_access")
    .select("group_id, group_name, role")
    .eq("user_id", user.userId)
    .order("last_selected_at", { ascending: false, nullsFirst: false });

  if (error) {
    return Response.json(
      {
        ok: false,
        message: error.message,
        groups: [],
      },
      { status: 200 },
    );
  }

  const collected = new Map<string, GroupAccessRow>();

  for (const row of (data ?? []) as GroupAccessRow[]) {
    collected.set(row.group_id, {
      group_id: row.group_id,
      group_name: row.group_name ?? row.group_id,
      role: row.role,
    });
  }

  if (platformRole === "owner" && admin) {
    const rentals = await admin
      .from("group_rentals")
      .select("group_id, group_name")
      .order("is_active", { ascending: false })
      .order("expire_at", { ascending: false })
      .limit(100);

    for (const rental of rentals.data ?? []) {
      if (!collected.has(rental.group_id)) {
        collected.set(rental.group_id, {
          group_id: rental.group_id,
          group_name: rental.group_name ?? rental.group_id,
          role: "owner",
        });
      }
    }
  }

  const groups = Array.from(collected.values()).map((row) => ({
    group_id: row.group_id,
    group_name: row.group_name ?? row.group_id,
    role: row.role,
  }));

  return Response.json({ ok: true, groups, platform_role: platformRole }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (user.error) {
    return Response.json({ ok: false, message: user.error }, { status: 200 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json(
      {
        ok: false,
        message: "SUPABASE_SERVICE_ROLE_KEY belum diset di server.",
      },
      { status: 200 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as LinkGroupBody;
  const groupId = body.group_id ?? body.groupId ?? "";
  const token = body.token ?? "";
  const password = body.password;
  const apiUrl = resolveTrustedBotApiUrl(body.api_url ?? body.apiUrl ?? BOT_API_URL);

  if (!groupId || !token) {
    return Response.json(
      { ok: false, message: "Group ID dan token wajib diisi." },
      { status: 200 },
    );
  }

  const validation: { ok: boolean; data: BotConnectValidation } = await fetch(
    `${apiUrl}/api/groups/${encodeURIComponent(groupId)}/connect/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    },
  )
    .then(async (response) => ({
      ok: response.ok,
      data: (await response.json().catch(() => ({}))) as BotConnectValidation,
    }))
    .catch(() => ({
      ok: false,
      data: { error: "Bot API belum bisa dihubungi." } satisfies BotConnectValidation,
    }));

  if (!validation.ok) {
    return Response.json(
      {
        ok: false,
        message: validation.data.error ?? "Token dashboard tidak valid.",
      },
      { status: 200 },
    );
  }

  const groupName =
    body.group_name ?? body.groupName ?? validation.data.group?.name ?? groupId;
  const role = body.role === "owner" ? "owner" : "admin";

  const profile = await admin.from("user_profiles").upsert({
    user_id: user.userId,
    email: user.email,
    platform_role: user.email.toLowerCase() === "dits144@gmail.com" ? "owner" : "admin",
    updated_at: new Date().toISOString(),
  });

  if (profile.error) {
    return Response.json(
      { ok: false, message: profile.error.message },
      { status: 200 },
    );
  }

  const access = await admin.from("user_group_access").upsert(
    {
      user_id: user.userId,
      group_id: groupId,
      group_name: groupName,
      role,
      updated_at: new Date().toISOString(),
      last_selected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,group_id" },
  );

  if (access.error) {
    return Response.json(
      { ok: false, message: access.error.message },
      { status: 200 },
    );
  }

  return Response.json(
    {
      ok: true,
      group: {
        group_id: groupId,
        group_name: groupName,
        role,
      },
    },
    { status: 200 },
  );
}
