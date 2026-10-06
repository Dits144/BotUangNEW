import { BOT_API_URL } from "@/app/lib/constants";
import { getServerBotApiUrl, getServerBotToken } from "@/app/lib/bot-server-config";
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

async function isOwner(request: Request) {
  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!accessToken) return false;

  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);
  const user = auth.data.user;
  if (auth.error || !user) return false;
  if (ownerEmails.has((user.email ?? "").trim().toLowerCase())) return true;

  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const profile = await admin
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", user.id)
    .maybeSingle();
  return profile.data?.platform_role === "owner";
}

export async function POST(request: Request) {
  if (!(await isOwner(request))) {
    return Response.json(
      { ok: false, message: "Akses owner ditolak" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "sync";
  const apiUrl = getServerBotApiUrl(
    typeof body.api_url === "string" || typeof body.apiUrl === "string"
      ? String(body.api_url ?? body.apiUrl)
      : BOT_API_URL,
  );
  const token = getServerBotToken();

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
