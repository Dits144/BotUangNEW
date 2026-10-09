"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  LogOut,
  Megaphone,
  Minus,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DASHBOARD_SESSION_KEY } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";
import { formatDate } from "@/app/lib/format";
import { resolveDashboardImage, uploadDashboardImage } from "@/app/lib/image-upload";
import { supabase } from "@/app/lib/supabase";
import { cn } from "@/app/lib/utils";
import { FadeUp, RevealHeading, StaggerContainer } from "./motion/fernly-motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ImageDropzone } from "./ui/image-dropzone";
import { Input, Textarea } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

type OwnerGroup = {
  id?: string;
  group_id: string;
  name?: string;
  group_name?: string;
  is_active?: boolean | number;
  status?: string;
  rental_status?: string;
  expire_at?: string;
  expired_at?: string;
  remaining_days?: number;
  member_count?: number;
};

type RentalRequest = {
  id: string | number;
  group_id: string;
  months: number;
  status: "pending" | "approved" | "rejected";
  proof_image?: string | null;
  created_at: string;
  updated_at?: string;
};

type Health = {
  status?: string;
  cpu_percent?: number;
  ram_used_mb?: number;
  ram_total_gb?: number;
  uptime_seconds?: number;
  database_status?: string;
  server_time?: string;
};

type DbStats = {
  database_size_kb?: number;
  groups_stats?: Record<
    string,
    {
      transactions: number;
      participants: number;
      commands: number;
      reminders: number;
      todos: number;
      total_records: number;
      estimated_size_kb: number;
    }
  >;
};

type OwnerApiResponse<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
};

function getStoredOwnerApiUrl() {
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const session = stored
      ? (JSON.parse(stored) as { apiUrl?: string })
      : null;
    return resolveTrustedBotApiUrl(session?.apiUrl);
  } catch {
    return "";
  }
}

export function OwnerDashboardPage({
  embedded = false,
  preview = false,
}: {
  embedded?: boolean;
  preview?: boolean;
}) {
  const router = useRouter();
  const [apiUrl] = useState(getStoredOwnerApiUrl);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(!preview);
  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [query, setQuery] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [days, setDays] = useState("30");
  const [broadcast, setBroadcast] = useState("");
  const [numbers, setNumbers] = useState("");
  const [qrisUrl, setQrisUrl] = useState("");
  const [qrisPreviewUrl, setQrisPreviewUrl] = useState("");
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase();
    return groups.filter((group) => {
      const name = group.group_name ?? group.name ?? "";
      const id = group.group_id ?? group.id ?? "";
      return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    });
  }, [groups, query]);

  const activeGroups = groups.filter((group) => isGroupActive(group)).length;
  const pendingRequests = requests.filter((item) => item.status === "pending").length;

  useEffect(() => {
    if (preview) {
      return;
    }
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const session = stored
      ? (JSON.parse(stored) as { role?: string; apiUrl?: string })
      : null;
    if (session?.role !== "owner") {
      router.push("/login");
      return;
    }

    const resolvedApiUrl = apiUrl || resolveTrustedBotApiUrl(session.apiUrl);

    async function boot() {
      const auth = await supabase.auth.getSession();
      const token = auth.data.session?.access_token ?? "";
      if (!token) {
        toast.error("Login owner sudah habis. Silakan masuk lagi.");
        router.push("/login");
        return;
      }
      setAccessToken(token);
      await loadOwnerData(token, resolvedApiUrl);
      await loadOwnerSettings();
    }

    boot();
  }, [apiUrl, preview, router]);

  async function ownerFetch<T>(
    resource: string,
    token = accessToken,
    targetApiUrl = apiUrl,
  ) {
    const response = await fetch(
      `/api/bot/owner?resource=${encodeURIComponent(resource)}&api_url=${encodeURIComponent(targetApiUrl)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return (await response.json()) as OwnerApiResponse<T>;
  }

  async function ownerPost<T>(body: Record<string, unknown>) {
    const response = await fetch(
      `/api/bot/owner?api_url=${encodeURIComponent(apiUrl)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    return (await response.json()) as OwnerApiResponse<T>;
  }

  async function loadOwnerData(token = accessToken, targetApiUrl = apiUrl) {
    setLoading(true);
    const [groupResult, healthResult, statsResult, requestResult] =
      await Promise.all([
        ownerFetch<OwnerGroup[]>("groups", token, targetApiUrl),
        ownerFetch<Health>("health", token, targetApiUrl),
        ownerFetch<DbStats>("db-stats", token, targetApiUrl),
        ownerFetch<RentalRequest[]>("rental-requests", token, targetApiUrl),
      ]);

    if (!groupResult.ok) toast.error(groupResult.message ?? "Data grup gagal dimuat.");
    setGroups(Array.isArray(groupResult.data) ? groupResult.data : []);
    setHealth(healthResult.ok ? healthResult.data ?? null : null);
    setDbStats(statsResult.ok ? statsResult.data ?? null : null);
    setRequests(Array.isArray(requestResult.data) ? requestResult.data : []);
    setLoading(false);
  }

  async function loadOwnerSettings() {
    const { data } = await supabase
      .from("owner_settings")
      .select("qris_image_url")
      .eq("id", "default")
      .maybeSingle();
    const row = data as { qris_image_url?: string | null } | null;
    const value = row?.qris_image_url ?? "";
    setQrisUrl(value);
    setQrisPreviewUrl(await resolveDashboardImage(value));
  }

  async function saveQris(event: FormEvent) {
    event.preventDefault();
    setBusy("qris");

    let nextQrisUrl = qrisUrl;
    let nextPreviewUrl = qrisPreviewUrl;
    if (qrisFile) {
      const upload = await uploadDashboardImage({
        bucket: "owner-assets",
        file: qrisFile,
      });

      if (!upload.ok || !upload.storagePath) {
        setBusy("");
        toast.error(upload.message ?? "Upload QRIS gagal.");
        return;
      }

      nextQrisUrl = upload.storagePath;
      nextPreviewUrl = upload.signedUrl ?? "";
    }

    const { error } = await supabase.from("owner_settings").upsert({
      id: "default",
      qris_image_url: nextQrisUrl,
      updated_at: new Date().toISOString(),
    });
    setBusy("");

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("QRIS owner disimpan.");
    setQrisUrl(nextQrisUrl);
    setQrisPreviewUrl(nextPreviewUrl);
    setQrisFile(null);
  }

  async function openProofImage(path?: string | null) {
    if (!path) {
      toast.error("Bukti pembayaran belum diupload.");
      return;
    }
    const url = await resolveDashboardImage(path);
    if (!url) {
      toast.error("Bukti pembayaran tidak bisa dibuka.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function logout() {
    window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
    await supabase.auth.signOut().catch(() => undefined);
    router.push("/login");
  }

  async function runOwnerAction(
    label: string,
    body: Record<string, unknown>,
    after?: () => void,
  ) {
    setBusy(label);
    const result = await ownerPost(body);
    setBusy("");
    if (!result.ok) {
      toast.error(result.message ?? "Aksi owner gagal.");
      return;
    }
    toast.success(result.message ?? "Aksi owner berhasil.");
    after?.();
    await loadOwnerData();
  }

  function submitRental(active: boolean) {
    if (!targetGroupId) {
      toast.error("Isi Group ID dulu.");
      return;
    }
    runOwnerAction(active ? "activate" : "deactivate", {
      action: active ? "activate" : "deactivate",
      group_id: targetGroupId,
      days: Number(days || 30),
    });
  }

  function adjustRental(groupId: string, direction: "add" | "reduce") {
    const rentalDays = Math.max(Number(days || 30), 1);
    void runOwnerAction(`${direction}-rental:${groupId}`, {
      action: direction === "add" ? "activate" : "reduce",
      group_id: groupId,
      days: rentalDays,
    });
  }

  function removeRental(group: OwnerGroup) {
    const groupId = group.group_id ?? group.id ?? "";
    const groupName = group.group_name ?? group.name ?? groupId;
    if (!groupId) return;
    if (!window.confirm(`Hapus masa sewa untuk ${groupName}? Bot tetap berada di grup, tetapi akses sewanya dinonaktifkan.`)) return;

    void runOwnerAction(`remove-rental:${groupId}`, {
      action: "remove-rental",
      group_id: groupId,
    });
  }

  function submitBroadcast(event: FormEvent, toNumbers: boolean) {
    event.preventDefault();
    if (!broadcast.trim()) {
      toast.error("Pesan broadcast belum diisi.");
      return;
    }
    runOwnerAction(toNumbers ? "broadcast-numbers" : "broadcast", {
      action: toNumbers ? "broadcast-numbers" : "broadcast",
      message: broadcast,
      numbers,
    });
  }

  if (loading) {
    const loadingContent = (
      <div className={embedded ? "space-y-4" : "mx-auto max-w-7xl space-y-4"}>
        <Skeleton className="h-24 rounded-[16px]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-[16px]" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-[16px]" />
      </div>
    );

    if (embedded) return loadingContent;

    return (
      <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-8">
        {loadingContent}
      </main>
    );
  }

  const content = (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8"}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <FadeUp variant="compact" delay={0.08}>
            <p className="text-xs font-semibold uppercase text-emerald-500">Owner</p>
          </FadeUp>
          <RevealHeading className="mt-1 text-[28px] font-semibold leading-tight md:text-[34px]">
            Pusat Operasional
          </RevealHeading>
          <FadeUp variant="compact" delay={0.13}>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
              Kelola sewa grup, pembayaran, broadcast, dan kondisi server bot.
            </p>
          </FadeUp>
        </div>
        <FadeUp className="grid grid-cols-2 gap-2 sm:flex" variant="compact" delay={0.18}>
          <Button variant="outline" onClick={() => loadOwnerData()} disabled={Boolean(busy)}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Perbarui
          </Button>
          {!embedded ? (
            <Button variant="ghost" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          ) : null}
        </FadeUp>
      </header>

      <StaggerContainer className="grid grid-cols-2 gap-3 lg:grid-cols-4" delay={0.1} stagger={0.07}>
        <OwnerMetric label="Total grup" value={String(groups.length)} icon={ShieldCheck} primary />
        <OwnerMetric label="Sewa aktif" value={String(activeGroups)} icon={Power} tone="income" />
        <OwnerMetric label="Menunggu" value={String(pendingRequests)} icon={Clock3} tone="warning" />
        <OwnerMetric label="Status bot" value={formatHealthStatus(health?.status)} icon={Server} />
      </StaggerContainer>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden rounded-[18px]">
          <div className="border-b border-[var(--line)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold">Sewa Grup</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Tambah, kurangi, atau hapus masa sewa setiap grup.
                </p>
              </div>
              <label className="relative block sm:w-72">
                <span className="sr-only">Cari nama atau ID grup</span>
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama atau ID grup"
                />
              </label>
            </div>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {filteredGroups.length ? (
              filteredGroups.map((group) => {
                const groupId = group.group_id ?? group.id ?? "";
                return (
                  <article key={groupId} className="p-4 transition-colors hover:bg-[var(--panel)] sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">
                          {group.group_name ?? group.name ?? "Grup WhatsApp"}
                        </h3>
                        <p className="mt-1 break-all text-xs text-[var(--muted)]">{groupId}</p>
                      </div>
                      <Badge tone={isGroupActive(group) ? "income" : "warning"}>
                        {isGroupActive(group) ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Clock3 className="h-4 w-4 shrink-0" />
                      <span>Berakhir {formatDate(group.expire_at ?? group.expired_at)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        className="h-auto min-h-11 min-w-0 gap-1 px-1 text-[10px] sm:px-2 sm:text-xs"
                        disabled={busy === `remove-rental:${groupId}`}
                        onClick={() => removeRental(group)}
                      >
                        <Trash2 className="h-3 w-3" />
                        {busy === `remove-rental:${groupId}` ? "Menghapus..." : "Hapus"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-auto min-h-11 min-w-0 gap-1 px-1 text-[10px] sm:px-2 sm:text-xs"
                        disabled={busy === `reduce-rental:${groupId}`}
                        onClick={() => adjustRental(groupId, "reduce")}
                        title={`Kurangi ${Math.max(Number(days || 30), 1)} hari`}
                      >
                        <Minus className="h-3 w-3" />
                        {busy === `reduce-rental:${groupId}` ? "Memproses..." : "Kurangi Sewa"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-auto min-h-11 min-w-0 gap-1 px-1 text-[10px] sm:px-2 sm:text-xs"
                        disabled={busy === `add-rental:${groupId}`}
                        onClick={() => adjustRental(groupId, "add")}
                        title={`Tambah ${Math.max(Number(days || 30), 1)} hari`}
                      >
                        <Plus className="h-3 w-3" />
                        {busy === `add-rental:${groupId}` ? "Memproses..." : "Tambah Sewa"}
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="p-4 sm:p-5">
                <EmptyOwnerState text="Tidak ada grup yang cocok dengan pencarian." />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[18px] p-4 sm:p-5">
            <SectionTitle
              icon={Power}
              title="Atur Masa Sewa"
              description="Aktifkan atau nonaktifkan akses grup terpilih."
            />
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                submitRental(true);
              }}
            >
              <label className="block text-sm font-medium">
                Group ID
                <Input
                  className="mt-2"
                  value={targetGroupId}
                  onChange={(event) => setTargetGroupId(event.target.value)}
                  placeholder="120363xxx@g.us"
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Durasi sewa
                <div className="relative mt-2">
                  <Input
                    className="pr-14"
                    value={days}
                    onChange={(event) => setDays(event.target.value)}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    placeholder="30"
                  />
                  <span className="pointer-events-none absolute right-3 top-3 text-sm text-[var(--muted)]">hari</span>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button disabled={busy === "activate"}>
                  {busy === "activate" ? "Memproses..." : "Aktifkan"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy === "deactivate"}
                  onClick={() => submitRental(false)}
                >
                  {busy === "deactivate" ? "Memproses..." : "Nonaktifkan"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="rounded-[18px] p-4 sm:p-5">
            <SectionTitle
              icon={QrCode}
              title="QRIS Perpanjangan"
              description="Gambar ini ditampilkan kepada admin saat mengajukan perpanjangan."
            />
            <form className="mt-4 space-y-3" onSubmit={saveQris}>
              <ImageDropzone
                label="Upload QRIS Owner"
                description="Tarik gambar ke sini atau pilih dari perangkat."
                file={qrisFile}
                previewUrl={qrisPreviewUrl}
                disabled={busy === "qris"}
                onFileChange={setQrisFile}
                onClear={() => {
                  setQrisUrl("");
                  setQrisPreviewUrl("");
                }}
              />
              <Button className="w-full" disabled={busy === "qris"}>
                {busy === "qris" ? "Menyimpan..." : "Simpan QRIS"}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <Card className="overflow-hidden rounded-[18px]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4 sm:p-5">
            <div>
              <h2 className="font-semibold">Permintaan Perpanjangan</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Verifikasi bukti pembayaran sebelum menyetujui.</p>
            </div>
            {pendingRequests > 0 ? <Badge tone="warning">{pendingRequests} menunggu</Badge> : null}
          </div>
          <div className="divide-y divide-[var(--line)]">
            {requests.length ? (
              requests.map((request) => (
                <article key={request.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-all font-semibold">{request.group_id}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {request.months} bulan · {formatDate(request.created_at)}
                      </p>
                    </div>
                    <RequestStatus status={request.status} />
                  </div>
                  {request.status === "pending" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <Button
                        variant="outline"
                        className="col-span-2 sm:col-span-1"
                        onClick={() => openProofImage(request.proof_image)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Lihat Bukti
                      </Button>
                      <Button
                        disabled={busy === "approve-rental"}
                        onClick={() =>
                          runOwnerAction("approve-rental", {
                            action: "approve-rental",
                            id: request.id,
                          })
                        }
                      >
                        Setujui
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy === "reject-rental"}
                        onClick={() =>
                          runOwnerAction("reject-rental", {
                            action: "reject-rental",
                            id: request.id,
                          })
                        }
                      >
                        Tolak
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="p-4 sm:p-5">
                <EmptyOwnerState text="Belum ada permintaan perpanjangan." />
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-[18px] p-4 sm:p-5">
            <SectionTitle
              icon={Megaphone}
              title="Broadcast"
              description="Kirim pengumuman ke grup aktif atau nomor tertentu."
            />
            <form className="mt-4 space-y-3" onSubmit={(event) => submitBroadcast(event, false)}>
              <label className="block text-sm font-medium">
                Pesan
                <Textarea
                  className="mt-2"
                  value={broadcast}
                  onChange={(event) => setBroadcast(event.target.value)}
                  placeholder="Tulis pengumuman owner"
                  required
                />
              </label>
              <Button className="w-full" disabled={busy === "broadcast"}>
                <Megaphone className="h-4 w-4" />
                {busy === "broadcast" ? "Mengirim..." : "Kirim ke Grup Aktif"}
              </Button>
            </form>
            <div className="my-4 border-t border-[var(--line)]" />
            <form className="space-y-3" onSubmit={(event) => submitBroadcast(event, true)}>
              <label className="block text-sm font-medium">
                Nomor tujuan
                <Input
                  className="mt-2"
                  value={numbers}
                  onChange={(event) => setNumbers(event.target.value)}
                  placeholder="62812xxx, 62813xxx"
                />
              </label>
              <Button className="w-full" variant="outline" disabled={busy === "broadcast-numbers"}>
                {busy === "broadcast-numbers" ? "Mengirim..." : "Kirim ke Nomor"}
              </Button>
            </form>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card className="rounded-[18px] p-4 sm:p-5">
          <SectionTitle
            icon={Server}
            title="Kesehatan Server"
            description="Kondisi layanan bot dan database saat data terakhir diperbarui."
          />
          <dl className="mt-4 grid gap-x-6 sm:grid-cols-2">
            <InfoRow label="Waktu server" value={health?.server_time ?? "-"} />
            <InfoRow label="CPU" value={`${health?.cpu_percent ?? 0}%`} />
            <InfoRow label="RAM" value={`${health?.ram_used_mb ?? 0} MB / ${health?.ram_total_gb ?? 0} GB`} />
            <InfoRow label="Uptime" value={formatUptime(health?.uptime_seconds)} />
            <InfoRow label="Database" value={health?.database_status ?? "-"} />
            <InfoRow label="Bot" value={formatHealthStatus(health?.status)} />
          </dl>
        </Card>
        <Card className="rounded-[18px] border-transparent bg-[var(--primary)] p-5 text-white shadow-[var(--primary-shadow)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10">
            <Database className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="mt-5 text-sm text-emerald-100/70">Penggunaan database</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {dbStats?.database_size_kb ?? 0} KB
          </p>
          <p className="mt-2 text-sm text-emerald-100/70">SQLite BotUang</p>
        </Card>
      </section>

      <p className="px-1 text-xs leading-5 text-[var(--muted)]">
        Backup dan reset total tetap dijalankan melalui WhatsApp owner untuk menjaga konfirmasi aksi kritis.
      </p>
      </div>
  );

  if (embedded) return content;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {content}
    </main>
  );
}

function OwnerMetric({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  primary = false,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
  tone?: "neutral" | "income" | "warning";
  primary?: boolean;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 rounded-[18px] p-3.5 sm:p-4",
        primary ? "border-transparent bg-[var(--primary)] text-white shadow-[var(--primary-shadow)]" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className={cn("truncate text-xs sm:text-sm", primary ? "text-emerald-100/75" : "text-[var(--muted)]")}>{label}</p>
          <p className="mt-2 truncate text-lg font-semibold tabular-nums sm:text-2xl">{value}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] sm:h-10 sm:w-10", primary ? "bg-white/10" : "bg-[var(--panel)]")}>
          <Icon
            className={
              primary
                ? "h-5 w-5 text-emerald-100"
                : tone === "income"
                ? "h-5 w-5 text-emerald-500"
                : tone === "warning"
                  ? "h-5 w-5 text-amber-400"
                  : "h-5 w-5 text-[var(--muted)]"
            }
          />
        </span>
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--line)] py-3 text-sm last:border-0">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function EmptyOwnerState({ text }: { text: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[var(--panel)] text-emerald-500">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}

function RequestStatus({ status }: { status: RentalRequest["status"] }) {
  if (status === "approved") {
    return (
      <Badge tone="income">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Disetujui
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge tone="expense">
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Ditolak
      </Badge>
    );
  }
  return (
    <Badge tone="warning">
      <Clock3 className="mr-1 h-3.5 w-3.5" />
      Menunggu
    </Badge>
  );
}

function isGroupActive(group: OwnerGroup) {
  return (
    group.is_active === true ||
    group.is_active === 1 ||
    group.status === "active" ||
    group.rental_status === "active"
  );
}

function formatUptime(seconds?: number) {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}j ${minutes}m`;
}

function formatHealthStatus(status?: string) {
  const normalized = status?.trim().toLowerCase();
  if (!normalized || normalized === "unknown") return "Tidak tersedia";
  if (["ok", "healthy", "online", "connected", "active"].includes(normalized)) return "Terhubung";
  return status ?? "Tidak tersedia";
}
