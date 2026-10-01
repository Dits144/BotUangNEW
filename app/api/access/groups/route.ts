import { createSupabaseServerClient } from "@/app/lib/supabase-server";

type GroupAccessRow = {
  group_id: string;
  role: "admin" | "owner";
  group_rentals?: { group_name?: string | null } | null;
};

export async function GET(request: Request) {
  const accessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!accessToken) {
    return Response.json(
      { ok: false, message: "Session tidak ditemukan", groups: [] },
      { status: 200 },
    );
  }

  const supabase = createSupabaseServerClient(accessToken);
  const auth = await supabase.auth.getUser(accessToken);

  if (auth.error || !auth.data.user) {
    return Response.json(
      { ok: false, message: "Session tidak valid", groups: [] },
      { status: 200 },
    );
  }

  const { data, error } = await supabase
    .from("user_group_access")
    .select("group_id, role, group_rentals(group_name)")
    .eq("user_id", auth.data.user.id)
    .order("last_selected_at", { ascending: false, nullsFirst: false });

  if (error) {
    return Response.json(
      {
        ok: false,
        message: error.message,
        groups: [],
      },
      { status: 200 },
    );
  }

  const groups = ((data ?? []) as GroupAccessRow[]).map((row) => ({
    group_id: row.group_id,
    group_name: row.group_rentals?.group_name ?? row.group_id,
    role: row.role,
  }));

  return Response.json({ ok: true, groups }, { status: 200 });
}
