import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrls, getServerBotToken } from "@/app/lib/bot-server-config";

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
  const apiUrls = getServerBotApiUrls(queryApiUrl || BOT_API_URL);
  const token = getServerBotToken(headerToken);

  return { apiUrls, groupId, resource, token };
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
  method: "GET" | "POST" | "DELETE",
) {
  const context = getRequestContext(request);
  const invalidMessage = validateContext(context);

  if (invalidMessage) {
    return Response.json({ ok: false, message: invalidMessage }, { status: 200 });
  }

  const body = method === "GET" ? undefined : await request.text();
  try {
    for (const apiUrl of context.apiUrls) {
      const endpoint = `${apiUrl}/api/groups/${encodeURIComponent(
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
