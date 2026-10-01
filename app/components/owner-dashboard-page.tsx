"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Database,
  LogOut,
  Megaphone,
  Power,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DASHBOARD_SESSION_KEY } from "@/app/lib/constants";
import { resolveTrustedBotApiUrl } from "@/app/lib/bot-api";
import { formatDate } from "@/app/lib/format";
import { supabase } from "@/app/lib/supabase";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
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

const featureGroups = [
  {
    role: "User",
    items: ["role", "pt", "trx", "calc", "wthr", "todo", "cmd"],
  },
  {
    role: "Admin",
    items: [
      "dash",
      "+ / - transaksi",
      "trx detail",
      "edittrx",
      "deltrx",
      "addpt/editpt/delpt",
      "sethead",
      "addcmd/editcmd/delcmd",
      "typo",
      "cekbot",
      "pin/newpin",
      "reset grup",
    ],
  },
  {
    role: "Reminder & To-do",
    items: ["r jadwal@pesan", "rl", "delr", "todo+", "doto", "deltodo"],
  },
  {
    role: "Owner",
    items: [
      "#info",
      "#on",
      "#off",
      "#rent",
      "#bc",
      "#bcnomor",
      "#server",
      "#backup",
      "#resettotal",
    ],
  },
];

export function OwnerDashboardPage({ embedded = false }: { embedded?: boolean }) {
  const [apiUrl, setApiUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<OwnerGroup[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [query, setQuery] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [days, setDays] = useState("30");
  const [broadcast, setBroadcast] = useState("");
  const [numbers, setNumbers] = useState("");
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
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const session = stored
      ? (JSON.parse(stored) as { role?: string; apiUrl?: string })
      : null;
    if (session?.role !== "owner") {
      window.location.href = "/login";
      return;
    }

    const resolvedApiUrl = resolveTrustedBotApiUrl(session.apiUrl);
    setApiUrl(resolvedApiUrl);

    async function boot() {
      const auth = await supabase.auth.getSession();
      const token = auth.data.session?.access_token ?? "";
      if (!token) {
        toast.error("Login owner sudah habis. Silakan masuk lagi.");
        window.location.href = "/login";
        return;
      }
      setAccessToken(token);
      await loadOwnerData(token, resolvedApiUrl);
    }

    boot();
  }, []);

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

  async function logout() {
    window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/login";
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
          <Skeleton className="h-20" />
          <Skeleton className="h-36" />
          <Skeleton className="h-96" />
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
      <div className={embedded ? "space-y-5" : "mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-8"}>
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
              Owner SaaS
            </p>
            <h1 className="mt-1 text-2xl font-semibold">BotUang Control Center</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Kelola sewa grup, request pembayaran, broadcast, dan kesehatan server bot.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadOwnerData()} disabled={Boolean(busy)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-4">
          <OwnerMetric label="Total Grup" value={String(groups.length)} icon={ShieldCheck} />
          <OwnerMetric label="Sewa Aktif" value={String(activeGroups)} icon={Power} tone="income" />
          <OwnerMetric label="Request Pending" value={String(pendingRequests)} icon={Activity} tone="warning" />
          <OwnerMetric label="Status Bot" value={health?.status ?? "unknown"} icon={Server} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Status Seluruh Sewa Grup</h2>
                <p className="text-sm text-[var(--muted)]">Setara fitur owner `#rent` dan `#info`.</p>
              </div>
              <label className="relative block md:w-72">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
                <Input
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama / ID grup"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3">
              {filteredGroups.length ? (
                filteredGroups.map((group) => (
                  <button
                    key={group.group_id ?? group.id}
                    className="rounded-2xl border border-[var(--line)] p-3 text-left transition hover:bg-[var(--panel)]"
                    onClick={() => setTargetGroupId(group.group_id ?? group.id ?? "")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {group.group_name ?? group.name ?? "Grup WhatsApp"}
                        </p>
                        <p className="mt-1 break-all text-xs text-[var(--muted)]">
                          {group.group_id ?? group.id}
                        </p>
                        <p className="mt-2 text-sm text-[var(--muted)]">
                          Berakhir: {formatDate(group.expire_at ?? group.expired_at)}
                        </p>
                      </div>
                      <Badge tone={isGroupActive(group) ? "income" : "warning"}>
                        {isGroupActive(group) ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyOwnerState text="Tidak ada grup yang cocok dengan pencarian." />
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-4">
              <h2 className="font-semibold">Aktifkan / Nonaktifkan Sewa</h2>
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitRental(true);
                }}
              >
                <Input
                  value={targetGroupId}
                  onChange={(event) => setTargetGroupId(event.target.value)}
                  placeholder="120363xxx@g.us"
                  required
                />
                <Input
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  type="number"
                  min="1"
                  placeholder="Jumlah hari"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button disabled={busy === "activate"}>
                    {busy === "activate" ? "Memproses..." : "Aktifkan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy === "deactivate"}
                    onClick={() => submitRental(false)}
                  >
                    Nonaktifkan
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="p-4">
              <h2 className="font-semibold">Broadcast Owner</h2>
              <form className="mt-4 space-y-3" onSubmit={(event) => submitBroadcast(event, false)}>
                <Textarea
                  value={broadcast}
                  onChange={(event) => setBroadcast(event.target.value)}
                  placeholder="Pesan untuk semua grup aktif"
                  required
                />
                <Button className="w-full" disabled={busy === "broadcast"}>
                  <Megaphone className="h-4 w-4" />
                  Broadcast Grup Aktif
                </Button>
              </form>
              <form className="mt-4 space-y-3" onSubmit={(event) => submitBroadcast(event, true)}>
                <Input
                  value={numbers}
                  onChange={(event) => setNumbers(event.target.value)}
                  placeholder="62812xxx,62813xxx"
                />
                <Button className="w-full" variant="outline" disabled={busy === "broadcast-numbers"}>
                  Broadcast Nomor
                </Button>
              </form>
            </Card>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <Card className="p-4">
            <h2 className="font-semibold">Rental Requests</h2>
            <div className="mt-4 grid gap-3">
              {requests.length ? (
                requests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-[var(--line)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{request.group_id}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {request.months} bulan - {formatDate(request.created_at)}
                        </p>
                      </div>
                      <Badge tone={request.status === "pending" ? "warning" : "muted"}>
                        {request.status}
                      </Badge>
                    </div>
                    {request.status === "pending" ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            runOwnerAction("approve-rental", {
                              action: "approve-rental",
                              id: request.id,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            runOwnerAction("reject-rental", {
                              action: "reject-rental",
                              id: request.id,
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyOwnerState text="Belum ada request perpanjangan." />
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-4">
              <h2 className="font-semibold">Server Health</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <InfoRow label="Waktu server" value={health?.server_time ?? "-"} />
                <InfoRow label="CPU" value={`${health?.cpu_percent ?? 0}%`} />
                <InfoRow label="RAM" value={`${health?.ram_used_mb ?? 0} MB / ${health?.ram_total_gb ?? 0} GB`} />
                <InfoRow label="Uptime" value={formatUptime(health?.uptime_seconds)} />
                <InfoRow label="Database" value={health?.database_status ?? "-"} />
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="font-semibold">Database Usage</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--panel)]">
                  <Database className="h-5 w-5 text-emerald-500" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">
                    {dbStats?.database_size_kb ?? 0} KB
                  </p>
                  <p className="text-sm text-[var(--muted)]">SQLite BotUang</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <Card className="mt-5 p-4">
          <h2 className="font-semibold">Peta Fitur BotUang V2</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Fitur admin grup tersedia di dashboard grup. Fitur owner SaaS tersedia di halaman ini.
            Aksi kritikal `#backup` dan `#resettotal` tetap dijalankan dari WhatsApp owner untuk keamanan.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {featureGroups.map((group) => (
              <div key={group.role} className="rounded-2xl border border-[var(--line)] p-3">
                <p className="font-semibold">{group.role}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Badge key={item} tone="muted">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
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
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
  tone?: "neutral" | "income" | "warning";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--panel)]">
          <Icon
            className={
              tone === "income"
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function EmptyOwnerState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] p-5 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
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
