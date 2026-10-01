import { BOT_API_TOKEN, BOT_API_URL } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "sync";
  const apiUrl = resolveTrustedBotApiUrl(
    typeof body.api_url === "string" || typeof body.apiUrl === "string"
      ? String(body.api_url ?? body.apiUrl)
      : BOT_API_URL,
  );
  const token =
    BOT_API_TOKEN ||
    (typeof body.token === "string" ? body.token : "");

  if (!apiUrl || !token) {
    return Response.json(
      { ok: false, message: "Bot API belum dikonfigurasi" },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return Response.json({ ok: response.ok, ...data }, { status: 200 });
  } catch {
    return Response.json(
      { ok: false, message: "Aksi bot tidak tersedia" },
      { status: 200 },
    );
  }
}
