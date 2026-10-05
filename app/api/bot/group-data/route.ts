import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrls, getServerBotToken } from "@/app/lib/bot-server-config";
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

const allowedResources = new Set([
  "transactions",
  "participants",
  "todos",
  "reminders",
  "commands",
  "settings",
]);

function getRequestContext(request: Request) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("group_id") ?? "";
  const resource = url.searchParams.get("resource") ?? "";
  const id = url.searchParams.get("id") ?? "";
  const queryApiUrl = url.searchParams.get("api_url") ?? "";
  const apiUrls = getServerBotApiUrls(queryApiUrl || BOT_API_URL);
  const token = getServerBotToken();

  return { apiUrls, groupId, resource, id, token };
}

async function canAccessGroup(request: Request, groupId: string) {
  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!accessToken) return false;

  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);
  const user = auth.data.user;
  if (auth.error || !user) return false;

  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  if (ownerEmails.has((user.email ?? "").trim().toLowerCase())) return true;

  const profile = await admin
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile.data?.platform_role === "owner") return true;

  const access = await admin
    .from("user_group_access")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();

  return Boolean(access.data);
}

function validateContext({
  apiUrls,
  groupId,
  resource,
  token,
}: ReturnType<typeof getRequestContext>) {
  if (!apiUrls.length || !token) {
    return "Bot API belum dikonfigurasi";
  }

  if (!groupId) {
    return "Group ID tidak ditemukan";
  }

  if (!allowedResources.has(resource)) {
    return "Resource bot tidak tersedia";
  }

  return "";
}

async function forwardGroupRequest(
  request: Request,
  method: "GET" | "POST" | "PUT" | "DELETE",
) {
  const context = getRequestContext(request);
  const invalidMessage = validateContext(context);

  if (invalidMessage) {
    return Response.json({ ok: false, message: invalidMessage }, { status: 200 });
  }

  if (!(await canAccessGroup(request, context.groupId))) {
    return Response.json(
      { ok: false, message: "Akses grup tidak valid" },
      { status: 403 },
    );
  }

  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
  try {
    for (const apiUrl of context.apiUrls) {
      const endpoint = `${apiUrl}/api/groups/${encodeURIComponent(
        context.groupId,
      )}/${context.resource}${context.id ? `/${encodeURIComponent(context.id)}` : ""}`;
      try {
        const response = await fetch(endpoint, {
          method,
          headers: {
            Authorization: `Bearer ${context.token}`,
            "Content-Type": "application/json",
            "X-Group-Id": context.groupId,
          },
          body,
        });
        const data = await response.json().catch(() => null);

        if (response.ok) {
          return Response.json(
            {
              ok: true,
              data,
            },
            { status: 200 },
          );
        }
      } catch {
        continue;
      }
    }

    return Response.json(
      { ok: false, message: "Data bot tidak tersedia" },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { ok: false, message: "Data bot tidak tersedia" },
      { status: 200 },
    );
  }
}

export async function GET(request: Request) {
  return forwardGroupRequest(request, "GET");
}

export async function POST(request: Request) {
  return forwardGroupRequest(request, "POST");
}

export async function PUT(request: Request) {
  return forwardGroupRequest(request, "PUT");
}

export async function DELETE(request: Request) {
  return forwardGroupRequest(request, "DELETE");
}
