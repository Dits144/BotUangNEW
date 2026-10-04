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

async function getUser(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return { accessToken, id: "", email: "", error: "Session tidak ditemukan" };
  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);
  const user = auth.data.user;
  if (auth.error || !user) return { accessToken, id: "", email: "", error: "Session tidak valid" };
  return { accessToken, id: user.id, email: user.email ?? "", error: "" };
}

async function hasAccess({
  userId,
  email,
  groupId,
}: {
  userId: string;
  email: string;
  groupId: string;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;

  if (ownerEmails.has(email.trim().toLowerCase())) return true;

  const profile = await admin
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile.data?.platform_role === "owner") return true;

  const access = await admin
    .from("user_group_access")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();
  return Boolean(access.data);
}

async function notifyOwner(payload: Record<string, unknown>) {
  const token = getServerBotToken();
  if (!token) return { ok: false, message: "Notifikasi bot belum dikonfigurasi." };

  for (const baseUrl of getServerBotApiUrls(BOT_API_URL)) {
    const root = baseUrl.replace(/\/$/, "");
    const endpoints = [
      `${root}/api/owner/rental-requests`,
      `${root}/api/owner/rental-request`,
      `${root}/api/rental-requests`,
      `${root}/api/notify-owner`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok !== false) return { ok: true };
      } catch {
        continue;
      }
    }
  }

  return { ok: false, message: "Bot API belum menerima notifikasi rental request." };
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (user.error) return Response.json({ ok: false, message: user.error }, { status: 200 });

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json(
      { ok: false, message: "Konfigurasi server belum siap. Hubungi owner BotUang." },
      { status: 200 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    group_id?: string;
    months?: number;
    proof_image?: string;
    group_name?: string;
  };
  const groupId = body.group_id ?? "";
  const months = Math.max(1, Number(body.months ?? 1));
  const proofImage = body.proof_image ?? "";

  if (!groupId) {
    return Response.json({ ok: false, message: "Group ID wajib diisi." }, { status: 200 });
  }

  if (!(await hasAccess({ userId: user.id, email: user.email, groupId }))) {
    return Response.json({ ok: false, message: "Akses grup ditolak." }, { status: 200 });
  }

  const insert = await admin
    .from("rental_requests")
    .insert({
      group_id: groupId,
      months,
      status: "pending",
      proof_image: proofImage,
    })
    .select("*")
    .single();

  if (insert.error) {
    return Response.json({ ok: false, message: insert.error.message }, { status: 200 });
  }

  const rental = await admin
    .from("group_rentals")
    .select("group_name")
    .eq("group_id", groupId)
    .maybeSingle();

  const groupName = body.group_name || rental.data?.group_name || "Grup WhatsApp";
  const notify = await notifyOwner({
    action: "rental_request_created",
    request: insert.data,
    group_id: groupId,
    group_name: groupName,
    months,
    proof_image: proofImage,
    requester_email: user.email,
    message: `Request perpanjangan ${months} bulan dari ${groupName} (${groupId}).`,
  });

  return Response.json({
    ok: true,
    request: insert.data,
    notified: notify.ok,
    message: notify.ok
      ? "Permintaan perpanjangan dikirim ke owner."
      : "Permintaan tersimpan. Notifikasi bot belum tersedia, owner tetap bisa melihatnya di dashboard.",
  });
}
