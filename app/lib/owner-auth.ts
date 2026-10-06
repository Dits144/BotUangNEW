import type { User } from "@supabase/supabase-js";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "./supabase-server";

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export type OwnerAuthResult =
  | {
      ok: true;
      admin: AdminClient;
      user: User;
    }
  | {
      ok: false;
      message: string;
      status: 401 | 403 | 503;
    };

function configuredOwnerEmails() {
  return new Set(
    (process.env.OWNER_EMAILS ?? "dits144@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function authenticateOwner(request: Request): Promise<OwnerAuthResult> {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) {
    return { ok: false, message: "Session owner tidak ditemukan", status: 401 };
  }

  const auth = await createSupabaseServerClient(token).auth.getUser(token);
  const user = auth.data.user;
  if (auth.error || !user) {
    return { ok: false, message: "Session owner tidak valid", status: 401 };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      message: "Konfigurasi service role Supabase belum tersedia",
      status: 503,
    };
  }

  if (configuredOwnerEmails().has((user.email ?? "").trim().toLowerCase())) {
    return { ok: true, admin, user };
  }

  const profile = await admin
    .from("user_profiles")
    .select("platform_role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile.data?.platform_role !== "owner") {
    return { ok: false, message: "Akses owner ditolak", status: 403 };
  }

  return { ok: true, admin, user };
}
