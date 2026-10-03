import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrls, getServerBotToken } from "@/app/lib/bot-server-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("group_id") ?? "";
  const queryApiUrl = url.searchParams.get("api_url") ?? "";
  const baseUrls = getServerBotApiUrls(queryApiUrl || BOT_API_URL);
  const authToken = getServerBotToken();

  if (!baseUrls.length || !authToken) {
    return Response.json(
      {
        ok: false,
        status: "configuration_error",
        message: "Status Bot Tidak Tersedia",
      },
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
              {
                ok: response.ok,
                status: response.ok ? "connected" : "disconnected",
                message: response.ok ? "Bot Terhubung" : "Bot Tidak Terhubung",
                source: path,
                apiUrl: baseUrl,
                ...data,
              },
              { status: 200 },
            );
          }
        } catch {
          continue;
        }
      }
    }

    return Response.json(
      {
        ok: false,
        status: "api_unreachable",
        message: "Server Bot Tidak Dapat Dijangkau",
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        status: "configuration_error",
        message: "Status Bot Tidak Tersedia",
      },
      { status: 200 },
    );
  }
}
