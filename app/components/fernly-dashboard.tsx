"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bot,
  BookOpen,
  CalendarClock,
  Calculator,
  ChartNoAxesCombined,
  Check,
  CircleDollarSign,
  CloudSun,
  ClipboardCheck,
  Download,
  Home,
  ListTodo,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
  Sun,
  Trash2,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { DASHBOARD_SESSION_KEY } from "@/app/lib/constants";
import { daysLeft, formatDate, formatRupiah } from "@/app/lib/format";
import { resolveDashboardImage, uploadDashboardImage } from "@/app/lib/image-upload";
import { supabase } from "@/app/lib/supabase";
import { cn } from "@/app/lib/utils";
import { OwnerDashboardPage } from "./owner-dashboard-page";
import { Badge } from "./ui/badge";
import { AiThinkingOrbAndInput } from "./ui/ai-thinking-orb-and-input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ImageDropzone } from "./ui/image-dropzone";
import { Input, Textarea } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type DashboardSection =
  | "overview"
  | "transactions"
  | "reports"
  | "participants"
  | "todos"
  | "reminders"
  | "commands"
  | "settings"
  | "calculator"
  | "help"
  | "owner";

type Transaction = {
  id: string;
  group_id: string;
  type: "income" | "expense";
  amount: number;
  note: string | null;
  sender_id: string | null;
  sender_name: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Participant = {
  id: string;
  group_id: string;
  name: string;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

type Todo = {
  id: string;
  group_id: string;
  todo_text: string;
  is_done: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

type Reminder = {
  id: string;
  group_id: string;
  remind_type: string;
  remind_value: string;
  remind_text: string;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
};

type Command = {
  id: string;
  group_id: string;
  keyword: string;
  response: string;
  media_path: string | null;
  media_type: string | null;
  caption_text: string | null;
  created_at: string;
  deleted_at: string | null;
};

type Rental = {
  group_id: string;
  is_active: boolean | null;
  start_at: string | null;
  expire_at: string | null;
  password: string | null;
  group_name: string | null;
};

type GroupSettings = {
  group_id: string;
  header_text: string | null;
  weather_location: string | null;
  azan_location?: string | null;
  emergency_location?: string | null;
  location_name?: string | null;
  location_latitude?: number | string | null;
  location_longitude?: number | string | null;
  location_timezone?: string | null;
  weather_enabled?: boolean | null;
  azan_enabled?: boolean | null;
  emergency_enabled?: boolean | null;
  prayer_enabled?: boolean | null;
  prayer_method?: number | string | null;
  prayer_subuh_enabled?: boolean | null;
  prayer_dzuhur_enabled?: boolean | null;
  prayer_ashar_enabled?: boolean | null;
  prayer_maghrib_enabled?: boolean | null;
  prayer_isya_enabled?: boolean | null;
  prayer_reminder_offset_minutes?: number | string | null;
  prayer_last_check_at?: string | null;
  prayer_last_error?: string | null;
  typo_enabled: boolean | null;
  spreadsheet_url?: string | null;
  updated_at: string | null;
};

type PrayerStatus = {
  ok: boolean;
  configured?: boolean;
  status?: "active" | "disabled" | "incomplete" | "error";
  message?: string;
  location?: string;
  timezone?: string;
  timezoneLabel?: string;
  scheduleLoaded?: boolean;
  schedule?: Record<string, string>;
  nextPrayer?: {
    key: string;
    time: string;
    minutesUntil: number | null;
  } | null;
  reminderOffsetMinutes?: number;
  scheduler?: string;
  lastCheckAt?: string;
  lastError?: string | null;
};

type AccessibleGroup = {
  group_id: string;
  group_name: string | null;
  role: "admin" | "owner";
  is_active?: boolean | null;
  expire_at?: string | null;
};

type DashboardUser = {
  name: string;
  email: string;
};

type BotStatus = {
  ok: boolean;
  status?: string;
  message?: string;
};

type BotGroupDataResponse = {
  ok?: boolean;
  data?: unknown;
  message?: string;
};

type BotReminderPayload = {
  id?: string | number;
  group_id?: string;
  remind_type?: string;
  remind_value?: string;
  remind_text?: string;
  message?: string;
  schedule?: string;
  created_by?: string | null;
  created_at?: string;
  deleted_at?: string | null;
};

type BotParticipantPayload = {
  id?: string | number;
  group_id?: string;
  name?: string;
  phone?: string;
  note?: string;
  data?: Record<string, unknown> | null;
};

type BotTodoPayload = {
  id?: string | number;
  group_id?: string;
  title?: string;
  todo_text?: string;
  done?: boolean;
  is_done?: boolean;
};

type BotCommandPayload = {
  id?: string | number;
  group_id?: string;
  keyword?: string;
  response?: string;
  image_url?: string | null;
  media_path?: string | null;
};

const DASHBOARD_SYNCED_SENDER_ID = "dashboard_synced";

const navItems = [
  { key: "overview", label: "Ringkasan", href: "/dashboard/#overview", icon: Home },
  { key: "transactions", label: "Transaksi", href: "/dashboard/#transactions", icon: WalletCards },
  { key: "reports", label: "Laporan", href: "/dashboard/#reports", icon: ChartNoAxesCombined },
  { key: "todos", label: "Todo", href: "/dashboard/#todos", icon: ListTodo },
  { key: "reminders", label: "Kalender", href: "/dashboard/#reminders", icon: CalendarClock },
  { key: "participants", label: "Anggota", href: "/dashboard/#participants", icon: Users },
  { key: "commands", label: "Otomasi", href: "/dashboard/#commands", icon: Bot },
  { key: "settings", label: "Pengaturan", href: "/dashboard/#settings", icon: Settings },
  { key: "help", label: "Bantuan", href: "/dashboard/#help", icon: BookOpen },
  { key: "owner", label: "Owner", href: "/dashboard/#owner", icon: ShieldCheck },
] as const;

const dashboardSectionKeys: DashboardSection[] = [
  "overview",
  "transactions",
  "reports",
  "participants",
  "todos",
  "reminders",
  "commands",
  "settings",
  "calculator",
  "help",
  "owner",
];
const dashboardSectionSet = new Set<DashboardSection>(dashboardSectionKeys);

function resolveSectionFromPath(pathname: string): DashboardSection {
  if (pathname.endsWith("/transactions")) return "transactions";
  if (pathname.endsWith("/reports")) return "reports";
  if (pathname.endsWith("/participants")) return "participants";
  if (pathname.endsWith("/todos")) return "todos";
  if (pathname.endsWith("/reminders")) return "reminders";
  if (pathname.endsWith("/commands")) return "commands";
  if (pathname.endsWith("/settings")) return "settings";
  if (pathname.endsWith("/calculator")) return "calculator";
  if (pathname.endsWith("/help")) return "help";
  if (pathname.endsWith("/owner")) return "owner";
  return "overview";
}

function resolveSectionFromHash(): DashboardSection | null {
  if (typeof window === "undefined") return null;
  const value = window.location.hash.replace("#", "") as DashboardSection;
  return dashboardSectionSet.has(value) ? value : null;
}

function resolveInitialSection(pathname: string): DashboardSection {
  return resolveSectionFromHash() ?? resolveSectionFromPath(pathname);
}

function sectionHref(section: DashboardSection) {
  return `/dashboard/#${section}`;
}

const navGroups = [
  {
    label: "Keuangan",
    items: ["overview", "transactions", "reports", "todos", "reminders"],
  },
  {
    label: "Grup",
    items: ["participants", "commands"],
  },
  {
    label: "Umum",
    items: ["settings", "help"],
  },
  {
    label: "Owner",
    items: ["owner"],
  },
] as const;

function getNavItem(key: DashboardSection) {
  return navItems.find((item) => item.key === key);
}

function displayGroupName(groupName: string, groupId?: string) {
  const value = groupName || groupId || "Grup BotUang";
  if (value.includes("@g.us")) return "Grup WhatsApp";
  if (value.length > 34) return `${value.slice(0, 31)}...`;
  return value;
}

function getBotStatusDisplay(botStatus: BotStatus | null) {
  if (botStatus === null) {
    return { label: "Memeriksa koneksi...", tone: "checking" as const };
  }

  if (botStatus.ok || botStatus.status === "connected") {
    return { label: "Bot Terhubung", tone: "connected" as const };
  }

  if (botStatus.status === "api_unreachable") {
    return { label: "Server Bot Tidak Dapat Dijangkau", tone: "unreachable" as const };
  }

  if (botStatus.status === "configuration_error") {
    return { label: "Status Bot Tidak Tersedia", tone: "configuration" as const };
  }

  return { label: "Bot Tidak Terhubung", tone: "disconnected" as const };
}

function getUserInitials(user: DashboardUser) {
  const source = user.name || user.email || "U";
  const parts = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "U";
}

function isConfirmedTransaction(item: Transaction) {
  const senderName = (item.sender_name ?? "").trim().toLowerCase();
  const dashboardSender = senderName === "ai dashboard" || senderName === "dashboard";
  return !dashboardSender || item.sender_id === DASHBOARD_SYNCED_SENDER_ID;
}

function normalizeBotReminders(data: unknown, groupId: string): Reminder[] | null {
  if (!Array.isArray(data)) return null;

  return data.map((item) => {
    const reminder = item as BotReminderPayload;
    const parsedSchedule = parseReminderSchedule(reminder.schedule);
    const createdAt = reminder.created_at ?? new Date().toISOString();

    return {
      id: String(reminder.id ?? `${groupId}-${reminder.message ?? createdAt}`),
      group_id: reminder.group_id ?? groupId,
      remind_type: reminder.remind_type ?? parsedSchedule.type,
      remind_value: reminder.remind_value ?? parsedSchedule.value,
      remind_text: reminder.remind_text ?? reminder.message ?? "Reminder",
      created_by: reminder.created_by ?? "BotUang",
      created_at: createdAt,
      deleted_at: reminder.deleted_at ?? null,
    };
  });
}

function normalizeBotParticipants(data: unknown, groupId: string): Participant[] | null {
  if (!Array.isArray(data)) return null;

  return data.map((item) => {
    const participant = item as BotParticipantPayload;
    return {
      id: String(participant.id ?? `${groupId}-${participant.name}`),
      group_id: participant.group_id ?? groupId,
      name: participant.name ?? "Anggota",
      data:
        participant.data ??
        ({
          phone: participant.phone ?? "",
          note: participant.note ?? "",
          status: "unpaid",
        } satisfies Record<string, unknown>),
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };
  });
}

function normalizeBotTodos(data: unknown, groupId: string): Todo[] | null {
  if (!Array.isArray(data)) return null;

  return data.map((item) => {
    const todo = item as BotTodoPayload;
    return {
      id: String(todo.id ?? `${groupId}-${todo.title ?? todo.todo_text}`),
      group_id: todo.group_id ?? groupId,
      todo_text: todo.todo_text ?? todo.title ?? "Todo",
      is_done: Boolean(todo.is_done ?? todo.done),
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };
  });
}

function normalizeBotCommands(data: unknown, groupId: string): Command[] | null {
  if (!Array.isArray(data)) return null;

  return data.map((item) => {
    const command = item as BotCommandPayload;
    return {
      id: String(command.id ?? `${groupId}-${command.keyword}`),
      group_id: command.group_id ?? groupId,
      keyword: command.keyword ?? "",
      response: command.response ?? "",
      media_path: command.media_path ?? command.image_url ?? null,
      media_type: command.image_url || command.media_path ? "image" : null,
      caption_text: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };
  });
}

function parseReminderSchedule(schedule?: string) {
  const fallback = { type: "time", value: "" };
  if (!schedule) return fallback;

  const [type, ...rest] = schedule.trim().split(/\s+/);
  if (!type || !rest.length) return fallback;

  return {
    type,
    value: rest.join(" "),
  };
}

const USE_CANONICAL_SUPABASE_DATA =
  process.env.NEXT_PUBLIC_CANONICAL_DATA_SOURCE === "supabase";

function shouldWriteLegacyBot(botApiUrl: string) {
  return !USE_CANONICAL_SUPABASE_DATA && Boolean(botApiUrl);
}

function resolveDataList<T>(botItems: T[] | null, supabaseItems: T[]): T[] {
  if (USE_CANONICAL_SUPABASE_DATA) return supabaseItems;
  if (botItems && botItems.length > 0) return botItems;
  if (supabaseItems && supabaseItems.length > 0) return supabaseItems;
  return botItems ?? supabaseItems ?? [];
}

async function fetchBotGroupData({
  resource,
  groupId,
  apiUrl,
  method = "GET",
  id,
  body,
}: {
  resource: string;
  groupId: string;
  apiUrl: string;
  token: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  id?: string | number;
  body?: Record<string, unknown>;
}): Promise<BotGroupDataResponse> {
  const auth = await supabase.auth.getSession();
  const accessToken = auth.data.session?.access_token ?? "";
  if (!accessToken) {
    return { ok: false, message: "Session dashboard tidak valid" };
  }

  const idQuery = id ? `&id=${encodeURIComponent(String(id))}` : "";
  const query = `resource=${encodeURIComponent(resource)}&group_id=${encodeURIComponent(groupId)}&api_url=${encodeURIComponent(apiUrl)}${idQuery}`;
  const requestInit: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    const response = await fetch(`/api/bot/group-data?${query}`, requestInit);
    return (await response.json()) as BotGroupDataResponse;
  } catch {
    return { ok: false, message: "Data bot tidak tersedia" };
  }
}

export function FernlyDashboard({ preview = false }: { preview?: boolean }) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<DashboardSection>(() =>
    resolveInitialSection(pathname),
  );
  const [groupId, setGroupId] = useState(preview ? "visual-test@g.us" : "");
  const [sessionToken, setSessionToken] = useState("");
  const [botApiUrl, setBotApiUrl] = useState("");
  const [groupName, setGroupName] = useState(
    preview ? "Preview Grup BotUang" : "Grup WhatsApp",
  );
  const [groups, setGroups] = useState<AccessibleGroup[]>(
    preview
      ? [{ group_id: "visual-test@g.us", group_name: "Preview Grup BotUang", role: "owner" }]
      : [],
  );
  const [loading, setLoading] = useState(!preview);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [rental, setRental] = useState<Rental | null>(null);
  const [settings, setSettings] = useState<GroupSettings | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(
    preview ? { ok: true, status: "connected" } : null,
  );
  const [role, setRole] = useState<"admin" | "owner">(preview ? "owner" : "admin");
  const [currentUser, setCurrentUser] = useState<DashboardUser>({
    name: preview ? "Owner BotUang" : "",
    email: preview ? "owner@example.test" : "",
  });
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<
    "all" | "income" | "expense"
  >("all");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const loggingOutRef = useRef(false);

  function navigateDashboardSection(section: DashboardSection) {
    setActiveSection(section);
    setMenuOpen(false);
    if (typeof window !== "undefined") {
      window.history.pushState(
        null,
        "",
        preview ? `/preview-dashboard#${section}` : sectionHref(section),
      );
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  useEffect(() => {
    const updateFromLocation = () => {
      setActiveSection(resolveInitialSection(window.location.pathname));
    };

    const sectionFromLegacyPath = resolveSectionFromPath(window.location.pathname);
    if (window.location.pathname !== "/dashboard" && !window.location.hash) {
      window.history.replaceState(null, "", sectionHref(sectionFromLegacyPath));
    }

    updateFromLocation();
    window.addEventListener("hashchange", updateFromLocation);
    window.addEventListener("popstate", updateFromLocation);
    return () => {
      window.removeEventListener("hashchange", updateFromLocation);
      window.removeEventListener("popstate", updateFromLocation);
    };
  }, [pathname]);

  async function loadData(
    targetGroupId = groupId,
    authToken = sessionToken,
    apiUrl = botApiUrl,
  ) {
    if (!targetGroupId) {
      setBotStatus({ ok: false, message: "Pilih atau hubungkan grup dulu" });
      setLoading(false);
      return;
    }
    const hasExistingData =
      transactions.length > 0 ||
      participants.length > 0 ||
      todos.length > 0 ||
      reminders.length > 0 ||
      commands.length > 0 ||
      Boolean(rental) ||
      Boolean(settings);

    if (!hasExistingData) setLoading(true);
    const loadBotResource = (resource: string) =>
      preview
        ? Promise.resolve({ ok: true, data: [] } satisfies BotGroupDataResponse)
        : fetchBotGroupData({
            resource,
            groupId: targetGroupId,
            apiUrl,
            token: authToken,
          });
    const [
      txResult,
      participantResult,
      todoResult,
      reminderResult,
      commandResult,
      rentalResult,
      settingResult,
      botResult,
      botParticipantResult,
      botTodoResult,
      botReminderResult,
      botCommandResult,
    ] = await Promise.all([
      preview
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("transactions").select("*").eq("group_id", targetGroupId).is("deleted_at", null).order("created_at", { ascending: false }),
      preview
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("participants").select("*").eq("group_id", targetGroupId).is("deleted_at", null).order("created_at", { ascending: false }),
      preview
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("todos").select("*").eq("group_id", targetGroupId).is("deleted_at", null).order("created_at", { ascending: false }),
      preview
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("reminders").select("*").eq("group_id", targetGroupId).is("deleted_at", null).order("created_at", { ascending: false }),
      preview
        ? Promise.resolve({ data: [], error: null })
        : supabase.from("custom_commands").select("*").eq("group_id", targetGroupId).is("deleted_at", null).order("created_at", { ascending: false }),
      preview
        ? Promise.resolve({
            data: {
              group_id: targetGroupId,
              group_name: "Preview Grup BotUang",
              is_active: true,
              start_at: null,
              expire_at: "2029-06-18T23:59:00.000+07:00",
              updated_at: null,
              password: null,
            },
            error: null,
          })
        : supabase.from("group_rentals").select("*").eq("group_id", targetGroupId).maybeSingle(),
      preview
        ? Promise.resolve({ data: null, error: null })
        : supabase.from("group_settings").select("*").eq("group_id", targetGroupId).maybeSingle(),
      fetch(
        `/api/bot/status?group_id=${encodeURIComponent(targetGroupId)}&api_url=${encodeURIComponent(apiUrl)}`,
        {
          headers: authToken
            ? {
                Authorization: `Bearer ${authToken}`,
              }
            : undefined,
        },
      )
        .then((response) => response.json())
        .catch(() => ({ ok: false, message: "Status bot tidak tersedia" })),
      loadBotResource("participants"),
      loadBotResource("todos"),
      loadBotResource("reminders"),
      loadBotResource("commands"),
    ]);

    if (txResult.error) toast.error(txResult.error.message);
    const botParticipants = botParticipantResult.ok
      ? normalizeBotParticipants(botParticipantResult.data, targetGroupId)
      : null;
    const botTodos = botTodoResult.ok
      ? normalizeBotTodos(botTodoResult.data, targetGroupId)
      : null;
    const botReminders = botReminderResult.ok
      ? normalizeBotReminders(botReminderResult.data, targetGroupId)
      : null;
    const botCommands = botCommandResult.ok
      ? normalizeBotCommands(botCommandResult.data, targetGroupId)
      : null;

    setTransactions(((txResult.data ?? []) as Transaction[]).filter(isConfirmedTransaction));
    setParticipants(
      resolveDataList(botParticipants, (participantResult.data ?? []) as Participant[]),
    );
    setTodos(
      resolveDataList(botTodos, (todoResult.data ?? []) as Todo[]),
    );
    setReminders(
      resolveDataList(botReminders, (reminderResult.data ?? []) as Reminder[]),
    );
    setCommands(
      resolveDataList(botCommands, (commandResult.data ?? []) as Command[]),
    );
    const rentalData = (rentalResult.data as Rental | null) ?? null;
    setRental(rentalData);
    setSettings((settingResult.data as GroupSettings | null) ?? null);
    setBotStatus(botResult as BotStatus);
    if (rentalData?.group_name) setGroupName(rentalData.group_name);
    setLoading(false);
  }

  async function loadAccessibleGroups() {
    const auth = await supabase.auth.getSession();
    const accessToken = auth.data.session?.access_token ?? "";
    const collected = new Map<string, AccessibleGroup>();

    if (accessToken) {
      const accessGroups = await fetch("/api/access/groups", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then(
          (response) =>
            response.json() as Promise<{
              ok?: boolean;
              groups?: AccessibleGroup[];
              platform_role?: "admin" | "owner";
            }>,
        )
        .catch(() => ({
          ok: false,
          groups: [] as AccessibleGroup[],
          platform_role: undefined as "admin" | "owner" | undefined,
        }));

      if (accessGroups.ok) {
        if (accessGroups.platform_role) {
          setRole(accessGroups.platform_role);
        }
        for (const group of accessGroups.groups ?? []) {
          collected.set(group.group_id, group);
        }
      }
    }

    const nextGroups = Array.from(collected.values());
    setGroups(nextGroups);
    return nextGroups;
  }

  function selectGroup(group: AccessibleGroup) {
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const session = stored ? JSON.parse(stored) : {};
    const nextSession = {
      ...session,
      groupId: group.group_id,
      groupName: group.group_name ?? "Grup WhatsApp",
      role,
    };

    window.localStorage.setItem(DASHBOARD_SESSION_KEY, JSON.stringify(nextSession));
    setGroupId(group.group_id);
    setGroupName(group.group_name ?? "Grup WhatsApp");
    setTransactions([]);
    setParticipants([]);
    setTodos([]);
    setReminders([]);
    setCommands([]);
    setRental(null);
    setSettings(null);
    setBotStatus(null);
    setLoading(true);
    loadData(group.group_id, sessionToken, botApiUrl);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const session = (stored ? JSON.parse(stored) : {}) as {
      groupId?: string;
      groupName?: string;
      token?: string;
      apiUrl?: string;
      role?: "admin" | "owner";
      userName?: string;
      userEmail?: string;
      ownerEmail?: string;
    };

    async function bootDashboard() {
      if (preview) {
        return;
      }

      const auth = await supabase.auth.getSession();
      const accessToken = auth.data.session?.access_token ?? "";
      if (!accessToken) {
        router.push("/login");
        return;
      }

      const accessibleGroups = await loadAccessibleGroups();
      const authUser = auth.data.session?.user;
      const authUserName =
        (authUser?.user_metadata?.full_name as string | undefined) ??
        (authUser?.user_metadata?.name as string | undefined) ??
        session.userName ??
        "";
      const authUserEmail =
        authUser?.email ?? session.userEmail ?? session.ownerEmail ?? "";
      setCurrentUser({
        name: authUserName,
        email: authUserEmail,
      });
      let platformRole = session.role ?? "admin";

      if (accessToken) {
        const profile = await fetch("/api/access/groups", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(
            (response) =>
              response.json() as Promise<{
                ok?: boolean;
                platform_role?: "admin" | "owner";
              }>,
          )
          .catch(() => ({
            ok: false,
            platform_role: undefined as "admin" | "owner" | undefined,
          }));

        platformRole = profile.platform_role ?? platformRole;
      }

      setRole(platformRole);

      if (activeSection === "owner") {
        if (platformRole !== "owner") {
          navigateDashboardSection("overview");
          return;
        }
        setGroupName("Owner Control");
        setBotStatus({ ok: false, message: "Pilih grup untuk status bot" });
        setLoading(false);
        return;
      }

      const activeGroup =
        (session.groupId
          ? accessibleGroups.find((group) => group.group_id === session.groupId)
          : undefined) ?? accessibleGroups[0];

      if (!activeGroup) {
        if (platformRole === "owner") {
          navigateDashboardSection("owner");
          setGroupName("Owner Control");
          setBotStatus({ ok: false, message: "Pilih grup untuk status bot" });
          setLoading(false);
        } else {
          setGroupId("");
          setGroupName("Grup WhatsApp");
          setBotStatus({ ok: false, message: "Pilih grup untuk status bot" });
          setTransactions([]);
          setParticipants([]);
          setTodos([]);
          setReminders([]);
          setCommands([]);
          setRental(null);
          setSettings(null);
          setLoading(false);
        }
        return;
      }

      const nextSession = {
        ...session,
        role: platformRole,
        groupId: activeGroup.group_id,
        groupName: activeGroup.group_name ?? "Grup WhatsApp",
        userName: authUserName,
        userEmail: authUserEmail,
      };

      if (loggingOutRef.current) return;

      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify(nextSession),
      );
      setGroupId(nextSession.groupId);
      setSessionToken(nextSession.token ?? "");
      setBotApiUrl(nextSession.apiUrl ?? "");
      setGroupName(nextSession.groupName);
      loadData(nextSession.groupId, nextSession.token ?? "", nextSession.apiUrl ?? "");
    }

    bootDashboard();
  }, [preview]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("botuang.theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      const frame = window.requestAnimationFrame(() => setTheme(storedTheme));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!loading && activeSection === "owner" && role !== "owner") {
      const frame = window.requestAnimationFrame(() => {
        navigateDashboardSection("overview");
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [activeSection, loading, role]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("botuang.theme", next);
  }

  async function logout() {
    loggingOutRef.current = true;
    window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
    await supabase.auth.signOut().catch(() => undefined);
    window.localStorage.removeItem(DASHBOARD_SESSION_KEY);
    toast.success("Logout berhasil.");
    router.replace("/login");
  }

  const summary = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const noteMatch = (item.note ?? "")
        .toLowerCase()
        .includes(query.toLowerCase());
      const senderMatch = (item.sender_name ?? "")
        .toLowerCase()
        .includes(query.toLowerCase());
      const time = new Date(item.created_at).getTime();
      const after = fromDate ? time >= new Date(fromDate).getTime() : true;
      const before = toDate
        ? time <= new Date(`${toDate}T23:59:59`).getTime()
        : true;
      const typeMatch =
        transactionTypeFilter === "all" || item.type === transactionTypeFilter;
      return (noteMatch || senderMatch) && after && before && typeMatch;
    });
  }, [fromDate, query, toDate, transactionTypeFilter, transactions]);

  const monthlyChart = useMemo(
    () => buildCashflow(transactions, "month"),
    [transactions],
  );
  const weeklyChart = useMemo(
    () => buildCashflow(transactions, "week"),
    [transactions],
  );

  function exportTransactions() {
    const rows = [
      ["Tanggal", "Jenis", "Nominal", "Catatan", "Pengirim"],
      ...filteredTransactions.map((item) => [
        formatDate(item.created_at),
        item.type,
        String(item.amount),
        item.note ?? "",
        item.sender_name ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `botuang-${groupId}-transactions.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Transaksi diekspor ke CSV.");
  }

  const days = daysLeft(rental?.expire_at);
  const visibleNavItems =
    role === "owner"
      ? navItems
      : navItems.filter((item) => item.key !== "owner");

  return (
    <main className="fernly-app min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fernly-sidebar hidden xl:flex">
        <Brand
          groupId={groupId}
          groupName={groupName}
          groups={groups}
          botStatus={botStatus}
          onSelectGroup={selectGroup}
        />
        <nav className="fernly-nav mt-7 flex-1">
          {navGroups.map((group) => {
            const items = group.items
              .map((key) => getNavItem(key))
              .filter((item): item is (typeof navItems)[number] => Boolean(item))
              .filter((item) => visibleNavItems.some((visible) => visible.key === item.key));
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-6">
                <p className="fernly-nav__label">
                  {group.label}
                </p>
                <div>
                  {items.map((item) => (
                    <NavLink
                      key={item.key}
                      item={item}
                      active={activeSection === item.key}
                      href={preview ? `/preview-dashboard#${item.key}` : item.href}
                      onNavigate={() => navigateDashboardSection(item.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <SidebarPromo botStatus={botStatus} />
      </aside>

      {/* Shell: topbar + board */}
      <div className="fernly-shell min-w-0 pb-24 xl:pb-0">
        <header className="fernly-topbar">
            <div className="flex w-full items-center justify-between gap-2.5 md:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 xl:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Buka menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1 xl:hidden">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      botStatus === null
                        ? "bg-amber-400"
                        : botStatus.ok
                          ? "bg-emerald-400"
                          : "bg-rose-400",
                    )}
                  />
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {displayGroupName(groupName, groupId)}
                  </p>
                </div>
                <p className="truncate text-base font-semibold sm:text-lg">
                  {visibleNavItems.find((item) => item.key === activeSection)?.label}
                </p>
                {activeSection !== "owner" && groups.length > 1 ? (
                  <select
                    value={groupId}
                    onChange={(event) => {
                      const selected = groups.find(
                        (group) => group.group_id === event.target.value,
                      );
                      if (selected) selectGroup(selected);
                    }}
                    className="mt-2 min-h-10 w-full max-w-xs rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm xl:hidden"
                    aria-label="Pilih grup aktif"
                  >
                    {groups.map((group) => (
                      <option key={group.group_id} value={group.group_id}>
                        {group.group_name ?? "Grup WhatsApp"}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className="hidden min-w-[280px] max-w-[380px] flex-1 items-center relative xl:flex">
                <Search className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari transaksi, anggota, catatan..."
                  className="h-[50px] w-full rounded-full bg-[var(--card)] pl-[50px] pr-[64px] text-[15px] outline-none shadow-sm transition placeholder:text-[var(--muted-2)] focus-visible:shadow-[var(--focus-ring)]"
                  aria-label="Cari data dashboard"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-[7px] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">
                  Ctrl K
                </kbd>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Notifikasi"
                  className="hidden h-[48px] w-[48px] rounded-full bg-[var(--card)] shadow-sm hover:-translate-y-0.5 md:inline-flex"
                >
                  <Bell className="h-5 w-5 text-[var(--foreground)]" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Ganti tema"
                  className="h-[48px] w-[48px] rounded-full bg-[var(--card)] shadow-sm hover:-translate-y-0.5"
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                {groupId && !["owner", "overview", "transactions", "reports", "calculator", "help"].includes(activeSection) ? (
                  <TransactionSheet
                    groupId={groupId}
                    sessionToken={sessionToken}
                    botApiUrl={botApiUrl}
                    onSaved={() => loadData()}
                  />
                ) : null}
                <div className="flex h-[48px] items-center gap-3 rounded-full bg-[var(--card)] p-1.5 pr-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5c5ac] text-xs font-bold text-[#4d3124]">
                    {getUserInitials(currentUser)}
                  </span>
                  <div className="hidden min-w-0 xl:block">
                    <p className="max-w-32 truncate text-sm font-semibold leading-tight">
                      {currentUser.name || "User BotUang"}
                    </p>
                    <p className="max-w-32 truncate text-xs leading-tight text-[var(--muted)]">
                      {currentUser.email || role}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden xl:inline-flex"
                  onClick={logout}
                  aria-label={`Logout ${currentUser.name || currentUser.email || "user"}`}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeSection}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
              className="fernly-board"
            >
              {!loading && !groupId && !["owner", "help"].includes(activeSection) ? (
                <NoGroupsEmptyState />
              ) : null}
              {groupId && activeSection === "overview" ? (
                <Overview
                  groupId={groupId}
                  groupName={groupName}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  loading={loading}
                  summary={summary}
                  monthlyChart={monthlyChart}
                  weeklyChart={weeklyChart}
                  transactions={filteredTransactions}
                  todos={todos}
                  reminders={reminders}
                  query={query}
                  setQuery={setQuery}
                  fromDate={fromDate}
                  setFromDate={setFromDate}
                  toDate={toDate}
                  setToDate={setToDate}
                  transactionTypeFilter={transactionTypeFilter}
                  setTransactionTypeFilter={setTransactionTypeFilter}
                  onExport={exportTransactions}
                  onSaved={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "transactions" ? (
                <TransactionsPage
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  loading={loading}
                  transactions={filteredTransactions}
                  query={query}
                  setQuery={setQuery}
                  fromDate={fromDate}
                  setFromDate={setFromDate}
                  toDate={toDate}
                  setToDate={setToDate}
                  transactionTypeFilter={transactionTypeFilter}
                  setTransactionTypeFilter={setTransactionTypeFilter}
                  onExport={exportTransactions}
                  onSaved={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "reports" ? (
                <ReportsPage
                  loading={loading}
                  summary={summary}
                  monthlyChart={monthlyChart}
                  weeklyChart={weeklyChart}
                  transactions={transactions}
                />
              ) : null}
              {groupId && activeSection === "participants" ? (
                <ParticipantsPage
                  loading={loading}
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  participants={participants}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "todos" ? (
                <TodosPage
                  loading={loading}
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  todos={todos}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "reminders" ? (
                <RemindersPage
                  loading={loading}
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  reminders={reminders}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "commands" ? (
                <CommandsPage
                  loading={loading}
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  commands={commands}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "settings" ? (
                <SettingsPage
                  loading={loading}
                  groupId={groupId}
                  sessionToken={sessionToken}
                  botApiUrl={botApiUrl}
                  rental={rental}
                  settings={settings}
                  days={days}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "calculator" ? <CalculatorPage /> : null}
              {activeSection === "help" ? <HelpPage role={role} /> : null}
              {activeSection === "owner" ? <OwnerDashboardPage embedded preview={preview} /> : null}
            </motion.div>
          </AnimatePresence>
          {groupId && activeSection !== "owner" ? (
            <>
              <CalculatorBubble />
              <AiCommandBar
                groupId={groupId}
                groupName={groupName}
                sessionToken={sessionToken}
                botApiUrl={botApiUrl}
                summary={summary}
                transactions={transactions}
                onSaved={() => loadData()}
              />
            </>
          ) : null}
        </div>

      <MobileNav
        section={activeSection}
        role={role}
        groupId={groupId}
        groupName={groupName}
        summary={summary}
        transactions={transactions}
        sessionToken={sessionToken}
        botApiUrl={botApiUrl}
        onSaved={() => loadData()}
        onNavigate={navigateDashboardSection}
      />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent>
          <SheetTitle>Menu BotUang</SheetTitle>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--panel)] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-emerald-500 text-sm font-bold text-white">
                {getUserInitials(currentUser)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {currentUser.name || "User BotUang"}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {currentUser.email || role}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout user">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 grid gap-2">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                active={activeSection === item.key}
                href={preview ? `/preview-dashboard#${item.key}` : item.href}
                onNavigate={() => navigateDashboardSection(item.key)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function Brand({
  groupId,
  groupName,
  groups,
  botStatus,
  onSelectGroup,
}: {
  groupId: string;
  groupName: string;
  groups: AccessibleGroup[];
  botStatus: BotStatus | null;
  onSelectGroup: (group: AccessibleGroup) => void;
}) {
  return (
    <div className="px-[26px]">
      {/* Brand mark */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--primary)] shadow-[var(--primary-shadow)]">
          <Image src="/botuang-mark.svg" alt="" width={24} height={24} className="h-6 w-6 brightness-0 invert" />
        </span>
        <p
          style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.03em" }}
        >
          Bot<span className="text-[var(--income)]">Uang</span>
        </p>
      </div>

      {/* Group selector */}
      <div className="mt-5">
        <label className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          Grup aktif
          <select
            value={groupId}
            onChange={(event) => {
              const selected = groups.find(
                (group) => group.group_id === event.target.value,
              );
              if (selected) onSelectGroup(selected);
            }}
            className="mt-1.5 min-h-10 w-full rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus-visible:shadow-[var(--focus-ring)]"
            disabled={!groups.length}
            aria-label="Pilih grup aktif"
          >
            {groups.length ? (
              groups.map((group) => (
                <option key={group.group_id} value={group.group_id}>
                  {group.group_name ?? "Grup WhatsApp"}
                </option>
              ))
            ) : (
              <option value={groupId}>{groupName || "Grup WhatsApp"}</option>
            )}
          </select>
          {groupId ? (
            <span className="mt-1 block break-all text-[10px] font-normal normal-case tracking-normal text-[var(--muted-2)]">
              {groupId}
            </span>
          ) : null}
        </label>
        <Link
          href="/connect"
          className="mt-1.5 block text-sm font-semibold text-[var(--income)] hover:text-[var(--primary-hover)]"
        >
          + Hubungkan grup
        </Link>
      </div>
    </div>
  );
}

function SidebarPromo({ botStatus }: { botStatus: BotStatus | null }) {
  const statusDisplay = getBotStatusDisplay(botStatus);
  return (
    <div className="fernly-promo">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef6f1] text-[#071a10]">
        <Bot className="h-4 w-4" />
      </div>
      <p className="mt-3 font-semibold text-[17px] leading-snug tracking-tight text-white">
        WhatsApp Bot Connected
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-[#b9d4c3]">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            statusDisplay.tone === "checking"
              ? "bg-amber-400"
              : statusDisplay.tone === "connected"
                ? "bg-emerald-400"
                : "bg-rose-400",
          )}
        />
        <span>{statusDisplay.label}</span>
      </div>
      <Link
        href="/dashboard/#commands"
        className="mt-5 block w-full rounded-full bg-[var(--income)] py-2 text-center text-xs font-semibold text-white transition hover:brightness-110"
      >
        Kelola Otomasi
      </Link>
    </div>
  );
}

function NavLink({
  item,
  active,
  href,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  href?: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href ?? item.href}
      prefetch
      onClick={(event) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate();
      }}
      aria-current={active ? "page" : undefined}
      className="fernly-nav__link focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <span className="fernly-nav__rail" />
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

function MobileNav({
  section,
  role,
  groupId,
  groupName,
  summary,
  transactions,
  sessionToken = "",
  botApiUrl = "",
  onSaved,
  onNavigate,
}: {
  section: DashboardSection;
  role: "admin" | "owner";
  groupId: string;
  groupName: string;
  summary: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  sessionToken?: string;
  botApiUrl?: string;
  onSaved: () => void;
  onNavigate?: (section: DashboardSection) => void;
}) {
  const menuHref = role === "owner" ? sectionHref("owner") : sectionHref("settings");
  const items = [
    { key: "overview" as const, label: "Home", href: sectionHref("overview"), icon: Home },
    { key: "transactions" as const, label: "Transaksi", href: sectionHref("transactions"), icon: WalletCards },
    { key: "todos" as const, label: "Aktivitas", href: sectionHref("todos"), icon: ListTodo },
    { key: "menu" as const, label: "Menu", href: menuHref, icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed inset-x-2.5 bottom-2.5 z-40 rounded-[22px] border border-[var(--line)] bg-[var(--surface)]/96 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_18px_44px_-24px_rgba(19,26,21,0.38)] backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-5 items-end gap-0.5">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = section === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(item.key as DashboardSection);
              }}
              className={cn(
                "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] font-semibold transition",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--income)]"
                  : "text-[var(--muted)] active:bg-[var(--panel)]",
              )}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <div className="flex justify-center">
          {groupId ? (
            <AiAssistantSheet
              groupId={groupId}
              groupName={groupName}
              sessionToken={sessionToken}
              botApiUrl={botApiUrl}
              summary={summary}
              transactions={transactions}
              onSaved={onSaved}
              trigger={
                <button
                  type="button"
                  className="flex h-[58px] w-[58px] -translate-y-2 flex-col items-center justify-center gap-0.5 rounded-[18px] bg-[var(--primary)] text-white shadow-[var(--primary-shadow)] transition active:scale-95"
                  aria-label="Buka BotUang AI"
                >
                  <Sparkles className="h-5 w-5" />
                  <span className="text-[10px] font-bold leading-none">AI</span>
                </button>
              }
            />
          ) : (
            <Button size="icon" disabled className="h-[58px] w-[58px] -translate-y-2 rounded-[18px]">
              <Sparkles className="h-5 w-5" />
            </Button>
          )}
        </div>
        {items.slice(2).map((item) => {
          const Icon = item.icon;
          const targetSection = item.key === "menu"
            ? role === "owner" ? "owner" : "settings"
            : item.key;
          const active =
            item.key === "todos"
              ? section === "todos" || section === "reminders" || section === "commands"
              : section === "settings" || section === "participants" || section === "owner";
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(targetSection);
              }}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] font-semibold transition",
                active
                  ? "bg-[var(--primary-soft)] text-[var(--income)]"
                  : "text-[var(--muted)] active:bg-[var(--panel)]",
              )}
              aria-label={item.label}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NoGroupsEmptyState() {
  return (
    <div className="mx-auto flex min-h-[62vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-400">
        <MessageCircle className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Belum Ada Grup</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Kamu belum menghubungkan akun BotUang dengan grup WhatsApp.
      </p>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
        Hubungkan grup menggunakan Group ID atau link/token Dashboard dari WhatsApp.
      </p>
      <Button asChildLike="true" className="mt-5">
        <Link href="/connect">Hubungkan Grup</Link>
      </Button>
    </div>
  );
}

function Overview({
  groupId,
  groupName,
  sessionToken = "",
  botApiUrl = "",
  loading,
  summary,
  monthlyChart,
  weeklyChart,
  transactions,
  todos,
  reminders,
  query,
  setQuery,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  transactionTypeFilter,
  setTransactionTypeFilter,
  onExport,
  onSaved,
}: {
  groupId: string;
  groupName: string;
  sessionToken?: string;
  botApiUrl?: string;
  loading: boolean;
  summary: { income: number; expense: number; balance: number };
  monthlyChart: ChartPoint[];
  weeklyChart: ChartPoint[];
  transactions: Transaction[];
  todos: Todo[];
  reminders: Reminder[];
  query: string;
  setQuery: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  transactionTypeFilter: "all" | "income" | "expense";
  setTransactionTypeFilter: (value: "all" | "income" | "expense") => void;
  onExport: () => void;
  onSaved: () => void;
}) {
  const openTodos = todos.filter((todo) => !todo.is_done).slice(0, 3);
  const openTodoCount = todos.filter((todo) => !todo.is_done).length;
  const nextReminders = reminders.slice(0, 3);
  const expenseRatio = summary.income
    ? `${Math.round((summary.expense / summary.income) * 100)}%`
    : "-";
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
        <div>
          <h1 className="text-[clamp(30px,3vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em]">
            Ringkasan
          </h1>
          <p className="mt-2 text-[15px] text-[var(--muted)]">
            Ringkasan keuangan {displayGroupName(groupName, groupId)}
          </p>
        </div>
        {groupId ? (
          <TransactionSheet
            groupId={groupId}
            sessionToken={sessionToken}
            botApiUrl={botApiUrl}
            onSaved={onSaved}
          />
        ) : null}
      </div>

      <div className="fernly-grid">
        {/* s1: Stat 1 - Saldo Kas (Hero) */}
        <div style={{ gridArea: "s1" }}>
          <MetricCard
            label="Saldo Kas"
            value={summary.balance}
            icon={WalletCards}
            tone="neutral"
            primary
            loading={loading}
          />
        </div>

        {/* s2: Stat 2 - Pemasukan */}
        <div style={{ gridArea: "s2" }}>
          <MetricCard
            label="Pemasukan"
            value={summary.income}
            icon={CircleDollarSign}
            tone="income"
            loading={loading}
          />
        </div>

        {/* s3: Stat 3 - Pengeluaran */}
        <div style={{ gridArea: "s3" }}>
          <MetricCard
            label="Pengeluaran"
            value={summary.expense}
            icon={WalletCards}
            tone="expense"
            loading={loading}
          />
        </div>

        {/* s4: Stat 4 - Transaksi */}
        <div style={{ gridArea: "s4" }}>
          <CountMetricCard
            label="Transaksi"
            value={transactions.length}
            description="pada grup aktif"
            loading={loading}
          />
        </div>

        {/* an: Analytics / Arus Kas Chart */}
        <Card style={{ gridArea: "an" }} className="flex flex-col p-5 sm:p-6 min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">Arus Kas Bulanan</h2>
              <p className="text-xs text-[var(--muted)]">Grafik pergerakan masuk & keluar kas grup</p>
            </div>
            <span className="text-xs font-medium text-[var(--muted-2)]">8 periode</span>
          </div>
          {loading ? (
            <Skeleton className="h-56 w-full my-auto" />
          ) : monthlyChart.length ? (
            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(val) => `${Number(val) / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#1d7347" fill="#1d7347" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="expense" stroke="#c23b3b" fill="#c23b3b" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Belum ada arus kas" description="Transaksi kas yang tercatat akan tampil di sini." />
          )}
        </Card>

        {/* re: Reminder Widget */}
        <Card style={{ gridArea: "re" }} className="flex flex-col p-5 sm:p-6 justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-tight">Pengingat / Jadwal</h2>
              <Badge tone="muted">{reminders.length} aktif</Badge>
            </div>
            {nextReminders.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="text-[19px] font-semibold tracking-tight text-[var(--primary)] leading-snug">
                  {nextReminders[0].remind_text}
                </p>
                <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 pt-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {nextReminders[0].remind_type}: {nextReminders[0].remind_value}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--muted)]">Belum ada pengingat terjadwal untuk grup ini.</p>
            )}
          </div>
          <Link
            href="/dashboard/#reminders"
            className="mt-6 inline-flex h-[44px] w-full items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"
          >
            Lihat Kalender
          </Link>
        </Card>

        {/* sd: Side Column (Projects / Todo List + Time Tracker) */}
        <div style={{ gridArea: "sd" }} className="flex flex-col gap-4">
          {/* Projects / Todo List */}
          <Card className="flex flex-col p-5 flex-1 min-h-[220px]">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <h2 className="text-[16px] font-semibold tracking-tight">Tugas & Proyek</h2>
              <Link href="/dashboard/#todos" className="text-xs font-semibold text-[var(--income)] hover:underline">
                Buka Board
              </Link>
            </div>
            <div className="mt-3 space-y-2.5">
              {openTodos.length > 0 ? (
                openTodos.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-[var(--income)] shrink-0" />
                    <span className="truncate font-medium flex-1">{t.todo_text}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--muted)] py-4 text-center">Semua tugas grup selesai</p>
              )}
            </div>
          </Card>

          {/* Fernly Time Tracker Widget */}
          <div className="fernly-tracker">
            <h2 className="text-[16px] font-medium tracking-tight text-white/90">Waktu Sesi & Tracker</h2>
            <div className="my-auto py-3 text-center">
              <p className="font-mono text-[clamp(32px,3vw,40px)] font-bold tracking-tight text-white leading-none">
                01:24:08
              </p>
              <p className="text-[11px] text-[#b9d4c3] mt-1.5 uppercase tracking-widest">Sesi Aktif Grup</p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--primary)] transition hover:scale-105 active:scale-95"
                aria-label="Mulai timer"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d63a3a] text-white transition hover:scale-105 active:scale-95"
                aria-label="Stop timer"
              >
                <div className="h-3 w-3 rounded-xs bg-white" />
              </button>
            </div>
          </div>
        </div>

        {/* tm: Team Collaboration */}
        <Card style={{ gridArea: "tm" }} className="flex flex-col p-5 sm:p-6 min-h-[220px]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight">Anggota Grup Terkini</h2>
              <p className="text-xs text-[var(--muted)]">Partisipasi & kontribusi anggota grup</p>
            </div>
            <Link href="/dashboard/#participants" className="text-xs font-semibold text-[var(--income)] hover:underline">
              Kelola Semua
            </Link>
          </div>
          <div className="mt-3.5 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                WA
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{groupName || "Grup WhatsApp"}</p>
                <p className="text-xs text-[var(--muted)]">ID: {groupId}</p>
              </div>
              <Badge tone="income">Terhubung</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm pt-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                AI
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">Asisten Keuangan Bot</p>
                <p className="text-xs text-[var(--muted)]">Otomasi perintah & laporan kas</p>
              </div>
              <Badge tone="muted">Aktif</Badge>
            </div>
          </div>
        </Card>

        {/* pg: Project & Financial Progress */}
        <Card style={{ gridArea: "pg" }} className="flex flex-col p-5 sm:p-6 justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">Progres Keuangan</h2>
            <p className="text-xs text-[var(--muted)]">Rasio beban belanja vs pemasukan</p>
          </div>
          <div className="my-auto py-4 text-center">
            <p className="font-mono text-[clamp(36px,3.5vw,48px)] font-bold tracking-tight text-[var(--income)] leading-none">
              {expenseRatio}
            </p>
            <p className="text-xs text-[var(--muted)] mt-2">Rasio Pengeluaran Kas</p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--income)]" />
              Kas Masuk
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--expense)]" />
              Kas Keluar
            </span>
          </div>
        </Card>
      </div>

      {/* Transaksi Terbaru & Filter Panel */}
      <Card className="p-5 sm:p-6 mt-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">Transaksi Terbaru</h2>
            <p className="text-xs text-[var(--muted)]">Pencarian cepat, filter tanggal, dan ekspor CSV</p>
          </div>
          <Button variant="secondary" onClick={onExport} disabled={!transactions.length} className="self-start md:self-auto">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_150px_150px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari catatan atau pengirim..."
            />
          </label>
          <TransactionTypeSegment
            value={transactionTypeFilter}
            onChange={setTransactionTypeFilter}
          />
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>
        <TransactionsView
          groupId={groupId}
          sessionToken={sessionToken}
          botApiUrl={botApiUrl}
          loading={loading}
          transactions={recentTransactions}
          onSaved={onSaved}
        />
      </Card>

      {/* AI Panel & Quick Insights */}
      <div className="mt-4">
        <OverviewAiPanel
          groupId={groupId}
          groupName={groupName}
          summary={summary}
          transactions={transactions}
          sessionToken={sessionToken}
          botApiUrl={botApiUrl}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

function TransactionsPage({
  groupId,
  sessionToken = "",
  botApiUrl = "",
  loading,
  transactions,
  query,
  setQuery,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  transactionTypeFilter,
  setTransactionTypeFilter,
  onExport,
  onSaved,
}: {
  groupId: string;
  sessionToken?: string;
  botApiUrl?: string;
  loading: boolean;
  transactions: Transaction[];
  query: string;
  setQuery: (value: string) => void;
  fromDate: string;
  setFromDate: (value: string) => void;
  toDate: string;
  setToDate: (value: string) => void;
  transactionTypeFilter: "all" | "income" | "expense";
  setTransactionTypeFilter: (value: "all" | "income" | "expense") => void;
  onExport: () => void;
  onSaved: () => void;
}) {
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-4">
      <PageIntro
        title="Transaksi"
        description="Kelola kas masuk dan keluar yang tersimpan untuk grup aktif"
        action={groupId ? (
          <TransactionSheet
            groupId={groupId}
            sessionToken={sessionToken}
            botApiUrl={botApiUrl}
            onSaved={onSaved}
          />
        ) : null}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <CompactMoneyStat label="Pemasukan filter" value={income} tone="income" loading={loading} />
        <CompactMoneyStat label="Pengeluaran filter" value={expense} tone="expense" loading={loading} />
        <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
          <p className="text-xs font-medium text-[var(--muted)]">Saldo filter</p>
          {loading ? (
            <Skeleton className="mt-2 h-6 w-28" />
          ) : (
            <p className="mt-1 font-mono text-base font-semibold tabular-nums">
              {formatRupiah(income - expense)}
            </p>
          )}
        </div>
      </section>

      <DashboardPanel>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide">Daftar Transaksi</h2>
            <p className="text-sm text-[var(--muted)]">
              Cari, edit, hapus, atau ekspor transaksi grup.
            </p>
          </div>
          <Button variant="outline" onClick={onExport} disabled={!transactions.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_150px_150px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari catatan atau pengirim"
            />
          </label>
          <TransactionTypeSegment
            value={transactionTypeFilter}
            onChange={setTransactionTypeFilter}
          />
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>
        <TransactionsView
          groupId={groupId}
          sessionToken={sessionToken}
          botApiUrl={botApiUrl}
          loading={loading}
          transactions={transactions}
          onSaved={onSaved}
        />
      </DashboardPanel>
    </div>
  );
}

function ReportsPage({
  loading,
  summary,
  monthlyChart,
  weeklyChart,
  transactions,
}: {
  loading: boolean;
  summary: { income: number; expense: number; balance: number };
  monthlyChart: ChartPoint[];
  weeklyChart: ChartPoint[];
  transactions: Transaction[];
}) {
  const expenseRatio = summary.income
    ? Math.round((summary.expense / summary.income) * 100)
    : 0;
  const averageTransaction = transactions.length
    ? transactions.reduce((total, item) => total + Number(item.amount || 0), 0) /
      transactions.length
    : 0;

  return (
    <div className="space-y-4">
      <PageIntro
        title="Laporan"
        description="Analisis arus kas berdasarkan transaksi nyata grup aktif"
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <CompactMoneyStat label="Saldo saat ini" value={summary.balance} loading={loading} />
        <CompactMoneyStat label="Total pemasukan" value={summary.income} tone="income" loading={loading} />
        <CompactMoneyStat label="Total pengeluaran" value={summary.expense} tone="expense" loading={loading} />
        <DashboardPanel className="flex min-h-[92px] flex-col justify-center">
          <p className="text-xs font-medium text-[var(--muted)]">Rasio pengeluaran</p>
          {loading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : (
            <p className="mt-1 text-xl font-semibold tabular-nums">{expenseRatio}%</p>
          )}
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <DashboardPanel className="self-start">
          <div className="mb-4">
            <h2 className="font-semibold">Tren arus kas</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Delapan periode transaksi terakhir.</p>
          </div>
          {loading ? (
            <Skeleton className="h-72" />
          ) : monthlyChart.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B981" fillOpacity={0.16} />
                  <Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Belum ada data laporan" description="Laporan akan terbentuk setelah transaksi pertama tercatat." />
          )}
        </DashboardPanel>

        <div className="grid gap-4">
          <DashboardPanel>
            <h2 className="font-semibold">Ringkasan</h2>
            <div className="mt-4 divide-y divide-[var(--line)]">
              <InfoPill label="Jumlah transaksi" value={String(transactions.length)} />
              <InfoPill label="Rata-rata nominal" value={formatRupiah(averageTransaction)} />
              <InfoPill label="Selisih kas" value={formatRupiah(summary.balance)} />
            </div>
          </DashboardPanel>
          <DashboardPanel>
            <h2 className="font-semibold">Aktivitas mingguan</h2>
            {loading ? (
              <Skeleton className="mt-4 h-40" />
            ) : weeklyChart.length ? (
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChart}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="income" fill="#10B981" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="expense" fill="#F43F5E" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="Belum ada aktivitas" description="Belum ada transaksi mingguan untuk dianalisis." />
            )}
          </DashboardPanel>
        </div>
      </section>
    </div>
  );
}

function CalculatorPage() {
  return (
    <div className="space-y-4">
      <PageIntro title="Kalkulator" description="Hitung nominal kas cepat dengan dukungan k, rb, dan jt" />
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
        <div className="mt-4">
          <FinanceCalculator />
        </div>
        </div>
        <DashboardPanel className="self-start">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Contoh cepat</h2>
          <div className="mt-3 grid gap-2 text-sm text-[var(--muted)]">
            <p>150k x 3 - 25rb</p>
            <p>1.5jt / 6</p>
            <p>(500k + 250k) / 5</p>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function DashboardPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function TransactionTypeSegment({
  value,
  onChange,
}: {
  value: "all" | "income" | "expense";
  onChange: (value: "all" | "income" | "expense") => void;
}) {
  const options = [
    { value: "all" as const, label: "Semua" },
    { value: "income" as const, label: "Masuk" },
    { value: "expense" as const, label: "Keluar" },
  ];

  return (
    <div className="grid min-h-11 grid-cols-3 rounded-[12px] border border-[var(--line)] bg-[var(--panel)] p-1 text-xs font-semibold md:w-[214px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[9px] px-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500",
            value === option.value
              ? "bg-[var(--primary)] text-white shadow-[var(--soft-shadow)]"
              : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CountMetricCard({
  label,
  value,
  description,
  loading,
}: {
  label: string;
  value: number;
  description: string;
  loading: boolean;
}) {
  return (
    <Card className="flex min-h-[178px] min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-medium tracking-tight text-[var(--muted)]">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] transition-transform hover:scale-110">
          <ClipboardCheck className="h-4 w-4" />
        </span>
      </div>

      <div className="my-auto pt-3">
        {loading ? (
          <Skeleton className="h-10 w-24" />
        ) : (
          <p className="font-mono text-[clamp(28px,2.8vw,38px)] font-semibold tabular-nums leading-none tracking-tight">
            {value}
          </p>
        )}
      </div>

      <div className="mt-2 text-xs text-[var(--muted-2)]">
        {description}
      </div>
    </Card>
  );
}

function OverviewAiPanel({
  groupId,
  groupName,
  summary,
  transactions,
  sessionToken = "",
  botApiUrl = "",
  onSaved,
}: {
  groupId: string;
  groupName: string;
  summary: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  sessionToken?: string;
  botApiUrl?: string;
  onSaved: () => void;
}) {
  if (!groupId) return null;

  return (
    <DashboardPanel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide">BotUang AI</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Catat data cepat dari bahasa sehari-hari.
          </p>
        </div>
        <span className="botuang-ai-orb botuang-ai-orb-sm" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2">
        {["Pengeluaran 5k beli Pop Ice", "Reminder besok 08:00 rapat", "Todo beli konsumsi"].map(
          (item) => (
            <AiAssistantSheet
              key={item}
              groupId={groupId}
              groupName={groupName}
              sessionToken={sessionToken}
              botApiUrl={botApiUrl}
              summary={summary}
              transactions={transactions}
              onSaved={onSaved}
              trigger={
                <button
                  type="button"
                  className="min-h-10 rounded-[11px] border border-[var(--line)] px-3 text-left text-sm text-[var(--muted)] transition hover:border-emerald-300/40 hover:bg-emerald-500/5 hover:text-[var(--foreground)]"
                >
                  {item}
                </button>
              }
            />
          ),
        )}
      </div>
      <AiAssistantSheet
        groupId={groupId}
        groupName={groupName}
        sessionToken={sessionToken}
        botApiUrl={botApiUrl}
        summary={summary}
        transactions={transactions}
        onSaved={onSaved}
        trigger={
          <button
            type="button"
            className="mt-3 flex min-h-11 w-full items-center justify-between rounded-[12px] border border-[var(--line)] bg-[var(--background)] px-3 text-sm text-[var(--muted)] transition hover:border-emerald-300/40 hover:text-[var(--foreground)]"
          >
            <span>Tanyakan tentang keuangan...</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </button>
        }
      />
    </DashboardPanel>
  );
}

function CompactMoneyStat({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense";
  loading: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
      <p className="text-xs font-medium text-[var(--muted)]">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-28" />
      ) : (
        <p
          className={cn(
            "mt-1 font-mono text-base font-semibold tabular-nums",
            tone === "income"
              ? "text-emerald-500"
              : tone === "expense"
                ? "text-rose-500"
                : "text-[var(--foreground)]",
          )}
        >
          {tone === "income" ? "+" : tone === "expense" ? "-" : ""}
          {formatRupiah(value)}
        </p>
      )}
    </div>
  );
}

function UpcomingPanel({
  todos,
  reminders,
}: {
  todos: Todo[];
  reminders: Reminder[];
}) {
  return (
    <div className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
      <h2 className="font-semibold">Agenda Terdekat</h2>
      <div className="mt-3 space-y-3">
        {reminders.map((reminder) => (
          <div key={reminder.id} className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{reminder.remind_text}</p>
              <p className="text-xs text-[var(--muted)]">{reminder.remind_value}</p>
            </div>
          </div>
        ))}
        {todos.map((todo) => (
          <div key={todo.id} className="flex items-start gap-3">
            <ClipboardCheck className="mt-0.5 h-4 w-4 text-[var(--muted)]" />
            <p className="min-w-0 truncate text-sm font-medium">{parseTodo(todo.todo_text).text}</p>
          </div>
        ))}
        {!reminders.length && !todos.length ? (
          <p className="text-sm text-[var(--muted)]">Belum ada todo atau reminder aktif.</p>
        ) : null}
      </div>
    </div>
  );
}

type BotAiIntent = {
  action: "transaction" | "query" | "reminder" | "todo" | "command";
  type: "income" | "expense";
  query_type?: "balance" | "income" | "expense" | "summary" | "search";
  amount: number;
  note: string;
  date?: string;
  remind_type?: string;
  remind_value?: string;
  remind_text?: string;
  todo_text?: string;
  keyword?: string;
  response?: string;
  confidence?: number;
};

function AiCommandBar({
  groupId,
  groupName,
  summary,
  transactions,
  sessionToken = "",
  botApiUrl = "",
  onSaved,
}: {
  groupId: string;
  groupName: string;
  summary: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  sessionToken?: string;
  botApiUrl?: string;
  onSaved: () => void;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-40 hidden xl:block">
      <AiAssistantSheet
        groupId={groupId}
        groupName={groupName}
        sessionToken={sessionToken}
        botApiUrl={botApiUrl}
        summary={summary}
        transactions={transactions}
        onSaved={onSaved}
        trigger={
          <button
            type="button"
            className="group flex min-h-12 items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-3 pr-4 text-sm font-semibold text-[var(--foreground)] shadow-[var(--soft-shadow)] transition hover:border-[var(--muted-2)] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Buka AI Assistant BotUang"
          >
            <span className="botuang-ai-orb botuang-ai-orb-sm" aria-hidden="true" />
            <span>AI Assistant</span>
          </button>
        }
      />
    </div>
  );
}

function CalculatorBubble() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex min-h-12 items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-semibold text-[var(--foreground)] shadow-[var(--soft-shadow)] transition hover:border-[var(--muted-2)] hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] xl:bottom-[82px] xl:right-5"
          aria-label="Buka kalkulator"
        >
          <Calculator className="h-4 w-4 text-emerald-500" />
          <span className="hidden sm:inline">Kalkulator</span>
        </button>
      </SheetTrigger>
      <SheetContent className="p-4 md:w-[390px]">
        <SheetTitle>Kalkulator</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-[var(--muted)]">
          Hitung nominal kas tanpa meninggalkan halaman.
        </SheetDescription>
        <div className="mt-4">
          <FinanceCalculator />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AiAssistantSheet({
  groupId,
  groupName,
  sessionToken = "",
  botApiUrl = "",
  summary,
  transactions,
  onSaved,
  trigger,
}: {
  groupId: string;
  groupName: string;
  sessionToken?: string;
  botApiUrl?: string;
  summary: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  onSaved: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [intent, setIntent] = useState<BotAiIntent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [savedIntent, setSavedIntent] = useState<BotAiIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function parse(event?: FormEvent) {
    event?.preventDefault();
    if (!prompt.trim()) return;
    setSavedIntent(null);
    setIntent(null);
    setEditMode(false);
    setLoading(true);
    const response = await fetch("/api/ai/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt }),
    }).then((item) => item.json() as Promise<{
      ok?: boolean;
      message?: string;
      intent?: BotAiIntent;
    }>);
    setLoading(false);

    if (!response.ok || !response.intent) {
      toast.error(response.message ?? "AI belum memahami perintah.");
      return;
    }

    if (response.message) toast.message(response.message);
    setIntent(response.intent);
  }

  async function saveIntent() {
    if (!intent) return;
    if (intent.action === "query") {
      toast.message("Ini hanya cek informasi, tidak ada data yang diubah.");
      return;
    }
    if (intent.action === "transaction" && (!Number.isFinite(intent.amount) || intent.amount <= 0)) {
      toast.error("Nominal transaksi tidak valid.");
      return;
    }
    if (intent.action === "transaction" && !intent.note.trim()) {
      toast.error("Catatan transaksi wajib diisi.");
      return;
    }
    if (intent.action === "reminder" && !(intent.remind_text ?? intent.note).trim()) {
      toast.error("Teks reminder wajib diisi.");
      return;
    }
    if (intent.action === "todo" && !(intent.todo_text ?? intent.note).trim()) {
      toast.error("Todo wajib diisi.");
      return;
    }
    if (intent.action === "command" && (!intent.keyword?.trim() || !(intent.response ?? intent.note).trim())) {
      toast.error("Keyword dan response command wajib diisi.");
      return;
    }
    setSaving(true);
    let botOk = false;

    if (shouldWriteLegacyBot(botApiUrl)) {
      if (intent.action === "transaction") {
        const res = await fetchBotGroupData({
          resource: "transactions",
          groupId,
          apiUrl: botApiUrl,
          token: sessionToken,
          method: "POST",
          body: {
            type: intent.type,
            amount: intent.amount,
            note: intent.note,
            sender_name: "AI Dashboard",
          },
        });
        botOk = Boolean(res.ok);
      } else if (intent.action === "reminder") {
        const res = await fetchBotGroupData({
          resource: "reminders",
          groupId,
          apiUrl: botApiUrl,
          token: sessionToken,
          method: "POST",
          body: {
            remind_type: intent.remind_type ?? "time",
            remind_value: intent.remind_value ?? "",
            remind_text: intent.remind_text ?? intent.note,
          },
        });
        botOk = Boolean(res.ok);
      } else if (intent.action === "todo") {
        const res = await fetchBotGroupData({
          resource: "todos",
          groupId,
          apiUrl: botApiUrl,
          token: sessionToken,
          method: "POST",
          body: {
            title: intent.todo_text ?? intent.note,
            done: false,
          },
        });
        botOk = Boolean(res.ok);
      } else if (intent.action === "command") {
        const res = await fetchBotGroupData({
          resource: "commands",
          groupId,
          apiUrl: botApiUrl,
          token: sessionToken,
          method: "POST",
          body: {
            keyword: intent.keyword ?? "",
            response: intent.response ?? intent.note,
          },
        });
        botOk = Boolean(res.ok);
      }
    }

    if (intent.action === "transaction" && shouldWriteLegacyBot(botApiUrl) && !botOk) {
      setSaving(false);
      toast.error("Transaksi belum disimpan karena bot WA tidak menerima data.");
      return;
    }

    const { error } =
      intent.action === "transaction"
        ? await supabase.from("transactions").insert({
            group_id: groupId,
            type: intent.type,
            amount: intent.amount,
            note: intent.note,
            sender_id: DASHBOARD_SYNCED_SENDER_ID,
            sender_name: "AI Dashboard",
            created_at: intent.date
              ? new Date(`${intent.date}T12:00:00`).toISOString()
              : new Date().toISOString(),
          })
        : intent.action === "reminder"
          ? await supabase.from("reminders").insert({
              group_id: groupId,
              remind_type: intent.remind_type ?? "time",
              remind_value: intent.remind_value ?? "",
              remind_text: intent.remind_text ?? intent.note,
              created_by: "AI Dashboard",
            })
          : intent.action === "todo"
            ? await supabase.from("todos").insert({
                group_id: groupId,
                todo_text: intent.todo_text ?? intent.note,
              })
            : await supabase.from("custom_commands").insert({
                group_id: groupId,
                keyword: intent.keyword ?? "",
                response: intent.response ?? intent.note,
              });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Aksi AI disimpan.");
    setSavedIntent(intent);
    setPrompt("");
    setIntent(null);
    setEditMode(false);
    onSaved();
  }

  function updateIntent(patch: Partial<BotAiIntent>) {
    setIntent((current) => (current ? { ...current, ...patch } : current));
  }

  function quickPrompt(text: string) {
    setPrompt(text);
    setIntent(null);
    setSavedIntent(null);
    setEditMode(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex min-h-[64vh] max-h-[86vh] flex-col overflow-hidden bg-[var(--surface)] p-0 md:w-[430px]">
        <div className="border-b border-[var(--line)] px-5 pb-4 pt-2 md:pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold">BotUang AI</SheetTitle>
              <SheetDescription className="mt-0.5 truncate text-sm text-[var(--muted)]">
                Asisten keuangan {displayGroupName(groupName, groupId)}
              </SheetDescription>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 pb-4">
          <div>
            <p className="text-sm font-semibold">Mau mencatat apa?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <TransactionSheet
                groupId={groupId}
                sessionToken={sessionToken}
                botApiUrl={botApiUrl}
                onSaved={onSaved}
                initialType="income"
                triggerClassName="min-h-11 w-full justify-start rounded-[12px] border border-emerald-300/20 bg-emerald-400/8 px-3 text-left text-sm font-semibold text-emerald-300 hover:bg-emerald-400/12"
                label="+ Pemasukan"
              />
              <TransactionSheet
                groupId={groupId}
                sessionToken={sessionToken}
                botApiUrl={botApiUrl}
                onSaved={onSaved}
                initialType="expense"
                triggerClassName="min-h-11 w-full justify-start rounded-[12px] border border-rose-300/20 bg-rose-400/8 px-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-400/12"
                label="- Pengeluaran"
              />
              <button
                type="button"
                onClick={() => quickPrompt("saldo sekarang berapa?")}
                className="min-h-11 rounded-[12px] border border-[var(--line)] px-3 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
              >
                Cek Saldo
              </button>
              <button
                type="button"
                onClick={() => quickPrompt("reminder besok 08:00 bayar kas")}
                className="min-h-11 rounded-[12px] border border-[var(--line)] px-3 text-left text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
              >
                Reminder
              </button>
            </div>
          </div>

          {savedIntent ? (
            <AiSuccessCard intent={savedIntent} />
          ) : null}

          {intent ? (
            <AiIntentCard
              intent={intent}
              groupName={displayGroupName(groupName, groupId)}
              summary={summary}
              transactions={transactions}
              editMode={editMode}
              saving={saving}
              onEdit={() => setEditMode(true)}
              onCancelEdit={() => setEditMode(false)}
              onChange={updateIntent}
              onSave={saveIntent}
            />
          ) : null}

          {!intent && !savedIntent && !loading ? (
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--panel)] p-3 text-sm text-[var(--muted)]">
              <p className="font-medium text-[var(--foreground)]">Contoh cepat</p>
              <div className="mt-2 grid gap-2">
                {[
                  "tambah pemasukan 1jt gaji awal",
                  "pengeluaran 5k beli pop ice",
                  "pengeluaran bulan ini berapa?",
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => quickPrompt(example)}
                    className="rounded-[10px] px-2 py-1.5 text-left transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[var(--line)] bg-[var(--surface)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <AiThinkingOrbAndInput
            className="ai-action-command-input"
            value={prompt}
            onValueChange={(value) => {
              setPrompt(value);
              if (intent) setIntent(null);
              if (savedIntent) setSavedIntent(null);
              if (editMode) setEditMode(false);
            }}
            onSubmit={() => {
              void parse();
            }}
            loading={loading}
            answered={Boolean(intent)}
            placeholder="Contoh: pemasukan 1jt gaji awal"
            status={
              loading
                ? "Memahami perintah..."
                : intent
                  ? "Saya memahami ini sebagai:"
                  : "Ketik perintah keuangan, lalu cek sebelum simpan."
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AiIntentCard({
  intent,
  groupName,
  summary,
  transactions,
  editMode,
  saving,
  onEdit,
  onCancelEdit,
  onChange,
  onSave,
}: {
  intent: BotAiIntent;
  groupName: string;
  summary: { income: number; expense: number; balance: number };
  transactions: Transaction[];
  editMode: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onChange: (patch: Partial<BotAiIntent>) => void;
  onSave: () => void;
}) {
  if (intent.action === "query") {
    const result = getAiQueryResult(intent, summary, transactions);
    return (
      <div className="rounded-[16px] border border-[var(--line)] bg-[var(--panel)] p-4">
        <p className="text-sm font-semibold text-emerald-300">Saya memahami ini sebagai:</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {formatAiAction(intent.action)}
        </p>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{result.value}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">{result.description}</p>
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <AiDetailRow label="Grup" value={groupName} />
          <AiDetailRow label="Tanggal" value="Hari ini" />
        </div>
      </div>
    );
  }

  const transaction = intent.action === "transaction";
  const tone = intent.type === "income" ? "income" : "expense";
  const primaryLabel = formatAiPrimaryValue(intent);
  const description = formatAiDescription(intent);
  const needsClarification = transaction && Number(intent.confidence ?? 1) < 0.65;

  return (
    <div
      className={cn(
        "rounded-[16px] border bg-[var(--panel)] p-4",
        transaction && tone === "income"
          ? "border-emerald-300/22"
          : transaction
            ? "border-rose-300/22"
            : "border-[var(--line)]",
      )}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">Saya memahami ini sebagai:</p>

      {editMode ? (
        <div className="mt-4 space-y-3">
          {transaction ? (
            <Tabs value={intent.type} onValueChange={(value) => onChange({ type: value as "income" | "expense" })}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Pemasukan</TabsTrigger>
                <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          {transaction ? (
            <label className="block text-sm font-medium">
              Nominal
              <Input
                className="mt-2 font-mono tabular-nums"
                type="number"
                min="0"
                inputMode="numeric"
                value={intent.amount || ""}
                onChange={(event) => onChange({ amount: Number(event.target.value) })}
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Catatan
            <Textarea
              className="mt-2"
              value={
                intent.action === "todo"
                  ? intent.todo_text ?? intent.note
                  : intent.action === "reminder"
                    ? intent.remind_text ?? intent.note
                    : intent.action === "command"
                      ? intent.response ?? intent.note
                      : intent.note
              }
              onChange={(event) => {
                const value = event.target.value;
                if (intent.action === "todo") onChange({ todo_text: value, note: value });
                else if (intent.action === "reminder") onChange({ remind_text: value, note: value });
                else if (intent.action === "command") onChange({ response: value, note: value });
                else onChange({ note: value });
              }}
            />
          </label>
          {intent.action === "reminder" ? (
            <ReminderScheduleFields
              type={toReminderScheduleType(intent.remind_type)}
              value={intent.remind_value ?? ""}
              onChange={(patch) => onChange({ remind_type: patch.type, remind_value: patch.value })}
            />
          ) : null}
          {intent.action === "command" ? (
            <label className="block text-sm font-medium">
              Keyword
              <Input
                className="mt-2"
                value={intent.keyword ?? ""}
                onChange={(event) => onChange({ keyword: event.target.value })}
                placeholder="qris"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Tanggal
            <Input
              className="mt-2"
              type="date"
              value={intent.date ?? new Date().toISOString().slice(0, 10)}
              onChange={(event) => onChange({ date: event.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Batal
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            {needsClarification ? (
              <p className="mb-3 rounded-[12px] border border-amber-300/20 bg-amber-400/8 px-3 py-2 text-sm text-amber-200">
                {formatRupiah(intent.amount)} untuk {intent.note}, ini {intent.type === "income" ? "pemasukan" : "pengeluaran"}?
              </p>
            ) : null}
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                transaction && tone === "income"
                  ? "text-emerald-300"
                  : transaction
                    ? "text-rose-300"
                    : "text-[var(--muted)]",
              )}
            >
              {formatAiAction(intent.action)}
            </p>
            <p className="mt-1 break-words font-mono text-2xl font-semibold tabular-nums">
              {primaryLabel}
            </p>
            <p className="mt-2 break-words text-sm text-[var(--muted)]">{description}</p>
          </div>
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <AiDetailRow label="Grup" value={groupName} />
            <AiDetailRow label="Tanggal" value={intent.date ? formatDate(intent.date) : "Hari ini"} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Ubah
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              <Check className="h-4 w-4" />
              {saving ? "Menyimpan..." : `Simpan ${getAiSaveLabel(intent)}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function AiSuccessCard({ intent }: { intent: BotAiIntent }) {
  return (
    <div className="rounded-[16px] border border-emerald-300/24 bg-emerald-400/8 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <Check className="h-4 w-4" />
        Berhasil dicatat
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {formatAiAction(intent.action)}
      </p>
      <p className="mt-1 break-words font-mono text-xl font-semibold tabular-nums">
        {formatAiPrimaryValue(intent)}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{formatAiDescription(intent)}</p>
      <Link
        href={
          intent.action === "transaction"
            ? sectionHref("transactions")
            : sectionHref("overview")
        }
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[11px] border border-[var(--line)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel)]"
      >
        {intent.action === "transaction" ? "Lihat Transaksi" : "Kembali ke Dashboard"}
      </Link>
    </div>
  );
}

function AiDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="max-w-[65%] break-words text-right font-medium">{value}</span>
    </div>
  );
}

function getAiQueryResult(
  intent: BotAiIntent,
  summary: { income: number; expense: number; balance: number },
  transactions: Transaction[],
) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthTransactions = transactions.filter((item) => {
    const date = new Date(item.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  const monthIncome = monthTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthExpense = monthTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (intent.query_type === "balance") {
    return {
      value: formatRupiah(summary.balance),
      description: `Saldo dari ${transactions.length} transaksi aktif.`,
    };
  }
  if (intent.query_type === "income") {
    return {
      value: formatRupiah(monthIncome),
      description: "Total pemasukan bulan ini.",
    };
  }
  if (intent.query_type === "expense") {
    return {
      value: formatRupiah(monthExpense),
      description: "Total pengeluaran bulan ini.",
    };
  }

  return {
    value: formatRupiah(monthIncome - monthExpense),
    description: `Bulan ini: pemasukan ${formatRupiah(monthIncome)}, pengeluaran ${formatRupiah(monthExpense)}.`,
  };
}

function getAiSaveLabel(intent: BotAiIntent) {
  if (intent.action === "transaction") return intent.type === "income" ? "Pemasukan" : "Pengeluaran";
  if (intent.action === "reminder") return "Reminder";
  if (intent.action === "todo") return "Todo";
  return "Command";
}

function formatAiAction(action: BotAiIntent["action"]) {
  const labels: Record<BotAiIntent["action"], string> = {
    transaction: "Transaksi",
    query: "Cek Keuangan",
    reminder: "Reminder",
    todo: "Todo",
    command: "Command",
  };
  return labels[action];
}

function formatAiPrimaryValue(intent: BotAiIntent) {
  if (intent.action === "query") {
    const labels = {
      balance: "Saldo sekarang",
      income: "Pemasukan bulan ini",
      expense: "Pengeluaran bulan ini",
      summary: "Ringkasan keuangan",
      search: "Cari transaksi",
    } satisfies Record<NonNullable<BotAiIntent["query_type"]>, string>;
    return labels[intent.query_type ?? "summary"];
  }
  if (intent.action === "transaction") {
    return `${intent.type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatRupiah(intent.amount)}`;
  }
  if (intent.action === "reminder") {
    return `${intent.remind_type ?? "time"} ${intent.remind_value ?? ""}`.trim();
  }
  if (intent.action === "todo") {
    return intent.todo_text ?? intent.note;
  }
  return intent.keyword ?? "Command";
}

function formatAiDescription(intent: BotAiIntent) {
  if (intent.action === "query") return intent.note;
  if (intent.action === "reminder") return intent.remind_text ?? intent.note;
  if (intent.action === "todo") return intent.todo_text ?? intent.note;
  if (intent.action === "command") return intent.response ?? intent.note;
  return intent.note;
}

function FinanceCalculator() {
  const [expression, setExpression] = useState("");
  const result = useMemo(() => calculateMoneyExpression(expression), [expression]);
  const buttons = [
    "C",
    "Del",
    "%",
    "/",
    "7",
    "8",
    "9",
    "x",
    "4",
    "5",
    "6",
    "-",
    "1",
    "2",
    "3",
    "+",
    "0",
    ".",
    "rb",
    "=",
  ];

  function press(value: string) {
    if (value === "C") {
      setExpression("");
      return;
    }
    if (value === "Del") {
      setExpression((current) => current.slice(0, -1));
      return;
    }
    if (value === "=") {
      if (result.ok) setExpression(String(Math.round(result.value)));
      return;
    }
    if (value === "%") {
      setExpression((current) => (current ? `(${current})/100` : ""));
      return;
    }
    setExpression((current) => `${current}${value}`);
  }

  return (
    <div className="rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--soft-shadow)]">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-500" />
        <h2 className="font-semibold">Kalkulator</h2>
      </div>
      <div className="mt-3 rounded-[14px] border border-[var(--line)] bg-[var(--background)] p-3">
        <Input
          className="h-12 font-mono text-right text-base tabular-nums"
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
          placeholder="150k x 3 - 25rb"
          inputMode="decimal"
          aria-label="Input kalkulator"
        />
        <div className="mt-3 min-h-16 rounded-[12px] border border-[var(--line)] bg-[var(--panel)] p-3 text-right">
          <p className="text-xs font-medium text-[var(--muted)]">Hasil</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
            {result.ok ? formatRupiah(result.value) : "Format salah"}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {buttons.map((button) => (
            <Button
              key={button}
              type="button"
              variant={button === "=" ? "default" : "outline"}
              className={cn(
                "min-h-12 px-0 font-mono text-base",
                ["/", "x", "-", "+", "="].includes(button) ? "font-semibold" : "",
              )}
              onClick={() => press(button)}
            >
              {button}
            </Button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {["k", "jt", "(", ")"].map((token) => (
            <Button
              key={token}
              type="button"
              variant="ghost"
              className="min-h-10 font-mono"
              onClick={() => setExpression((current) => `${current}${token}`)}
            >
              {token}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--line)] py-3 last:border-b-0">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-right font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  primary,
  loading,
}: {
  label: string;
  value: number;
  icon: typeof WalletCards;
  tone: "neutral" | "income" | "expense";
  primary?: boolean;
  loading: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative flex min-h-[178px] min-w-0 flex-col p-5 sm:p-6",
        primary
          ? "bg-gradient-to-br from-[var(--primary-hover)] to-[var(--primary)] text-white shadow-[var(--primary-shadow)] overflow-hidden"
          : "bg-[var(--card)] text-[var(--foreground)]",
      )}
    >
      {primary && (
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(90%_80%_at_100%_100%,rgba(93,189,139,0.28),transparent_60%)]"
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[15px] font-medium tracking-tight",
            primary ? "text-[#b9e6cb]" : "text-[var(--muted)]",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110",
            primary
              ? "bg-[#f1f8f3] text-[var(--primary)]"
              : "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="relative z-10 my-auto pt-3">
        {loading ? (
          <Skeleton className={cn("h-10 w-36", primary && "bg-white/20")} />
        ) : (
          <p
            className={cn(
              "font-mono font-semibold tabular-nums leading-none tracking-tight",
              primary
                ? "text-[clamp(32px,3.2vw,44px)] text-white"
                : tone === "income"
                  ? "text-[clamp(28px,2.8vw,38px)] text-[var(--income)]"
                  : tone === "expense"
                    ? "text-[clamp(28px,2.8vw,38px)] text-[var(--expense)]"
                    : "text-[clamp(28px,2.8vw,38px)] text-[var(--foreground)]",
            )}
          >
            {formatRupiah(value)}
          </p>
        )}
      </div>

      <div className="relative z-10 mt-2 flex items-center gap-2 text-xs">
        {primary ? (
          <span className="text-[#b9e6cb]">Kas aktif saat ini</span>
        ) : (
          <span className="text-[var(--muted-2)]">Akumulasi periode</span>
        )}
      </div>
    </Card>
  );
}

function TransactionsView({
  groupId = "",
  sessionToken = "",
  botApiUrl = "",
  loading,
  transactions,
  onSaved,
}: {
  groupId?: string;
  sessionToken?: string;
  botApiUrl?: string;
  loading: boolean;
  transactions: Transaction[];
  onSaved?: () => void;
}) {
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<"income" | "expense">("income");
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(item: Transaction) {
    setEditType(item.type);
    setEditAmount(String(item.amount));
    setEditNote(item.note ?? "");
    setEditDate(item.created_at.slice(0, 10));
    setEditTx(item);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editTx) return;
    setSaving(true);
    let botOk = false;
    const targetGroupId = editTx.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const botRes = await fetchBotGroupData({
        resource: "transactions",
        id: editTx.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          type: editType,
          amount: Number(editAmount),
          note: editNote,
        },
      });
      botOk = Boolean(botRes.ok);
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        type: editType,
        amount: Number(editAmount),
        note: editNote,
        created_at: new Date(`${editDate}T12:00:00`).toISOString(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", editTx.id);
    setSaving(false);
    if (error && !botOk) { toast.error(error.message); return; }
    toast.success("Transaksi diperbarui.");
    setEditTx(null);
    onSaved?.();
  }

  async function remove(item: Transaction) {
    let botOk = false;
    const targetGroupId = item.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const botRes = await fetchBotGroupData({
        resource: "transactions",
        id: item.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(botRes.ok);
    }

    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", item.id);
    if (error && !botOk) toast.error(error.message);
    else { toast.success("Transaksi dihapus."); onSaved?.(); }
  }

  if (loading) {
    return (
      <div className="mt-5 space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Transaksi asli dari grup WhatsApp akan tampil di sini."
      />
    );
  }

  return (
    <>
      <Sheet open={Boolean(editTx)} onOpenChange={(isOpen) => { if (!isOpen) setEditTx(null); }}>
        <SheetContent>
          <SheetTitle>Edit Transaksi</SheetTitle>
          <form onSubmit={saveEdit} className="mt-5 space-y-4">
            <Tabs value={editType} onValueChange={(value) => setEditType(value as "income" | "expense")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Pemasukan</TabsTrigger>
                <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
              </TabsList>
            </Tabs>
            <label className="block text-sm font-medium">
              Nominal
              <Input className="mt-2 font-mono tabular-nums" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} inputMode="numeric" type="number" min="0" placeholder="Rp" required />
            </label>
            <label className="block text-sm font-medium">
              Catatan
              <Textarea className="mt-2" value={editNote} onChange={(event) => setEditNote(event.target.value)} placeholder="Catatan transaksi" required />
            </label>
            <label className="block text-sm font-medium">
              Tanggal
              <Input className="mt-2" type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
            </label>
            <Button className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      <div className="mt-5 hidden overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--card)] md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Catatan</th>
              <th className="px-4 py-3">Pengirim</th>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id} className="border-t border-[var(--line)] transition hover:bg-[var(--surface)]">
                <td className="px-4 py-3 text-[var(--muted)]">{formatDate(item.created_at)}</td>
                <td className="px-4 py-3 font-medium">{item.note || "-"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{item.sender_name || "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.type === "income" ? "income" : "expense"}>
                    {item.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </Badge>
                </td>
                <td className={cn("px-4 py-3 text-right font-mono font-semibold tabular-nums", item.type === "income" ? "text-emerald-500" : "text-rose-500")}>
                  {item.type === "income" ? "+" : "-"}{formatRupiah(item.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Edit transaksi">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500" onClick={() => remove(item)} aria-label="Hapus transaksi">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-2 md:hidden">
        {transactions.map((item) => (
          <div key={item.id} className="min-h-16 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-3 shadow-[var(--soft-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{item.note || "Transaksi"}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {formatDate(item.created_at)} - {item.sender_name || "WhatsApp"}
                </p>
              </div>
              <p className={cn("shrink-0 font-mono text-sm font-semibold tabular-nums", item.type === "income" ? "text-emerald-500" : "text-rose-500")}>
                {item.type === "income" ? "+" : "-"}{formatRupiah(item.amount)}
              </p>
            </div>
            <div className="mt-2 flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Edit transaksi">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500" onClick={() => remove(item)} aria-label="Hapus transaksi">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-mono tabular-nums">
          {item.dataKey === "income" ? "Pemasukan" : "Pengeluaran"}:{" "}
          {formatRupiah(item.value)}
        </p>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-5 rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--panel)]/55 p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-normal md:text-[34px]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "income" | "warning";
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-lg font-semibold tabular-nums",
          tone === "income" ? "text-emerald-500" : tone === "warning" ? "text-amber-400" : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}

type ChartPoint = { label: string; income: number; expense: number };

function buildCashflow(transactions: Transaction[], range: "month" | "week") {
  const map = new Map<string, ChartPoint>();
  transactions.forEach((item) => {
    const date = new Date(item.created_at);
    const label =
      range === "month"
        ? new Intl.DateTimeFormat("id-ID", { month: "short", year: "2-digit" }).format(date)
        : `M${getWeek(date)}`;
    const row = map.get(label) ?? { label, income: 0, expense: 0 };
    row[item.type] += Number(item.amount || 0);
    map.set(label, row);
  });
  return Array.from(map.values()).reverse().slice(-8);
}

function getWeek(date: Date) {
  const first = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - first.getTime()) / 86_400_000 + first.getDay() + 1) / 7);
}

function parseMoneyToken(value: string) {
  const cleaned = value.toLowerCase().replace(/\s/g, "").replace(",", ".");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(jt|juta|rb|ribu|k)?$/);
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  const suffix = match[2];
  if (!Number.isFinite(amount)) return Number.NaN;
  if (suffix === "jt" || suffix === "juta") return amount * 1_000_000;
  if (suffix === "rb" || suffix === "ribu" || suffix === "k") return amount * 1_000;
  return amount;
}

function calculateMoneyExpression(expression: string) {
  if (!expression.trim()) return { ok: true, value: 0 };

  const normalized = expression
    .replace(/x/gi, "*")
    .replace(/÷/g, "/")
    .replace(/(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|k)?)/gi, (token) =>
      String(parseMoneyToken(token)),
    );

  if (!/^[\d+\-*/().\s]+$/.test(normalized) || normalized.includes("NaN")) {
    return { ok: false, value: 0 };
  }

  try {
    const value = Function(`"use strict"; return (${normalized})`)() as number;
    return Number.isFinite(value) ? { ok: true, value } : { ok: false, value: 0 };
  } catch {
    return { ok: false, value: 0 };
  }
}

function TransactionSheet({
  groupId,
  sessionToken = "",
  botApiUrl = "",
  onSaved,
  compact = false,
  initialType = "income",
  label,
  triggerClassName,
}: {
  groupId: string;
  sessionToken?: string;
  botApiUrl?: string;
  onSaved: () => void;
  compact?: boolean;
  initialType?: "income" | "expense";
  label?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">(initialType);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!groupId || Number(amount) <= 0) return;
    setSaving(true);
    let botOk = false;

    if (shouldWriteLegacyBot(botApiUrl)) {
      const botRes = await fetchBotGroupData({
        resource: "transactions",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: {
          type,
          amount: Number(amount),
          note,
          sender_name: "Dashboard",
        },
      });
      botOk = Boolean(botRes.ok);
    }

    if (shouldWriteLegacyBot(botApiUrl) && !botOk) {
      setSaving(false);
      toast.error("Transaksi belum disimpan karena bot WA tidak menerima data.");
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      group_id: groupId,
      type,
      amount: Number(amount),
      note,
      sender_id: DASHBOARD_SYNCED_SENDER_ID,
      sender_name: "Dashboard",
      created_at: new Date(`${date}T12:00:00`).toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Transaksi disimpan.");
    setAmount("");
    setNote("");
    setOpen(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) setType(initialType);
    }}>
      <SheetTrigger asChild>
        <Button
          size={compact ? "icon" : "default"}
          variant={triggerClassName ? "outline" : "default"}
          className={cn(compact ? "h-12 w-12 rounded-full shadow-lg" : "", triggerClassName)}
        >
          <Plus className="h-4 w-4" />
          {compact ? null : <span>{label ?? "Catat Transaksi"}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle>Catat Transaksi</SheetTitle>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <Tabs value={type} onValueChange={(value) => setType(value as typeof type)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income">Pemasukan</TabsTrigger>
              <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="block text-sm font-medium">
            Nominal
            <Input
              className="mt-2 font-mono tabular-nums"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              type="number"
              min="0"
              placeholder="Rp"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Catatan
            <Textarea
              className="mt-2"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Contoh: Iuran bulanan"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Tanggal
            <Input
              className="mt-2"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <Button className="w-full" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function ParticipantsPage({
  loading,
  groupId,
  sessionToken = "",
  botApiUrl = "",
  participants,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken?: string;
  botApiUrl?: string;
  participants: Participant[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [dues, setDues] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [open, setOpen] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Participant | null>(null);
  const [editName, setEditName] = useState("");
  const [editDues, setEditDues] = useState("");
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const paid = participants.filter((participant) => participant.data?.status === "paid");
    const total = paid.reduce(
      (sum, participant) => sum + Number(participant.data?.dues_amount ?? 0),
      0,
    );
    return {
      total: participants.length,
      paid: paid.length,
      unpaid: participants.length - paid.length,
      collected: total,
    };
  }, [participants]);

  const visibleParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const status = participant.data?.status === "paid" ? "paid" : "unpaid";
      const matchesFilter = filter === "all" || filter === status;
      const matchesQuery = participant.name
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, participants, query]);

  async function add(event: FormEvent) {
    event.preventDefault();
    let botOk = false;
    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "participants",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: { name, phone: "", note: String(dues || 0) },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase.from("participants").insert({
      group_id: groupId,
      name,
      data: { dues_amount: Number(dues || 0), status: "unpaid" },
    });
    if (error && !botOk) toast.error(error.message);
    else {
      toast.success("Anggota ditambahkan.");
      setName("");
      setDues("");
      setOpen(false);
      onChanged();
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editParticipant) return;
    setSaving(true);
    let botOk = false;
    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "participants",
        id: editParticipant.id,
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: { name: editName, phone: "", note: String(editDues || 0) },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("participants")
      .update({
        name: editName,
        data: { ...(editParticipant.data ?? {}), dues_amount: Number(editDues || 0) },
        updated_at: new Date().toISOString(),
      })
      .eq("id", editParticipant.id);
    setSaving(false);
    if (error && !botOk) { toast.error(error.message); return; }
    toast.success("Anggota diperbarui.");
    setEditParticipant(null);
    onChanged();
  }

  async function mark(participant: Participant, status: "paid" | "unpaid") {
    let botOk = false;
    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "participants",
        id: participant.id,
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          name: participant.name,
          phone: "",
          note: JSON.stringify({ ...(participant.data ?? {}), status }),
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("participants")
      .update({
        data: { ...(participant.data ?? {}), status },
        updated_at: new Date().toISOString(),
      })
      .eq("id", participant.id);
    if (error && !botOk) toast.error(error.message);
    else onChanged();
  }

  async function remove(participant: Participant) {
    let botOk = false;
    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "participants",
        id: participant.id,
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("participants")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", participant.id);
    if (error && !botOk) toast.error(error.message);
    else { toast.success("Anggota dihapus."); onChanged(); }
  }

  return (
    <div className="space-y-4">
      <PageIntro
        title="Anggota"
        description="Kelola anggota dan kontribusi grup"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4" />
                Tambah
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Tambah Anggota</SheetTitle>
              <form onSubmit={add} className="mt-5 space-y-3">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama anggota" required />
                <Input value={dues} onChange={(event) => setDues(event.target.value)} type="number" inputMode="numeric" placeholder="Nominal iuran" />
                <Button className="w-full">Simpan Anggota</Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <Sheet open={Boolean(editParticipant)} onOpenChange={(isOpen) => { if (!isOpen) setEditParticipant(null); }}>
        <SheetContent>
          <SheetTitle>Edit Anggota</SheetTitle>
          <form onSubmit={saveEdit} className="mt-5 space-y-3">
            <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="Nama anggota" required />
            <Input value={editDues} onChange={(event) => setEditDues(event.target.value)} type="number" inputMode="numeric" placeholder="Nominal iuran" />
            <Button className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <SummaryTile label="Total Anggota" value={String(summary.total)} />
        <SummaryTile label="Sudah Bayar" value={String(summary.paid)} tone="income" />
        <SummaryTile label="Belum Bayar" value={String(summary.unpaid)} tone="warning" />
        <SummaryTile label="Terkumpul" value={formatRupiah(summary.collected)} tone="income" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari anggota" />
        </label>
        <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="min-h-11 rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm">
          <option value="all">Semua status</option>
          <option value="paid">Sudah bayar</option>
          <option value="unpaid">Belum bayar</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--soft-shadow)]">
        {loading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : visibleParticipants.length ? (
          <div className="divide-y divide-[var(--line)]">
            {visibleParticipants.map((participant) => {
              const status = participant.data?.status === "paid" ? "paid" : "unpaid";
              const due = Number(participant.data?.dues_amount ?? 0);
              const initials = participant.name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase();
              return (
                <div key={participant.id} className="flex min-h-16 flex-wrap items-center gap-3 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--panel)] text-sm font-semibold">
                    {initials || "A"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{participant.name}</p>
                    <p className="font-mono text-xs text-[var(--muted)] tabular-nums">Iuran {formatRupiah(due)}</p>
                  </div>
                  <div className="ml-auto flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0 sm:justify-end">
                    <Badge tone={status === "paid" ? "income" : "warning"}>
                      {status === "paid" ? "Lunas" : "Belum bayar"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => mark(participant, status === "paid" ? "unpaid" : "paid")}>
                      {status === "paid" ? "Reset" : "Lunas"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditName(participant.name);
                        setEditDues(String(participant.data?.dues_amount ?? ""));
                        setEditParticipant(participant);
                      }}
                      aria-label="Edit anggota"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                      onClick={() => remove(participant)}
                      aria-label="Hapus anggota"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Anggota belum ada" description="Tambahkan anggota grup untuk memantau iuran." />
        )}
      </div>
    </div>
  );
}

function TodosPage({
  loading,
  groupId,
  sessionToken = "",
  botApiUrl = "",
  todos,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken?: string;
  botApiUrl?: string;
  todos: Todo[];
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<"rendah" | "normal" | "tinggi">("normal");
  const [filter, setFilter] = useState<"all" | "high" | "done">("all");
  const [open, setOpen] = useState(false);

  const filteredTodos = todos.filter((todo) => {
    if (filter === "high") {
      const parsed = parseTodo(todo.todo_text);
      return parsed.priority === "tinggi";
    }
    if (filter === "done") {
      return todo.is_done;
    }
    return true;
  });

  const todoItems = filteredTodos.filter((t) => !t.is_done);
  const doneItems = filteredTodos.filter((t) => t.is_done);

  async function add(event: FormEvent) {
    event.preventDefault();
    const todo_text = priority === "normal" ? text : `[${priority}] ${text}`;
    let botOk = false;

    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "todos",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: {
          title: todo_text,
          done: false,
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase.from("todos").insert({ group_id: groupId, todo_text });
    if (error && !botOk) toast.error(error.message);
    else {
      setText("");
      setOpen(false);
      toast.success("Tugas ditambahkan.");
      onChanged();
    }
  }

  async function toggle(todo: Todo) {
    let botOk = false;
    const targetGroupId = todo.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "todos",
        id: todo.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          done: !todo.is_done,
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("todos")
      .update({ is_done: !todo.is_done, updated_at: new Date().toISOString() })
      .eq("id", todo.id);
    if (error && !botOk) toast.error(error.message);
    else onChanged();
  }

  async function remove(todo: Todo) {
    let botOk = false;
    const targetGroupId = todo.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "todos",
        id: todo.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("todos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", todo.id);
    if (error && !botOk) toast.error(error.message);
    else { toast.success("Tugas dihapus."); onChanged(); }
  }

  return (
    <div className="space-y-4">
      {/* Head */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
        <div>
          <h1 className="text-[clamp(30px,3vw,40px)] font-semibold leading-[1.1] tracking-[-0.035em]">
            Tugas & Kanban
          </h1>
          <p className="mt-2 text-[15px] text-[var(--muted)]">
            Kelola dan pantau seluruh aktivitas tim dan proyek grup WhatsApp
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Tambah Tugas
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Tambah Tugas Baru</SheetTitle>
            <form onSubmit={add} className="mt-5 space-y-3">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Deskripsi tugas atau kegiatan..."
                required
              />
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as "rendah" | "normal" | "tinggi")}
                className="min-h-11 w-full rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium"
              >
                <option value="normal">Prioritas Normal</option>
                <option value="tinggi">Prioritas Tinggi (High)</option>
                <option value="rendah">Prioritas Rendah (Low)</option>
              </select>
              <Button className="w-full">Simpan Tugas</Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Toolbar filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <div className="flex rounded-full bg-[var(--card)] p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition",
              filter === "all"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Semua ({todos.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("high")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition",
              filter === "high"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Prioritas Tinggi
          </button>
          <button
            type="button"
            onClick={() => setFilter("done")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition",
              filter === "done"
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Selesai ({doneItems.length})
          </button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          <b>{filteredTodos.length}</b> tugas ditampilkan
        </p>
      </div>

      {/* Fernly Kanban Board */}
      {loading ? (
        <Skeleton className="h-96 w-full rounded-[20px]" />
      ) : todos.length ? (
        <div className="fernly-kanban">
          {/* Column 1: To do */}
          <div className="fernly-col">
            <div className="fernly-col__head">
              <span className="fernly-col__dot bg-[#8d9a92]" />
              <h2 className="text-[15px] font-semibold tracking-tight">Belum Selesai (To do)</h2>
              <span className="fernly-col__count">{todoItems.length}</span>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              {todoItems.length ? (
                todoItems.map((todo) => {
                  const parsed = parseTodo(todo.todo_text);
                  return (
                    <div key={todo.id} className="fernly-task">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            parsed.priority === "tinggi"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800",
                          )}
                        >
                          {parsed.priority === "tinggi" ? "High Priority" : "Tugas Grup"}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggle(todo)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-emerald-500 hover:text-emerald-600"
                            title="Tandai selesai"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(todo)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-2)] transition hover:text-rose-500"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-[14.5px] font-semibold leading-snug tracking-tight">
                        {parsed.text}
                      </p>
                      {/* Meter progress bar */}
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                        <div className="h-full w-1/4 rounded-full bg-[var(--primary)]" />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Hari ini
                        </span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                          WA
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[14px] border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--muted)]">
                  Tidak ada tugas to-do
                </div>
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="fernly-col">
            <div className="fernly-col__head">
              <span className="fernly-col__dot bg-[#e8a317]" />
              <h2 className="text-[15px] font-semibold tracking-tight">Sedang Berjalan</h2>
              <span className="fernly-col__count">
                {todoItems.filter((t) => parseTodo(t.todo_text).priority === "tinggi").length}
              </span>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              {todoItems.filter((t) => parseTodo(t.todo_text).priority === "tinggi").length ? (
                todoItems
                  .filter((t) => parseTodo(t.todo_text).priority === "tinggi")
                  .map((todo) => {
                    const parsed = parseTodo(todo.todo_text);
                    return (
                      <div key={todo.id} className="fernly-task border-l-4 border-amber-400">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            Sedang Dikerjakan
                          </span>
                          <button
                            type="button"
                            onClick={() => toggle(todo)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-emerald-500 hover:text-emerald-600"
                            title="Tandai selesai"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-3 text-[14.5px] font-semibold leading-snug tracking-tight">
                          {parsed.text}
                        </p>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                          <div className="h-full w-2/3 rounded-full bg-amber-500" />
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Dalam proses
                          </span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                            WA
                          </span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="rounded-[14px] border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--muted)]">
                  Tugas prioritas tinggi akan muncul di sini
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Done */}
          <div className="fernly-col">
            <div className="fernly-col__head">
              <span className="fernly-col__dot bg-[var(--income)]" />
              <h2 className="text-[15px] font-semibold tracking-tight">Selesai (Done)</h2>
              <span className="fernly-col__count">{doneItems.length}</span>
            </div>
            <div className="flex-1 space-y-3 pt-2">
              {doneItems.length ? (
                doneItems.map((todo) => {
                  const parsed = parseTodo(todo.todo_text);
                  return (
                    <div key={todo.id} className="fernly-task opacity-80">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Selesai
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggle(todo)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white"
                            title="Buka kembali"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(todo)}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted-2)] transition hover:text-rose-500"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-[14.5px] font-medium leading-snug tracking-tight line-through text-[var(--muted)]">
                        {parsed.text}
                      </p>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                        <div className="h-full w-full rounded-full bg-[var(--income)]" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[14px] border border-dashed border-[var(--line)] p-8 text-center text-xs text-[var(--muted)]">
                  Belum ada tugas yang diselesaikan
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Tugas kosong" description="Tambahkan tugas grup baru tanpa membuat data palsu." />
      )}
    </div>
  );
}

function parseTodo(value: string) {
  const match = value.match(/^\[(.+?)\]\s(.+)$/);
  return { priority: match?.[1] ?? "normal", text: match?.[2] ?? value };
}

type ReminderScheduleType = "time" | "date" | "datetime";

function isReminderScheduleType(value: string): value is ReminderScheduleType {
  return value === "time" || value === "date" || value === "datetime";
}

function toReminderScheduleType(value: string | undefined): ReminderScheduleType {
  return isReminderScheduleType(value ?? "") ? value as ReminderScheduleType : "time";
}

function toReminderDateValue(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function toDateInputValue(value: string) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const localMatch = trimmed.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!localMatch) return "";

  const day = localMatch[1].padStart(2, "0");
  const month = localMatch[2].padStart(2, "0");
  const rawYear = localMatch[3] ?? String(new Date().getFullYear());
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(value: string) {
  const match = value.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function buildReminderValue(type: ReminderScheduleType, dateValue: string, timeValue: string) {
  if (type === "time") return timeValue;
  if (type === "date") return toReminderDateValue(dateValue);
  return [toReminderDateValue(dateValue), timeValue].filter(Boolean).join(" ");
}

function formatReminderTypeLabel(type: string) {
  if (type === "time") return "Jam";
  if (type === "date") return "Tanggal";
  if (type === "datetime") return "Tanggal & jam";
  return type || "Reminder";
}

function formatReminderScheduleValue(type: string, value: string) {
  if (type !== "datetime") return value;
  const date = toDateInputValue(value);
  const time = toTimeInputValue(value);
  return [date ? toReminderDateValue(date) : "", time].filter(Boolean).join(" · ") || value;
}

function ReminderScheduleFields({
  type,
  value,
  onChange,
  label = "Jadwal",
}: {
  type: ReminderScheduleType;
  value: string;
  onChange: (patch: { type: ReminderScheduleType; value: string }) => void;
  label?: string;
}) {
  const dateValue = toDateInputValue(value);
  const timeValue = toTimeInputValue(value);

  function update(nextType: ReminderScheduleType, nextDate: string, nextTime: string) {
    onChange({
      type: nextType,
      value: buildReminderValue(nextType, nextDate, nextTime),
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="grid grid-cols-3 rounded-[13px] border border-[var(--line)] bg-[var(--surface)] p-1">
          {[
            { value: "time", label: "Jam" },
            { value: "date", label: "Tanggal" },
            { value: "datetime", label: "Tanggal + jam" },
          ].map((item) => {
            const active = type === item.value;
            return (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "min-h-10 rounded-[10px] px-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:text-sm",
                  active
                    ? "bg-[#0D3A23] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
                )}
                onClick={() => update(item.value as ReminderScheduleType, dateValue, timeValue)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {type === "time" ? (
        <label className="block text-sm font-medium">
          Jam
          <Input
            className="mt-2 font-mono tabular-nums"
            type="time"
            value={timeValue}
            required
            onChange={(event) => {
              const nextTime = event.target.value;
              update(type, dateValue, nextTime);
            }}
          />
        </label>
      ) : null}

      {type === "date" ? (
        <label className="block text-sm font-medium">
          Tanggal
          <Input
            className="mt-2 font-mono tabular-nums"
            type="date"
            value={dateValue}
            required
            onChange={(event) => {
              const nextDate = event.target.value;
              update(type, nextDate, timeValue);
            }}
          />
        </label>
      ) : null}

      {type === "datetime" ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="block text-sm font-medium">
            Tanggal
            <Input
              className="mt-2 font-mono tabular-nums"
              type="date"
              value={dateValue}
              required
              onChange={(event) => {
                const nextDate = event.target.value;
                update(type, nextDate, timeValue);
              }}
            />
          </label>
          <label className="block text-sm font-medium">
            Jam
            <Input
              className="mt-2 font-mono tabular-nums"
              type="time"
              value={timeValue}
              required
              onChange={(event) => {
                const nextTime = event.target.value;
                update(type, dateValue, nextTime);
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function RemindersPage({
  loading,
  groupId,
  sessionToken,
  botApiUrl,
  reminders,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken: string;
  botApiUrl: string;
  reminders: Reminder[];
  onChanged: () => void;
}) {
  const [type, setType] = useState<ReminderScheduleType>("time");
  const [value, setValue] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      if (shouldWriteLegacyBot(botApiUrl)) {
        const data = await fetchBotGroupData({
          resource: "reminders",
          groupId,
          apiUrl: botApiUrl,
          token: sessionToken,
          method: "POST",
          body: {
            remind_type: type,
            remind_value: value,
            remind_text: text,
          },
        });
        if (!data.ok) {
          throw new Error(data.message ?? "Reminder bot tidak bisa disimpan");
        }
      } else {
        const { error } = await supabase.from("reminders").insert({
          group_id: groupId,
          remind_type: type,
          remind_value: value,
          remind_text: text,
          created_by: "Dashboard",
        });
        if (error) throw error;
      }

      toast.success("Reminder disimpan.");
      setText("");
      setValue("");
      setType("time");
      setOpen(false);
      onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Reminder gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(reminder: Reminder) {
    let botOk = false;
    const targetGroupId = reminder.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "reminders",
        id: reminder.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("reminders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reminder.id);
    if (error && !botOk) toast.error(error.message);
    else { toast.success("Reminder dihapus."); onChanged(); }
  }

  return (
    <div className="space-y-4">
      <PageIntro
        title="Reminder"
        description="Jadwal otomatis untuk grup WhatsApp"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Buat Reminder
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Reminder Baru</SheetTitle>
              <form onSubmit={add} className="mt-5 space-y-3">
                <ReminderScheduleFields
                  type={type}
                  value={value}
                  onChange={(patch) => {
                    setType(patch.type);
                    setValue(patch.value);
                  }}
                />
                <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Isi reminder" required />
                <Button className="w-full" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan Reminder"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />
      <div className="overflow-hidden rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-2 shadow-[var(--soft-shadow)]">
        {loading ? (
          <Skeleton className="h-32" />
        ) : reminders.length ? (
          <div className="divide-y divide-[var(--line)]">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center gap-3 rounded-[16px] p-3 transition hover:bg-[var(--surface)]">
                <div className="flex flex-col items-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--panel)] text-emerald-500">
                    <CalendarClock className="h-4 w-4" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{reminder.remind_text}</p>
                    <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-xs text-[var(--muted)]">
                      {formatReminderTypeLabel(reminder.remind_type)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {formatReminderScheduleValue(reminder.remind_type, reminder.remind_value)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Dibuat oleh {reminder.created_by ?? "Dashboard"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  onClick={() => remove(reminder)}
                  aria-label="Hapus reminder"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Belum ada reminder" description="Reminder otomatis grup akan tampil di sini." />
        )}
      </div>
    </div>
  );
}

function CommandsPage({
  loading,
  groupId,
  sessionToken = "",
  botApiUrl = "",
  commands,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken?: string;
  botApiUrl?: string;
  commands: Command[];
  onChanged: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editCommand, setEditCommand] = useState<Command | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editResponse, setEditResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const visibleCommands = useMemo(
    () =>
      commands.filter(
        (command) =>
          command.keyword.toLowerCase().includes(query.toLowerCase()) ||
          command.response.toLowerCase().includes(query.toLowerCase()),
      ),
    [commands, query],
  );

  function openEdit(command: Command) {
    setEditKeyword(command.keyword);
    setEditResponse(command.response);
    setEditCommand(command);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    let botOk = false;

    if (shouldWriteLegacyBot(botApiUrl)) {
      const res = await fetchBotGroupData({
        resource: "commands",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: {
          keyword,
          response,
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase.from("custom_commands").insert({
      group_id: groupId,
      keyword,
      response,
    });
    setSaving(false);
    if (error && !botOk) toast.error(error.message);
    else {
      toast.success("Command disimpan.");
      setKeyword("");
      setResponse("");
      setOpen(false);
      onChanged();
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editCommand) return;
    setSaving(true);
    let botOk = false;
    const targetGroupId = editCommand.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "commands",
        id: editCommand.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          keyword: editKeyword,
          response: editResponse,
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("custom_commands")
      .update({
        keyword: editKeyword,
        response: editResponse,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editCommand.id);
    setSaving(false);
    if (error && !botOk) { toast.error(error.message); return; }
    toast.success("Command diperbarui.");
    setEditCommand(null);
    onChanged();
  }

  async function remove(command: Command) {
    let botOk = false;
    const targetGroupId = command.group_id || groupId;

    if (shouldWriteLegacyBot(botApiUrl) && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "commands",
        id: command.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase
      .from("custom_commands")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", command.id);
    if (error && !botOk) toast.error(error.message);
    else { toast.success("Command dihapus."); onChanged(); }
  }

  return (
    <div className="space-y-4">
      <PageIntro
        title="Command"
        description="Kelola respon otomatis WhatsApp"
        action={
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Command Baru
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>Command Baru</SheetTitle>
              <form onSubmit={add} className="mt-5 space-y-3">
                <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Keyword, contoh: /kas" required />
                <Textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Respon otomatis" required />
                <Button className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Command"}</Button>
              </form>
            </SheetContent>
          </Sheet>
        }
      />

      <Sheet open={Boolean(editCommand)} onOpenChange={(isOpen) => { if (!isOpen) setEditCommand(null); }}>
        <SheetContent>
          <SheetTitle>Edit Command</SheetTitle>
          <form onSubmit={saveEdit} className="mt-5 space-y-3">
            <Input value={editKeyword} onChange={(event) => setEditKeyword(event.target.value)} placeholder="Keyword" required />
            <Textarea value={editResponse} onChange={(event) => setEditResponse(event.target.value)} placeholder="Respon otomatis" required />
            <Button className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          </form>
        </SheetContent>
      </Sheet>

      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
        <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari command" />
      </label>
      <div>
        {loading ? (
          <Skeleton className="h-32" />
        ) : visibleCommands.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleCommands.map((command) => (
              <div key={command.id} className="flex flex-col justify-between rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
                <div>
                  <p className="font-mono text-sm font-semibold text-emerald-500">{command.keyword}</p>
                  <div className="mt-3 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3">
                    <p className="line-clamp-4 text-sm">{command.response}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)]/50 pt-2">
                  <span className="text-xs text-[var(--muted)]">Text response</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(command)}
                      aria-label="Edit command"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                      onClick={() => remove(command)}
                      aria-label="Hapus command"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Command kosong" description="Buat trigger respon otomatis untuk grup WhatsApp." />
        )}
      </div>
    </div>
  );
}

const helpCommandSections = [
  {
    title: "Keuangan",
    roles: ["admin", "owner"] as const,
    commands: [
      ["+500k Donasi", "Catat pemasukan"],
      ["-75k Konsumsi", "Catat pengeluaran"],
      ["trx", "Lihat transaksi terbaru"],
      ["trx 12", "Lihat detail transaksi"],
      ["edittrx 12 +600k Revisi", "Ubah transaksi"],
      ["deltrx 12", "Hapus transaksi"],
      ["laporan", "Ringkasan kas bulan berjalan"],
      ["calc 150k x 3", "Kalkulator nominal"],
    ],
  },
  {
    title: "Agenda",
    roles: ["admin", "owner"] as const,
    commands: [
      ["agenda", "Todo aktif dan reminder terdekat"],
      ["todo+ Beli konsumsi", "Tambah tugas"],
      ["todo", "Lihat semua tugas"],
      ["doto 2", "Tandai tugas selesai"],
      ["deltodo 2", "Hapus tugas"],
      ["r besok 08:00@Rapat", "Buat reminder"],
      ["rl", "Lihat reminder aktif"],
      ["delr 2", "Hapus reminder"],
    ],
  },
  {
    title: "Grup & Otomasi",
    roles: ["admin", "owner"] as const,
    commands: [
      ["pt", "Lihat daftar anggota"],
      ["addpt Budi@0812", "Tambah anggota"],
      ["editpt 12@Budi S", "Ubah anggota"],
      ["delpt 12", "Hapus anggota"],
      ["cmd", "Lihat custom command"],
      ["addcmd INFO@Teks", "Tambah custom command"],
      ["editcmd INFO@Teks", "Ubah custom command"],
      ["delcmd INFO", "Hapus custom command"],
    ],
  },
  {
    title: "Layanan",
    roles: ["admin", "owner"] as const,
    commands: [
      ["dash", "Buat link dashboard grup"],
      ["wthr", "Lihat cuaca lokasi grup"],
      ["lokweather Bogor", "Atur lokasi cuaca"],
      ["cekbot", "Cek masa aktif sewa"],
      ["pin", "Cek PIN dashboard"],
      ["newpin", "Buat PIN dashboard baru"],
      ["typo on", "Aktifkan koreksi perintah"],
      ["help", "Buka daftar perintah sesuai role"],
    ],
  },
  {
    title: "Owner",
    roles: ["owner"] as const,
    commands: [
      ["#info (idgrup)", "Informasi detail grup"],
      ["#on (idgrup) 30", "Aktifkan sewa grup"],
      ["#off (idgrup)", "Nonaktifkan sewa grup"],
      ["#rent", "Status seluruh sewa"],
      ["#bc@pesan", "Broadcast semua grup"],
      ["#bcnomor 62xxx@pesan", "Broadcast nomor"],
      ["#server", "Cek kesehatan server"],
      ["#backup", "Buat backup database"],
      ["#resettotal", "Mulai reset total"],
    ],
  },
] as const;

function HelpPage({ role }: { role: "admin" | "owner" }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const sections = helpCommandSections
    .filter((section) => section.roles.includes(role as never))
    .map((section) => ({
      ...section,
      commands: section.commands.filter(([command, description]) =>
        `${command} ${description}`.toLowerCase().includes(normalizedSearch),
      ),
    }))
    .filter((section) => section.commands.length > 0);

  return (
    <div className="space-y-5">
      <PageIntro
        title="Bantuan"
        description="Perintah WhatsApp aktif untuk akun dan grup BotUang"
      />
      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" />
        <Input
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari perintah atau fungsi"
        />
      </label>

      {sections.length ? (
        <div className="grid gap-x-8 gap-y-7 xl:grid-cols-2">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={`help-${section.title}`}>
              <h2 id={`help-${section.title}`} className="border-b border-[var(--line)] pb-3 font-semibold">
                {section.title}
              </h2>
              <div className="divide-y divide-[var(--line)]">
                {section.commands.map(([command, description]) => (
                  <div key={command} className="grid min-h-14 gap-1 py-3 sm:grid-cols-[minmax(170px,.8fr)_1fr] sm:items-center sm:gap-4">
                    <code className="w-fit rounded-[8px] bg-[var(--panel)] px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {command}
                    </code>
                    <p className="text-sm text-[var(--muted)]">{description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState title="Perintah tidak ditemukan" description="Coba kata kunci lain." />
      )}
    </div>
  );
}

function SettingToggle({
  icon: Icon,
  title,
  enabled,
  onEnabledChange,
}: {
  icon: typeof CloudSun;
  title: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-500" />
        {title}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border border-[var(--line)] transition",
          enabled ? "bg-[#0D3A23]" : "bg-[var(--panel)]",
        )}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            enabled ? "left-5" : "left-0.5",
          )}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function LocationInput({
  value,
  onChange,
  placeholder,
  onUseLocation,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onUseLocation: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <Button type="button" variant="outline" onClick={onUseLocation}>
        <MapPin className="h-4 w-4" />
        Pakai lokasi
      </Button>
    </div>
  );
}

const settingsPanelClass =
  "rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]";
const settingsSubPanelClass =
  "rounded-[16px] border border-[var(--line)] bg-[var(--surface)] p-3";

type EnabledPrayers = {
  subuh: boolean;
  dzuhur: boolean;
  ashar: boolean;
  maghrib: boolean;
  isya: boolean;
};

type SettingsFormState = {
  header: string;
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
  location: string;
  azanLocation: string;
  emergencyLocation: string;
  weatherEnabled: boolean;
  prayerEnabled: boolean;
  prayerMethod: string;
  enabledPrayers: EnabledPrayers;
  prayerOffset: string;
  emergencyEnabled: boolean;
  typoEnabled: boolean;
  spreadsheetUrl: string;
};

type SettingsFormAction =
  | { type: "reset"; value: SettingsFormState }
  | { type: "set"; field: keyof SettingsFormState; value: unknown }
  | { type: "set-prayer"; prayer: keyof EnabledPrayers; value: boolean };

function getSettingsFormState(settings: GroupSettings | null): SettingsFormState {
  return {
    header: settings?.header_text ?? "",
    locationName: settings?.location_name ?? "",
    latitude:
      settings?.location_latitude == null
        ? ""
        : String(settings.location_latitude),
    longitude:
      settings?.location_longitude == null
        ? ""
        : String(settings.location_longitude),
    timezone: settings?.location_timezone ?? "Asia/Jakarta",
    location: settings?.weather_location ?? "",
    azanLocation: settings?.azan_location ?? settings?.weather_location ?? "",
    emergencyLocation:
      settings?.emergency_location ?? settings?.weather_location ?? "",
    weatherEnabled: settings?.weather_enabled ?? true,
    prayerEnabled: settings?.prayer_enabled ?? settings?.azan_enabled ?? false,
    prayerMethod: String(settings?.prayer_method ?? 20),
    enabledPrayers: {
      subuh: settings?.prayer_subuh_enabled ?? true,
      dzuhur: settings?.prayer_dzuhur_enabled ?? true,
      ashar: settings?.prayer_ashar_enabled ?? true,
      maghrib: settings?.prayer_maghrib_enabled ?? true,
      isya: settings?.prayer_isya_enabled ?? true,
    },
    prayerOffset: String(settings?.prayer_reminder_offset_minutes ?? 0),
    emergencyEnabled: settings?.emergency_enabled ?? false,
    typoEnabled: settings?.typo_enabled ?? true,
    spreadsheetUrl: settings?.spreadsheet_url ?? "",
  };
}

function settingsFormReducer(
  state: SettingsFormState,
  action: SettingsFormAction,
): SettingsFormState {
  if (action.type === "reset") return action.value;
  if (action.type === "set-prayer") {
    return {
      ...state,
      enabledPrayers: {
        ...state.enabledPrayers,
        [action.prayer]: action.value,
      },
    };
  }
  return { ...state, [action.field]: action.value } as SettingsFormState;
}

function SettingsPage({
  loading,
  groupId,
  sessionToken,
  botApiUrl,
  rental,
  settings,
  days,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken: string;
  botApiUrl: string;
  rental: Rental | null;
  settings: GroupSettings | null;
  days: number | null;
  onChanged: () => void;
}) {
  const [form, dispatchForm] = useReducer(
    settingsFormReducer,
    settings,
    getSettingsFormState,
  );
  const {
    header,
    locationName,
    latitude,
    longitude,
    timezone,
    location,
    azanLocation,
    emergencyLocation,
    weatherEnabled,
    prayerEnabled,
    prayerMethod,
    enabledPrayers,
    prayerOffset,
    emergencyEnabled,
    typoEnabled,
    spreadsheetUrl,
  } = form;
  const [prayerStatus, setPrayerStatus] = useState<PrayerStatus | null>(null);
  const [prayerStatusLoading, setPrayerStatusLoading] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [qrisPreviewUrl, setQrisPreviewUrl] = useState("");
  const [newPin, setNewPin] = useState("");
  const [months, setMonths] = useState("1");
  const [proof, setProof] = useState<File | null>(null);
  const [settingsSection, setSettingsSection] = useState<
    "rental" | "group" | "location" | "bot" | "security"
  >("rental");

  useEffect(() => {
    dispatchForm({ type: "reset", value: getSettingsFormState(settings) });
  }, [settings]);

  function setFormField<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K],
  ) {
    dispatchForm({ type: "set", field, value });
  }

  function setEnabledPrayer(prayer: keyof EnabledPrayers, value: boolean) {
    dispatchForm({ type: "set-prayer", prayer, value });
  }

  useEffect(() => {
    if (!groupId || settingsSection !== "location") return;
    void loadPrayerStatus();
  }, [groupId, settingsSection, settings?.updated_at]);

  useEffect(() => {
    supabase
      .from("owner_settings")
      .select("qris_image_url")
      .eq("id", "default")
      .maybeSingle()
      .then(async ({ data }) => {
        const row = data as { qris_image_url?: string | null } | null;
        const value = row?.qris_image_url ?? "";
        setQrisPreviewUrl(await resolveDashboardImage(value));
      });
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    const payload = {
      group_id: groupId,
      header_text: header,
      location_name: locationName,
      location_latitude: latitude ? Number(latitude) : null,
      location_longitude: longitude ? Number(longitude) : null,
      location_timezone: timezone,
      weather_location: location,
      azan_location: azanLocation,
      emergency_location: emergencyLocation,
      weather_enabled: weatherEnabled,
      azan_enabled: prayerEnabled,
      prayer_enabled: prayerEnabled,
      prayer_method: Number(prayerMethod),
      prayer_subuh_enabled: enabledPrayers.subuh,
      prayer_dzuhur_enabled: enabledPrayers.dzuhur,
      prayer_ashar_enabled: enabledPrayers.ashar,
      prayer_maghrib_enabled: enabledPrayers.maghrib,
      prayer_isya_enabled: enabledPrayers.isya,
      prayer_reminder_offset_minutes: Number(prayerOffset),
      prayer_schedule_cache: null,
      prayer_schedule_cached_for: null,
      prayer_schedule_cached_at: null,
      prayer_last_error: null,
      emergency_enabled: emergencyEnabled,
      typo_enabled: typoEnabled,
      spreadsheet_url: spreadsheetUrl,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("group_settings").upsert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Setting grup disimpan.");
      void fetchBotGroupData({
        resource: "settings",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: payload,
      });
      void loadPrayerStatus();
      onChanged();
    }
  }

  function fillBrowserLocation(target: "weather" | "azan" | "emergency") {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung share lokasi.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(5)},${position.coords.longitude.toFixed(5)}`;
        setFormField("latitude", position.coords.latitude.toFixed(6));
        setFormField("longitude", position.coords.longitude.toFixed(6));
        if (target === "weather") setFormField("location", value);
        if (target === "azan") setFormField("azanLocation", value);
        if (target === "emergency") setFormField("emergencyLocation", value);
        toast.success("Lokasi browser diisi.");
      },
      () => toast.error("Izin lokasi ditolak atau tidak tersedia."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function loadPrayerStatus() {
    if (!groupId) return;
    setPrayerStatusLoading(true);
    try {
      const auth = await supabase.auth.getSession();
      const accessToken = auth.data.session?.access_token ?? "";
      const query = new URLSearchParams({ group_id: groupId });
      const response = await fetch(`/api/prayer/status?${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = (await response.json()) as PrayerStatus;
      setPrayerStatus(data);
    } catch {
      setPrayerStatus({ ok: false, configured: false, message: "Status azan tidak tersedia." });
    } finally {
      setPrayerStatusLoading(false);
    }
  }

  async function sendPrayerTest() {
    setTestSending(true);
    try {
      const auth = await supabase.auth.getSession();
      const accessToken = auth.data.session?.access_token ?? "";
      const response = await fetch("/api/prayer/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          group_id: groupId,
          api_url: botApiUrl,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (data.ok) toast.success(data.message ?? "Test berhasil dikirim ke WhatsApp.");
      else toast.error(data.message ?? "Test pengingat azan gagal.");
    } catch {
      toast.error("Test pengingat azan gagal.");
    } finally {
      setTestSending(false);
    }
  }

  async function changePin(event: FormEvent) {
    event.preventDefault();
    if (newPin.length < 4) {
      toast.error("PIN minimal 4 digit.");
      return;
    }
    const { error } = await supabase
      .from("group_rentals")
      .update({ password: newPin, updated_at: new Date().toISOString() })
      .eq("group_id", groupId);
    if (error) toast.error(error.message);
    else {
      toast.success("PIN dashboard diperbarui.");
      setNewPin("");
      onChanged();
    }
  }

  async function requestExtension(event: FormEvent) {
    event.preventDefault();
    let proofPath = "";
    if (proof) {
      const upload = await uploadDashboardImage({
        bucket: "rental-proofs",
        file: proof,
        groupId,
      });
      if (!upload.ok || !upload.storagePath) {
        toast.error(upload.message ?? "Upload bukti pembayaran gagal.");
        return;
      }
      proofPath = upload.storagePath;
    }
    const auth = await supabase.auth.getSession();
    const accessToken = auth.data.session?.access_token ?? "";
    const response = await fetch("/api/rental/request", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_id: groupId,
        group_name: rental?.group_name ?? "Grup WhatsApp",
        months: Number(months),
        proof_image: proofPath,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (!data.ok) toast.error(data.message ?? "Permintaan perpanjangan gagal.");
    else {
      toast.success(data.message ?? "Permintaan perpanjangan dikirim.");
      setProof(null);
      onChanged();
    }
  }

  if (loading) return <Skeleton className="h-96" />;

  const settingSections = [
    { key: "rental", label: "Rental", icon: WalletCards },
    { key: "group", label: "Group", icon: Users },
    { key: "location", label: "Location & Services", icon: MapPin },
    { key: "bot", label: "Bot", icon: Bot },
    { key: "security", label: "Security", icon: ShieldCheck },
  ] as const;

  return (
    <div className="space-y-4">
      <PageIntro title="Setting" description="Kelola sewa, layanan lokasi, bot, dan keamanan grup" />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <nav className="grid gap-1 self-start rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-2 shadow-[var(--soft-shadow)] lg:sticky lg:top-24">
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                onClick={() => setSettingsSection(section.key)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-[12px] px-3 text-left text-sm font-semibold",
                  settingsSection === section.key
                    ? "bg-[#0D3A23] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
      {settingsSection === "rental" ? (
      <section className={settingsPanelClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Rental Status</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{rental?.group_name ?? "Grup WhatsApp"}</p>
          </div>
          <Badge tone={rental?.is_active ? "income" : "warning"}>
            {rental?.is_active ? "Aktif" : "Tidak aktif"}
          </Badge>
        </div>
        <div className="mt-5 rounded-[18px] border border-emerald-900/20 bg-[#0D3A23] p-4 text-white shadow-[0_18px_38px_-24px_rgba(13,58,35,0.8)]">
          <p className="text-sm text-emerald-100/75">Sisa masa aktif</p>
          <p className="mt-2 text-3xl font-semibold">
            {days === null ? "-" : days > 0 ? `${days} hari` : "Kedaluwarsa"}
          </p>
          <p className="mt-2 text-sm text-emerald-100/75">Berakhir: {formatDate(rental?.expire_at)}</p>
        </div>

        <form onSubmit={requestExtension} className="mt-5 space-y-3">
          <h3 className="font-semibold">Request Perpanjangan</h3>
          {qrisPreviewUrl ? (
            <div className={settingsSubPanelClass}>
              <div className="mb-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-500" />
                <p className="font-semibold">QRIS Owner</p>
              </div>
              <Image
                src={qrisPreviewUrl}
                alt="QRIS pembayaran owner"
                width={512}
                height={512}
                unoptimized
                className="max-h-72 w-full rounded-[14px] object-contain"
              />
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
              QRIS owner belum dikonfigurasi.
            </div>
          )}
          <Input value={months} onChange={(event) => setMonths(event.target.value)} type="number" min="1" placeholder="Jumlah bulan" />
          <ImageDropzone
            label="Upload Bukti Pembayaran"
            description="Drag and drop bukti transfer ke sini atau klik untuk memilih gambar."
            file={proof}
            onFileChange={setProof}
          />
          <Button className="w-full">Kirim Request</Button>
        </form>
      </section>
      ) : null}

      {settingsSection === "group" ? (
        <section className={settingsPanelClass}>
          <h2 className="font-semibold">Group Settings</h2>
          <form onSubmit={saveSettings} className="mt-4 space-y-3">
            <Textarea value={header} onChange={(event) => setFormField("header", event.target.value)} placeholder="Header teks laporan grup" />
            <Input
              value={spreadsheetUrl}
              onChange={(event) => setFormField("spreadsheetUrl", event.target.value)}
              placeholder="Link Google Sheets / spreadsheet"
            />
            <Button className="w-full">Simpan Setting</Button>
          </form>
        </section>
      ) : null}

      {settingsSection === "location" ? (
        <section className={settingsPanelClass}>
          <h2 className="font-semibold">Location & Services</h2>
          <form onSubmit={saveSettings} className="mt-4 space-y-3">
            <div className={settingsSubPanelClass}>
              <p className="text-sm font-semibold">Lokasi Grup</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Lokasi ini dipakai bersama untuk Weather, Azan, dan Peringatan Darurat.
              </p>
              <div className="mt-3 grid gap-2">
                <Input
                  value={locationName}
                  onChange={(event) => {
                    setFormField("locationName", event.target.value);
                    if (!location) setFormField("location", event.target.value);
                    if (!azanLocation) setFormField("azanLocation", event.target.value);
                    if (!emergencyLocation) setFormField("emergencyLocation", event.target.value);
                  }}
                  placeholder="Nama lokasi, contoh: Bogor, Jawa Barat"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={latitude}
                    onChange={(event) => setFormField("latitude", event.target.value)}
                    inputMode="decimal"
                    placeholder="Latitude, contoh: -6.595"
                  />
                  <Input
                    value={longitude}
                    onChange={(event) => setFormField("longitude", event.target.value)}
                    inputMode="decimal"
                    placeholder="Longitude, contoh: 106.816"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    value={timezone}
                    onChange={(event) => setFormField("timezone", event.target.value)}
                    className="min-h-11 w-full rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                  >
                    <option value="Asia/Jakarta">Asia/Jakarta - WIB</option>
                    <option value="Asia/Makassar">Asia/Makassar - WITA</option>
                    <option value="Asia/Jayapura">Asia/Jayapura - WIT</option>
                  </select>
                  <Button type="button" variant="outline" onClick={() => fillBrowserLocation("azan")}>
                    <MapPin className="h-4 w-4" />
                    Share lokasi
                  </Button>
                </div>
              </div>
            </div>

            <SettingToggle
              icon={CloudSun}
              title="Weather"
              enabled={weatherEnabled}
              onEnabledChange={(value) => setFormField("weatherEnabled", value)}
            />
            <LocationInput
              value={location}
              onChange={(value) => setFormField("location", value)}
              placeholder="Lokasi cuaca, contoh: Jakarta atau -6.20,106.81"
              onUseLocation={() => fillBrowserLocation("weather")}
            />
            <SettingToggle
              icon={CalendarClock}
              title="Pengingat Azan"
              enabled={prayerEnabled}
              onEnabledChange={(value) => setFormField("prayerEnabled", value)}
            />
            {prayerEnabled ? (
              <div className={cn("space-y-3", settingsSubPanelClass)}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    ["subuh", "Subuh"],
                    ["dzuhur", "Dzuhur"],
                    ["ashar", "Ashar"],
                    ["maghrib", "Maghrib"],
                    ["isya", "Isya"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex min-h-11 items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={enabledPrayers[key as keyof typeof enabledPrayers]}
                        onChange={(event) =>
                          setEnabledPrayer(
                            key as keyof EnabledPrayers,
                            event.target.checked,
                          )
                        }
                        className="h-4 w-4 accent-emerald-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Reminder
                    <select
                      value={prayerOffset}
                      onChange={(event) => setFormField("prayerOffset", event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                    >
                      <option value="0">Tepat waktu</option>
                      <option value="5">5 menit sebelum</option>
                      <option value="10">10 menit sebelum</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Metode jadwal
                    <select
                      value={prayerMethod}
                      onChange={(event) => setFormField("prayerMethod", event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-[11px] border border-[var(--line)] bg-[var(--surface)] px-3 text-sm"
                    >
                      <option value="20">Kemenag Indonesia</option>
                      <option value="3">Muslim World League</option>
                      <option value="5">Egyptian General Authority</option>
                    </select>
                  </label>
                </div>
                <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Status Pengingat Azan</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {prayerStatusLoading
                          ? "Memeriksa jadwal..."
                          : prayerStatus?.configured
                            ? "Konfigurasi aktif dan jadwal berhasil dimuat."
                            : prayerStatus?.message ?? "Simpan konfigurasi untuk mengecek jadwal."}
                      </p>
                    </div>
                    <Badge tone={prayerStatus?.configured ? "income" : "warning"}>
                      {prayerStatus?.configured ? "Aktif" : "Belum lengkap"}
                    </Badge>
                  </div>
                  {prayerStatus?.configured ? (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-[var(--muted)]">Location</p>
                        <p className="font-medium">{prayerStatus.location || locationName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Timezone</p>
                        <p className="font-medium">{prayerStatus.timezoneLabel ?? "WIB"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">Next Prayer</p>
                        <p className="font-mono font-semibold tabular-nums">
                          {prayerStatus.nextPrayer
                            ? `${prayerStatus.nextPrayer.key} ${prayerStatus.nextPrayer.time}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => loadPrayerStatus()} disabled={prayerStatusLoading}>
                      {prayerStatusLoading ? "Mengecek..." : "Cek Jadwal"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={sendPrayerTest} disabled={testSending}>
                      {testSending ? "Mengirim..." : "Kirim Test Reminder"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
            <SettingToggle
              icon={Siren}
              title="Peringatan darurat"
              enabled={emergencyEnabled}
              onEnabledChange={(value) => setFormField("emergencyEnabled", value)}
            />
            <LocationInput
              value={emergencyLocation}
              onChange={(value) => setFormField("emergencyLocation", value)}
              placeholder="Lokasi pantauan darurat/gempa"
              onUseLocation={() => fillBrowserLocation("emergency")}
            />
            <Button className="w-full">Simpan Layanan</Button>
          </form>
        </section>
      ) : null}

      {settingsSection === "bot" ? (
        <section className={settingsPanelClass}>
          <h2 className="font-semibold">Bot</h2>
          <form onSubmit={saveSettings} className="mt-4 space-y-3">
            <SettingToggle
              icon={Bot}
              title="Typo correction"
              enabled={typoEnabled}
              onEnabledChange={(value) => setFormField("typoEnabled", value)}
            />
            <Button className="w-full">Simpan Setting</Button>
          </form>
        </section>
      ) : null}

      {settingsSection === "security" ? (
        <section className={settingsPanelClass}>
          <h2 className="font-semibold">Change PIN</h2>
          <form onSubmit={changePin} className="mt-4 space-y-3">
            <Input value={newPin} onChange={(event) => setNewPin(event.target.value)} inputMode="numeric" type="password" placeholder="PIN baru" />
            <Button className="w-full" variant="secondary">Update PIN</Button>
          </form>
        </section>
      ) : null}
        </div>
      </div>
    </div>
  );
}
