import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrls, getServerBotToken } from "@/app/lib/bot-server-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("group_id") ?? "";
  const sessionToken = url.searchParams.get("token") ?? "";
  const headerToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const queryApiUrl = url.searchParams.get("api_url") ?? "";
  const baseUrls = getServerBotApiUrls(queryApiUrl || BOT_API_URL);
  const authToken = getServerBotToken(headerToken || sessionToken);

  if (!baseUrls.length || !authToken) {
    return Response.json(
      { ok: false, message: "Bot API belum dikonfigurasi" },
      { status: 200 },
    );
  }

  try {
    const paths = ["/status", "/api/status", "/health", "/api/health", "/"];

    for (const baseUrl of baseUrls) {
      for (const path of paths) {
        try {
          const response = await fetch(
            `${baseUrl}${path}${path === "/" ? "" : `?group_id=${encodeURIComponent(groupId)}`}`,
            {
              headers: {
                Authorization: `Bearer ${authToken}`,
                "X-Group-Id": groupId,
              },
            },
          );
          const data = await response.json().catch(() => ({}));
          const endpointMissing =
            response.status === 404 ||
            String((data as { error?: string }).error ?? "")
              .toLowerCase()
              .includes("not found");

          if (!endpointMissing) {
            return Response.json(
              { ok: response.ok, source: path, apiUrl: baseUrl, ...data },
              { status: 200 },
            );
          }
        } catch {
          continue;
        }
      }
    }

    return Response.json(
      { ok: false, message: "Endpoint status bot belum tersedia" },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { ok: false, message: "Status bot tidak tersedia" },
      { status: 200 },
    );
  }
}
