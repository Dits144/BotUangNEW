import {
  BOT_API_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/app/lib/constants";
import { getServerBotApiUrl, getServerBotToken } from "@/app/lib/bot-server-config";
import { createSupabaseAdminClient } from "@/app/lib/supabase-server";

type OwnerAction =
  | "activate"
  | "deactivate"
  | "broadcast"
  | "broadcast-numbers"
  | "approve-rental"
  | "reject-rental";

const ownerEmails = new Set(
  (process.env.OWNER_EMAILS ?? "dits144@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

async function assertOwner(request: Request) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!token) return "Session owner tidak ditemukan";

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return "Session owner sudah kedaluwarsa";

  const user = (await response.json().catch(() => null)) as {
    id?: string;
    email?: string;
    user_metadata?: { role?: string };
  } | null;
  const email = user?.email?.trim().toLowerCase() ?? "";
  const role = user?.user_metadata?.role;

  const admin = createSupabaseAdminClient();
  if (admin && user?.id) {
    const profile = await admin
      .from("user_profiles")
      .select("platform_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile.data?.platform_role === "owner") {
      return "";
    }
  }

  if (role !== "owner" && !ownerEmails.has(email)) {
    return "Akses owner ditolak";
  }

  return "";
}

function getBotToken() {
  return getServerBotToken();
}

async function callOwnerApiData({
  apiUrl,
  path,
  method = "GET",
  body,
}: {
  apiUrl: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const botToken = getBotToken();
  if (!botToken) {
    return {
      ok: false,
      data: null,
      message: "BOT_API_TOKEN belum diset di Vercel.",
    };
  }

  try {
    const response = await fetch(`${apiUrl}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);

    return {
      ok: response.ok,
      data,
      message:
        (data as { message?: string; error?: string } | null)?.message ??
        (data as { error?: string } | null)?.error,
    };
  } catch {
    return {
      ok: false,
      data: null,
      message: "Owner Bot API tidak tersedia",
    };
  }
}

async function callOwnerApi(args: Parameters<typeof callOwnerApiData>[0]) {
  const result = await callOwnerApiData(args);
  return Response.json(result, { status: 200 });
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? ""),
  );
}

export async function GET(request: Request) {
  const ownerError = await assertOwner(request);
  if (ownerError) {
    return Response.json({ ok: false, message: ownerError }, { status: 200 });
  }

  const url = new URL(request.url);
  const apiUrl = getServerBotApiUrl(url.searchParams.get("api_url") ?? BOT_API_URL);
  const resource = url.searchParams.get("resource") ?? "groups";
  const paths: Record<string, string> = {
    groups: "/owner/groups",
    health: "/owner/health",
    "db-stats": "/owner/db-stats",
    "rental-requests": "/owner/rental-requests",
  };
  const path = paths[resource];

  if (!path) {
    return Response.json(
      { ok: false, message: "Resource owner tidak tersedia" },
      { status: 200 },
    );
  }

  if (resource === "rental-requests") {
    const admin = createSupabaseAdminClient();
    const localResult = admin
      ? await admin
          .from("rental_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [], error: null };
    let botData: unknown[] = [];
    let botMessage = "";
    const botToken = getBotToken();

    if (botToken) {
      try {
        const response = await fetch(`${apiUrl}/api${path}`, {
          headers: {
            Authorization: `Bearer ${botToken}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json().catch(() => null);
        if (response.ok && Array.isArray(data)) botData = data;
        else if (response.ok && Array.isArray((data as { data?: unknown[] } | null)?.data)) {
          botData = (data as { data: unknown[] }).data;
        } else {
          botMessage =
            (data as { message?: string; error?: string } | null)?.message ??
            (data as { error?: string } | null)?.error ??
            "";
        }
      } catch {
        botMessage = "Owner Bot API tidak tersedia";
      }
    }

    const merged = new Map<string, unknown>();
    for (const item of botData) {
      const row = item as { id?: string | number };
      merged.set(String(row.id ?? JSON.stringify(item)), item);
    }
    for (const item of localResult.data ?? []) {
      const row = item as { id?: string | number };
      merged.set(String(row.id ?? JSON.stringify(item)), item);
    }

    return Response.json(
      {
        ok: !localResult.error,
        data: Array.from(merged.values()),
        message: localResult.error?.message ?? botMessage,
      },
      { status: 200 },
    );
  }

  return callOwnerApi({ apiUrl, path });
}

export async function POST(request: Request) {
  const ownerError = await assertOwner(request);
  if (ownerError) {
    return Response.json({ ok: false, message: ownerError }, { status: 200 });
  }

  const url = new URL(request.url);
  const apiUrl = getServerBotApiUrl(url.searchParams.get("api_url") ?? BOT_API_URL);
  const payload = (await request.json().catch(() => ({}))) as {
    action?: OwnerAction;
    id?: string | number;
    [key: string]: unknown;
  };
  const action = payload.action;

  if (
    (action === "approve-rental" || action === "reject-rental") &&
    isUuid(payload.id)
  ) {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return Response.json(
        { ok: false, message: "Konfigurasi server belum siap." },
        { status: 200 },
      );
    }

    const requestResult = await admin
      .from("rental_requests")
      .select("id, group_id, months, status")
      .eq("id", String(payload.id))
      .maybeSingle();

    if (requestResult.error) {
      return Response.json(
        { ok: false, message: requestResult.error.message },
        { status: 200 },
      );
    }

    if (requestResult.data) {
      const rentalRequest = requestResult.data as {
        id: string;
        group_id: string;
        months: number | null;
        status: string | null;
      };
      const status = action === "approve-rental" ? "approved" : "rejected";

      if (action === "approve-rental") {
        const months = Math.max(Number(rentalRequest.months ?? 1), 1);
        const activation = await callOwnerApiData({
          apiUrl,
          path: "/owner/rentals/activate",
          method: "POST",
          body: {
            group_id: rentalRequest.group_id,
            days: months * 30,
          },
        });

        if (!activation.ok) {
          return Response.json(
            {
              ok: false,
              data: activation.data,
              message: activation.message ?? "Aktivasi sewa bot gagal.",
            },
            { status: 200 },
          );
        }
      }

      const updateResult = await admin
        .from("rental_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", rentalRequest.id);

      if (updateResult.error) {
        return Response.json(
          { ok: false, message: updateResult.error.message },
          { status: 200 },
        );
      }

      return Response.json(
        {
          ok: true,
          message:
            action === "approve-rental"
              ? "Request perpanjangan disetujui dan sewa grup diaktifkan."
              : "Request perpanjangan ditolak.",
        },
        { status: 200 },
      );
    }
  }

  const actionMap: Record<OwnerAction, { path: string; method: "POST" }> = {
    activate: { path: "/owner/rentals/activate", method: "POST" },
    deactivate: { path: "/owner/rentals/deactivate", method: "POST" },
    broadcast: { path: "/owner/broadcast", method: "POST" },
    "broadcast-numbers": { path: "/owner/broadcast-numbers", method: "POST" },
    "approve-rental": {
      path: `/owner/rental-requests/${payload.id}/approve`,
      method: "POST",
    },
    "reject-rental": {
      path: `/owner/rental-requests/${payload.id}/reject`,
      method: "POST",
    },
  };

  if (!action || !actionMap[action]) {
    return Response.json(
      { ok: false, message: "Aksi owner tidak tersedia" },
      { status: 200 },
    );
  }

  const { path, method } = actionMap[action];
  const { action: _action, id: _id, ...body } = payload;
  return callOwnerApi({ apiUrl, path, method, body });
}
