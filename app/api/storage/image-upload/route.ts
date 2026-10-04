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

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

async function getUser(request: Request) {
  const accessToken = getAccessToken(request);
  if (!accessToken) return { accessToken, userId: "", email: "", error: "Session tidak ditemukan" };

  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);
  const user = auth.data.user;
  if (auth.error || !user) {
    return { accessToken, userId: "", email: "", error: "Session tidak valid" };
  }

  return {
    accessToken,
    userId: user.id,
    email: user.email ?? "",
    error: "",
  };
}

async function isOwner(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string, email: string) {
  if (ownerEmails.has(email.trim().toLowerCase())) return true;
  const profile = await admin
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();
  return profile.data?.platform_role === "owner";
}

async function hasGroupAccess(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
  groupId: string,
) {
  const access = await admin
    .from("user_group_access")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();
  return Boolean(access.data);
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (user.error) {
    return Response.json({ ok: false, message: user.error }, { status: 200 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json(
      { ok: false, message: "Konfigurasi upload belum siap. Hubungi owner BotUang." },
      { status: 200 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "");
  const groupId = String(form.get("group_id") ?? "");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return Response.json({ ok: false, message: "File gambar tidak valid." }, { status: 200 });
  }

  if (bucket !== "owner-assets" && bucket !== "rental-proofs") {
    return Response.json({ ok: false, message: "Bucket gambar tidak valid." }, { status: 200 });
  }

  const owner = await isOwner(admin, user.userId, user.email);

  if (bucket === "owner-assets" && !owner) {
    return Response.json({ ok: false, message: "Hanya owner yang bisa upload QRIS." }, { status: 200 });
  }

  if (bucket === "rental-proofs") {
    if (!groupId) {
      return Response.json({ ok: false, message: "Group ID wajib untuk bukti pembayaran." }, { status: 200 });
    }
    const allowed = owner || (await hasGroupAccess(admin, user.userId, groupId));
    if (!allowed) {
      return Response.json({ ok: false, message: "Akses grup ditolak." }, { status: 200 });
    }
  }

  const folder = bucket === "owner-assets" ? "qris" : `proofs/${groupId}`;
  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const upload = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (upload.error) {
    return Response.json({ ok: false, message: upload.error.message }, { status: 200 });
  }

  const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return Response.json(
    {
      ok: true,
      storagePath: `${bucket}/${path}`,
      signedUrl: signed.data?.signedUrl ?? "",
    },
    { status: 200 },
  );
}

export async function GET(request: Request) {
  const user = await getUser(request);
  if (user.error) {
    return Response.json({ ok: false, message: user.error }, { status: 200 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return Response.json(
      { ok: false, message: "Konfigurasi upload belum siap. Hubungi owner BotUang." },
      { status: 200 },
    );
  }

  const url = new URL(request.url);
  const storagePath = url.searchParams.get("path") ?? "";
  const [bucket, ...pathParts] = storagePath.split("/");
  const path = pathParts.join("/");

  if (!path || (bucket !== "owner-assets" && bucket !== "rental-proofs")) {
    return Response.json({ ok: false, message: "Path gambar tidak valid." }, { status: 200 });
  }

  const owner = await isOwner(admin, user.userId, user.email);
  if (bucket === "rental-proofs" && !owner) {
    const groupId = path.split("/")[1] ?? "";
    const allowed = groupId
      ? await hasGroupAccess(admin, user.userId, groupId)
      : false;
    if (!allowed) {
      return Response.json({ ok: false, message: "Akses gambar ditolak." }, { status: 200 });
    }
  }

  const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (signed.error) {
    return Response.json({ ok: false, message: signed.error.message }, { status: 200 });
  }

  return Response.json({ ok: true, signedUrl: signed.data.signedUrl }, { status: 200 });
}
