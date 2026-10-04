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

function getAccessToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

async function canAccessGroup(request: Request, groupId: string) {
  const accessToken = getAccessToken(request);
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

  const { data, error } = await admin
    .from("user_group_access")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const groupId = typeof body.group_id === "string" ? body.group_id : "";
  const apiUrl = typeof body.api_url === "string" ? body.api_url : BOT_API_URL;
  const token = getServerBotToken();

  if (!groupId) {
    return Response.json({ ok: false, message: "Group ID tidak ditemukan" }, { status: 200 });
  }

  if (!token) {
    return Response.json({ ok: false, message: "BOT_API_TOKEN belum dipasang di server." }, { status: 200 });
  }

  if (!(await canAccessGroup(request, groupId))) {
    return Response.json({ ok: false, message: "Akses grup tidak valid." }, { status: 403 });
  }

  const payload = {
    group_id: groupId,
    type: "prayer_test",
    message:
      "🕌 Test Pengingat Azan\n\nPengingat azan BotUang untuk grup ini sudah terhubung dengan baik.",
  };
  const attempted: string[] = [];

  for (const baseUrl of getServerBotApiUrls(apiUrl)) {
    const root = baseUrl.replace(/\/$/, "");
    const endpoints = [
      `${root}/api/prayer/test`,
      `${root}/api/groups/${encodeURIComponent(groupId)}/prayer/test`,
      `${root}/api/groups/${encodeURIComponent(groupId)}/messages`,
      `${root}/send-message`,
      `${root}/send`,
    ];

    for (const endpoint of endpoints) {
      attempted.push(endpoint);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Group-Id": groupId,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok !== false) {
          return Response.json({ ok: true, message: "Test berhasil dikirim ke WhatsApp." }, { status: 200 });
        }
      } catch {
        continue;
      }
    }
  }

  return Response.json(
    {
      ok: false,
      message:
        "Bot API belum menerima endpoint test azan. Tambahkan handler /api/prayer/test atau /api/groups/:groupId/prayer/test di bot VPS.",
      attempted,
    },
    { status: 200 },
  );
}
