"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AUTH_REDIRECT_KEY, DASHBOARD_SESSION_KEY } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";
import { supabase } from "@/app/lib/supabase";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

type RentalRow = {
  group_id: string;
  group_name: string | null;
  password: string | null;
  is_active: boolean | null;
  expire_at: string | null;
};

export function ConnectPage() {
  const router = useRouter();
  const [groupId, setGroupId] = useState("");
  const [token, setToken] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [rental, setRental] = useState<RentalRow | null>(null);
  const [botGate, setBotGate] = useState<{
    enabled: boolean;
    hasPin: boolean;
    groupName?: string;
  }>({ enabled: false, hasPin: false });
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);

  const hasPin = botGate.enabled ? botGate.hasPin : Boolean(rental?.password);
  const title = useMemo(() => {
    if (!rental) return "Hubungkan grup";
    return hasPin ? "Masukkan PIN grup" : "Buat PIN dashboard";
  }, [hasPin, rental]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryGroup = params.get("group_id") ?? "";
    const queryToken = params.get("token") ?? "";
    const queryApiUrl = resolveTrustedBotApiUrl(
      params.get("apiUrl") ?? params.get("api_url"),
    );
    setGroupId(queryGroup);
    setToken(queryToken);
    setApiUrl(queryApiUrl);

    async function load() {
      if (!queryGroup || !queryToken) {
        setError("Link dashboard belum lengkap. Ketik dashboard di WhatsApp grup untuk membuat link baru.");
        setLoading(false);
        return;
      }

      const auth = await supabase.auth.getSession();
      if (!auth.data.session?.access_token) {
        window.sessionStorage.setItem(
          AUTH_REDIRECT_KEY,
          `${window.location.pathname}${window.location.search}`,
        );
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      if (queryApiUrl) {
        const validation = await validateViaBotApi({
          apiUrl: queryApiUrl,
          groupId: queryGroup,
          token: queryToken,
        });

        if (!validation.ok) {
          setError(validation.error);
          setLoading(false);
          return;
        }

        setBotGate({
          enabled: true,
          hasPin: Boolean(validation.hasPin),
          groupName: validation.groupName,
        });

        const { data } = await supabase
          .from("group_rentals")
          .select("group_id, group_name, password, is_active, expire_at")
          .eq("group_id", queryGroup)
          .maybeSingle();

        setRental(
          (data as RentalRow | null) ?? {
            group_id: queryGroup,
            group_name: validation.groupName ?? queryGroup,
            password: validation.hasPin ? "protected" : null,
            is_active: null,
            expire_at: null,
          },
        );
        setLoading(false);
        return;
      }

      const { data: tokenRow, error: tokenError } = await supabase
        .from("dashboard_tokens")
        .select("token, group_id, expires_at")
        .eq("token", queryToken)
        .eq("group_id", queryGroup)
        .maybeSingle();

      if (tokenError || !tokenRow) {
        setError("Token dashboard tidak valid atau sudah tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
        setError("Token dashboard sudah kedaluwarsa. Buat link baru dari WhatsApp.");
        setLoading(false);
        return;
      }

      const { data, error: rentalError } = await supabase
        .from("group_rentals")
        .select("group_id, group_name, password, is_active, expire_at")
        .eq("group_id", queryGroup)
        .maybeSingle();

      if (rentalError || !data) {
        setError("Data grup belum terdaftar di BotUang.");
        setLoading(false);
        return;
      }

      setRental(data as RentalRow);
      setLoading(false);
    }

    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!rental) return;
    const auth = await supabase.auth.getSession();
    const accessToken = auth.data.session?.access_token;
    if (!accessToken) {
      window.sessionStorage.setItem(
        AUTH_REDIRECT_KEY,
        `${window.location.pathname}${window.location.search}`,
      );
      toast.error("Login dulu agar grup tersimpan ke akun.");
      router.push("/login");
      return;
    }

    if (pin.length < 4) {
      toast.error("PIN minimal 4 digit.");
      return;
    }

    setSaving(true);
    if (botGate.enabled) {
      const validation = await validateViaBotApi({
        apiUrl,
        groupId,
        token,
        password: pin,
      });

      if (!validation.ok) {
        setSaving(false);
        toast.error(validation.error);
        return;
      }
    } else if (hasPin) {
      if (pin !== rental.password) {
        setSaving(false);
        toast.error("PIN tidak sesuai.");
        return;
      }
    } else {
      if (pin !== confirmPin) {
        setSaving(false);
        toast.error("Konfirmasi PIN tidak sama.");
        return;
      }
      const { error: updateError } = await supabase
        .from("group_rentals")
        .update({ password: pin, updated_at: new Date().toISOString() })
        .eq("group_id", groupId);
      if (updateError) {
        setSaving(false);
        toast.error(updateError.message);
        return;
      }
    }

    await supabase
      .from("dashboard_tokens")
      .update({ pin_verified: true })
      .eq("token", token)
      .eq("group_id", groupId);

    let linkedGroupName = rental.group_name;

    const linked = await fetch("/api/access/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_id: groupId,
        group_name: rental.group_name ?? botGate.groupName,
        token,
        password: pin,
        api_url: apiUrl,
        role: "admin",
      }),
    }).then((response) => response.json() as Promise<{
      ok?: boolean;
      message?: string;
      group?: { group_name?: string | null };
    }>);

    if (!linked.ok) {
      setSaving(false);
      toast.error(linked.message ?? "Akses grup belum bisa disimpan ke akun.");
      return;
    }
    linkedGroupName = linked.group?.group_name ?? linkedGroupName;

    window.localStorage.setItem(
      DASHBOARD_SESSION_KEY,
      JSON.stringify({
        groupId,
        token,
        apiUrl,
        groupName: linkedGroupName,
        role: "admin",
        connectedAt: new Date().toISOString(),
      }),
    );
    toast.success("Dashboard terhubung.");
    router.push("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0B0F19] px-5 py-8 text-white">
      <Card className="w-full max-w-md border-white/[0.08] bg-white/[0.035] p-5">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-emerald-500 text-slate-950">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-300">BotUang Connect</p>
            <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-20" />
          </div>
        ) : needsLogin ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <p className="font-semibold">Login admin diperlukan</p>
            <p className="mt-2 text-sm text-zinc-400">
              Masuk ke akun terlebih dahulu supaya grup ini tersimpan di akun Anda
              dan muncul di Group Switcher.
            </p>
            <Button className="mt-4 w-full" onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4" />
              Login Admin
            </Button>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
            <Button asChildLike="true" className="mt-4 w-full">
              <Link href="/">Kembali ke Beranda</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-sm text-zinc-400">Grup</p>
              <p className="mt-1 font-semibold">{rental?.group_name ?? groupId}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Token WhatsApp tervalidasi
              </p>
            </div>
            <label className="block text-sm font-medium">
              PIN Dashboard
              <Input
                className="mt-2"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                inputMode="numeric"
                type="password"
                autoComplete="one-time-code"
                placeholder="Minimal 4 digit"
              />
            </label>
            {!hasPin ? (
              <label className="block text-sm font-medium">
                Konfirmasi PIN
                <Input
                  className="mt-2"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(event.target.value)}
                  inputMode="numeric"
                  type="password"
                  placeholder="Ulangi PIN"
                />
              </label>
            ) : null}
            <Button className="w-full" disabled={saving}>
              <LockKeyhole className="h-4 w-4" />
              {saving ? "Memproses..." : hasPin ? "Masuk Dashboard" : "Simpan PIN"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

async function validateViaBotApi({
  apiUrl,
  groupId,
  token,
  password,
}: {
  apiUrl: string;
  groupId: string;
  token: string;
  password?: string;
}) {
  try {
    const response = await fetch(
      `${apiUrl.replace(/\/$/, "")}/api/groups/${encodeURIComponent(groupId)}/connect/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? "Token dashboard tidak valid.",
        hasPin: false,
      };
    }
    return {
      ok: true,
      error: "",
      hasPin: Boolean(data.has_pin),
      groupName: data.group?.name as string | undefined,
    };
  } catch {
    return {
      ok: false,
      error: "Bot API belum bisa dihubungi.",
      hasPin: false,
    };
  }
}
