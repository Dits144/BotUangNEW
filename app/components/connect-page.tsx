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
  has_pin: boolean | null;
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
  const [needsDashToken, setNeedsDashToken] = useState(false);

  const hasPin = botGate.enabled ? botGate.hasPin : Boolean(rental?.has_pin);
  const tokenFlow = Boolean(token);
  const title = useMemo(() => {
    if (!tokenFlow && !rental) return "Hubungkan grup";
    if (!rental) return "Hubungkan grup";
    return hasPin ? "Masukkan PIN grup" : "Buat PIN dashboard";
  }, [hasPin, rental, tokenFlow]);

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
          .select("group_id, group_name, is_active, expire_at")
          .eq("group_id", queryGroup)
          .maybeSingle();

        setRental(
          data
            ? {
                ...(data as Omit<RentalRow, "has_pin">),
                has_pin: Boolean(validation.hasPin),
              }
            : {
            group_id: queryGroup,
            group_name: validation.groupName ?? queryGroup,
            has_pin: Boolean(validation.hasPin),
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
        .select("group_id, group_name, is_active, expire_at")
        .eq("group_id", queryGroup)
        .maybeSingle();

      if (rentalError || !data) {
        setError("Data grup belum terdaftar di BotUang.");
        setLoading(false);
        return;
      }

      const info = await fetch(`/api/access/groups?group_id=${encodeURIComponent(queryGroup)}`, {
        headers: { Authorization: `Bearer ${auth.data.session.access_token}` },
      })
        .then((response) => response.json() as Promise<{
          ok?: boolean;
          group?: { group_name?: string | null; has_pin?: boolean };
        }>)
        .catch(() => ({ ok: false, group: undefined }));

      setRental({
        ...(data as Omit<RentalRow, "has_pin">),
        group_name: info.group?.group_name ?? data.group_name,
        has_pin: Boolean(info.group?.has_pin),
      });
      setLoading(false);
    }

    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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

    if (!tokenFlow && !rental) {
      if (!groupId.trim()) {
        toast.error("Group ID wajib diisi.");
        return;
      }

      setSaving(true);
      const info = await fetch(`/api/access/groups?group_id=${encodeURIComponent(groupId.trim())}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((response) => response.json() as Promise<{
          ok?: boolean;
          message?: string;
          group?: { group_id: string; group_name?: string | null; has_pin?: boolean };
        }>)
        .catch(() => ({ ok: false, message: "Data grup belum bisa dicek.", group: undefined }));
      setSaving(false);

      if (!info.ok || !info.group) {
        toast.error(info.message ?? "Grup tidak ditemukan.");
        return;
      }

      setRental({
        group_id: info.group.group_id,
        group_name: info.group.group_name ?? "Grup WhatsApp",
        has_pin: Boolean(info.group.has_pin),
        is_active: null,
        expire_at: null,
      });
      setNeedsDashToken(!info.group.has_pin);
      return;
    }

    if (!rental) return;

    if (needsDashToken) return;

    if (pin.length < 4) {
      toast.error("PIN minimal 4 digit.");
      return;
    }

    if (!hasPin && pin !== confirmPin) {
      toast.error("Konfirmasi PIN tidak sama.");
      return;
    }

    setSaving(true);
    const linked = await fetch("/api/access/groups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_id: rental.group_id || groupId,
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
    const linkedGroupName = linked.group?.group_name ?? rental.group_name ?? "Grup WhatsApp";

    window.localStorage.setItem(
      DASHBOARD_SESSION_KEY,
      JSON.stringify({
        groupId: rental.group_id || groupId,
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
        ) : !tokenFlow && !rental ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium">
              Group ID
              <Input
                className="mt-2"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                placeholder="120363427301916965@g.us"
                autoComplete="off"
              />
            </label>
            <p className="text-sm text-zinc-400">
              Hubungkan grup menggunakan Group ID atau link/token Dashboard dari WhatsApp.
            </p>
            <Button className="w-full" disabled={saving}>
              {saving ? "Memeriksa..." : "Lanjut"}
            </Button>
          </form>
        ) : needsDashToken ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
            <p className="font-semibold">Grup ini belum memiliki PIN.</p>
            <p className="mt-2 text-amber-100/80">
              Untuk keamanan, buat akses Dashboard terlebih dahulu melalui WhatsApp.
              Ketik perintah ini di grup:
            </p>
            <p className="mt-3 rounded-xl bg-black/25 p-3 font-mono text-emerald-200">dash</p>
            <Button
              className="mt-4 w-full"
              onClick={() => {
                setRental(null);
                setNeedsDashToken(false);
                setPin("");
                setConfirmPin("");
              }}
            >
              Cek Group ID Lain
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-sm text-zinc-400">Grup</p>
              <p className="mt-1 font-semibold">{rental?.group_name ?? "Grup WhatsApp"}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                {tokenFlow ? "Token WhatsApp tervalidasi" : "PIN grup diperlukan untuk menghubungkan akun"}
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
