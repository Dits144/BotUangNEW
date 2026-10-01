import { BOT_API_TOKEN, BOT_API_URL } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";

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
  const headerToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const queryApiUrl = url.searchParams.get("api_url") ?? "";
  const apiUrl = resolveTrustedBotApiUrl(queryApiUrl || BOT_API_URL);
  const token = headerToken || BOT_API_TOKEN;

  return { apiUrl, groupId, resource, token };
}

function validateContext({
  apiUrl,
  groupId,
  resource,
  token,
}: ReturnType<typeof getRequestContext>) {
  if (!apiUrl || !token) {
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
  method: "GET" | "POST" | "DELETE",
) {
  const context = getRequestContext(request);
  const invalidMessage = validateContext(context);

  if (invalidMessage) {
    return Response.json({ ok: false, message: invalidMessage }, { status: 200 });
  }

  const body = method === "GET" ? undefined : await request.text();
  const endpoint = `${context.apiUrl}/api/groups/${encodeURIComponent(
    context.groupId,
  )}/${context.resource}`;

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

    return Response.json(
      {
        ok: response.ok,
        data,
        message: response.ok ? undefined : "Data bot tidak tersedia",
      },
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
