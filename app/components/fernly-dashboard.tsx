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
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  BookOpen,
  Calendar,
  CalendarClock,
  Calculator,
  ChartNoAxesCombined,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  CloudSun,
  ClipboardCheck,
  Download,
  Flag,
  Home,
  ListTodo,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
  Square,
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
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
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
import {
  FadeUp,
  FernlyPage,
  RevealImage,
  RevealHeading,
  ShellEntrance,
  StaggerContainer,
} from "./motion/fernly-motion";
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
  { key: "reports", label: "Analytics", href: "/dashboard/#reports", icon: ChartNoAxesCombined },
  { key: "todos", label: "Tasks", href: "/dashboard/#todos", icon: ListTodo },
  { key: "reminders", label: "Kalender", href: "/dashboard/#reminders", icon: CalendarClock },
  { key: "participants", label: "Team", href: "/dashboard/#participants", icon: Users },
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

function shouldWriteLegacyBot() {
  // The browser URL is optional after a normal login. The authenticated server
  // proxy resolves BOT_API_URL and its trusted fallbacks for both reads and writes.
  return !USE_CANONICAL_SUPABASE_DATA;
}

function isUuid(value: string | number) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value),
  );
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

async function fetchGroupSettings(
  groupId: string,
  method: "GET" | "PUT" = "GET",
  body?: Record<string, unknown>,
): Promise<{ data: GroupSettings | null; error: { message: string } | null }> {
  const auth = await supabase.auth.getSession();
  const accessToken = auth.data.session?.access_token ?? "";
  if (!accessToken) {
    return { data: null, error: { message: "Session dashboard tidak valid" } };
  }

  try {
    const response = await fetch(
      `/api/settings?group_id=${encodeURIComponent(groupId)}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );
    const result = (await response.json()) as {
      ok?: boolean;
      data?: GroupSettings | null;
      message?: string;
    };
    if (!response.ok || !result.ok) {
      return {
        data: null,
        error: { message: result.message ?? "Setting grup tidak tersedia" },
      };
    }
    return { data: result.data ?? null, error: null };
  } catch {
    return { data: null, error: { message: "Setting grup tidak tersedia" } };
  }
}

export function FernlyDashboard({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState<DashboardSection>(() =>
    resolveSectionFromPath(pathname),
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
        : fetchGroupSettings(targetGroupId),
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
    if (settingResult.error) toast.error(settingResult.error.message);
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
    applyTheme(next);
  }

  function applyTheme(next: "dark" | "light") {
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
  const botStatusDisplay = getBotStatusDisplay(botStatus);
  const visibleNavItems =
    role === "owner"
      ? navItems
      : navItems.filter((item) => item.key !== "owner");

  return (
    <main className="min-h-screen bg-[var(--background)] p-2.5 text-[var(--foreground)] lg:p-3">
      <ShellEntrance className="flex min-h-[calc(100vh-20px)] gap-3 lg:min-h-[calc(100vh-24px)]">
        <aside className="sticky top-3 hidden h-[calc(100vh-24px)] w-[252px] shrink-0 overflow-y-auto rounded-[26px] bg-[var(--sidebar)] px-4 py-5 xl:block">
          <Brand
            groupId={groupId}
            groupName={groupName}
            groups={groups}
            botStatus={botStatus}
            onSelectGroup={selectGroup}
          />
          <nav className="mt-6 space-y-5">
            {navGroups.map((group) => {
              const items = group.items
                .map((key) => getNavItem(key))
                .filter((item): item is (typeof navItems)[number] => Boolean(item))
                .filter((item) => visibleNavItems.some((visible) => visible.key === item.key));
              if (!items.length) return null;
              return (
                <div key={group.label}>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {group.label}
                  </p>
                  <div className="mt-2 grid gap-1">
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
        </aside>

        <div className="min-w-0 flex-1 pb-24 xl:pb-0">
          <header className="sticky top-2 z-30 flex min-h-[68px] items-center rounded-[22px] bg-[var(--surface)]/96 px-3 backdrop-blur-xl md:top-3 md:min-h-[70px] md:rounded-[26px] md:px-4">
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
              <div className="hidden min-w-[280px] max-w-[390px] flex-1 items-center rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-3 shadow-[var(--soft-shadow)] xl:flex">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari transaksi, anggota, catatan..."
                  className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[var(--muted)]"
                  aria-label="Cari data dashboard"
                />
                <kbd className="rounded-[7px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">
                  Ctrl K
                </kbd>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toast.info(botStatusDisplay.label)}
                  className="hidden min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 text-xs font-semibold transition hover:bg-[var(--panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--income)] lg:flex"
                  aria-label={`Status bot: ${botStatusDisplay.label}`}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      botStatusDisplay.tone === "connected"
                        ? "bg-emerald-500"
                        : botStatusDisplay.tone === "unreachable" || botStatusDisplay.tone === "disconnected"
                          ? "bg-rose-500"
                          : "bg-amber-400",
                    )}
                  />
                  {botStatusDisplay.label}
                </button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Notifikasi"
                  className="hidden rounded-full md:inline-flex"
                  onClick={() => toast.info("Tidak ada notifikasi baru.")}
                >
                  <Bell className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  aria-label="Ganti tema"
                  className="rounded-full"
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
                <button
                  type="button"
                  onClick={() => navigateDashboardSection("settings")}
                  className="flex min-h-11 items-center gap-3 rounded-[14px] bg-[var(--card)] p-1.5 text-left shadow-[var(--soft-shadow)] transition hover:bg-[var(--panel)] xl:pr-3"
                  aria-label="Buka profil dan pengaturan"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5c5ac] text-xs font-bold text-[#4d3124]">
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
                </button>
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

          <AnimatePresence mode="wait">
            <FernlyPage
              key={activeSection}
              className="mt-3 min-h-[calc(100vh-108px)] w-full rounded-[22px] bg-[var(--surface)] p-3 md:min-h-[calc(100vh-98px)] md:rounded-[26px] md:p-5"
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
                  transactions={filteredTransactions}
                  todos={todos}
                  reminders={reminders}
                  participants={participants}
                  onNavigate={navigateDashboardSection}
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
                  currentUserName={currentUser.name || currentUser.email || "Dashboard"}
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
                  todos={todos}
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
                  currentUser={currentUser}
                  role={role}
                  theme={theme}
                  onThemeChange={applyTheme}
                  onCurrentUserChange={setCurrentUser}
                  onChanged={() => loadData()}
                />
              ) : null}
              {groupId && activeSection === "calculator" ? <CalculatorPage /> : null}
              {activeSection === "help" ? <HelpPage role={role} /> : null}
              {activeSection === "owner" ? <OwnerDashboardPage embedded preview={preview} /> : null}
            </FernlyPage>
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
      </ShellEntrance>

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
  const statusDisplay = getBotStatusDisplay(botStatus);
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--card)] shadow-[var(--soft-shadow)]">
          <Image src="/botuang-mark.svg" alt="" width={32} height={32} className="h-8 w-8" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-tight">
            Bot<span className="text-[var(--income)]">Uang</span>
          </p>
          <p className="truncate text-sm text-[var(--muted)]">
            {displayGroupName(groupName, groupId)}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Grup aktif
          <select
            value={groupId}
            onChange={(event) => {
              const selected = groups.find(
                (group) => group.group_id === event.target.value,
              );
              if (selected) onSelectGroup(selected);
            }}
            className="mt-2 min-h-11 w-full rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-3 text-sm font-medium text-[var(--foreground)] outline-none focus-visible:shadow-[var(--focus-ring)]"
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
            <span className="mt-1 block break-all text-[11px] font-medium normal-case tracking-normal text-[var(--muted)]">
              ID: {groupId}
            </span>
          ) : null}
        </label>
        <Link
          href="/connect"
          className="mt-2 block text-sm font-semibold text-[var(--income)] hover:text-[var(--primary-hover)]"
        >
          + Hubungkan grup
        </Link>
      </div>
      <div className="mt-5 rounded-[16px] bg-[var(--card)] p-3 shadow-[var(--soft-shadow)]">
        <p className="text-xs text-[var(--muted)]">Status Bot</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              statusDisplay.tone === "checking"
                ? "bg-amber-400"
                : statusDisplay.tone === "connected"
                  ? "bg-emerald-400"
                  : "bg-rose-400",
            )}
          />
          {statusDisplay.label}
        </p>
      </div>
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
      className={cn(
        "relative flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
        "before:absolute before:-left-4 before:top-2 before:h-7 before:w-1 before:rounded-r-md before:bg-transparent before:transition-colors",
        active
          ? "font-semibold text-[var(--foreground)] before:bg-[var(--income)]"
          : "font-medium text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
      )}
    >
      <Icon className="h-4 w-4" />
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
  transactions,
  todos,
  reminders,
  participants,
  onNavigate,
  onSaved,
}: {
  groupId: string;
  groupName: string;
  sessionToken?: string;
  botApiUrl?: string;
  loading: boolean;
  summary: { income: number; expense: number; balance: number };
  monthlyChart: ChartPoint[];
  transactions: Transaction[];
  todos: Todo[];
  reminders: Reminder[];
  participants: Participant[];
  onNavigate: (section: DashboardSection) => void;
  onSaved: () => void;
}) {
  const openTodos = todos.filter((todo) => !todo.is_done).slice(0, 5);
  const openTodoCount = todos.filter((todo) => !todo.is_done).length;
  const doneTodoCount = todos.filter((todo) => todo.is_done).length;
  const todoProgress = todos.length
    ? Math.round((doneTodoCount / todos.length) * 100)
    : 0;
  const nextReminders = reminders.slice(0, 3);
  const [trackerSeconds, setTrackerSeconds] = useState(0);
  const [trackerRunning, setTrackerRunning] = useState(false);

  useEffect(() => {
    if (!trackerRunning) return;
    const interval = window.setInterval(() => {
      setTrackerSeconds((seconds) => seconds + 1);
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [trackerRunning]);

  const trackerTime = [
    Math.floor(trackerSeconds / 3_600),
    Math.floor((trackerSeconds % 3_600) / 60),
    trackerSeconds % 60,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <RevealHeading className="text-[28px] font-semibold leading-tight tracking-normal md:text-[34px]">
            Ringkasan
          </RevealHeading>
          <FadeUp variant="compact" delay={0.08}>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ringkasan keuangan {displayGroupName(groupName, groupId)}
            </p>
          </FadeUp>
        </div>
        {groupId ? (
          <FadeUp variant="compact" delay={0.13}>
            <TransactionSheet
              groupId={groupId}
              sessionToken={sessionToken}
              botApiUrl={botApiUrl}
              onSaved={onSaved}
            />
          </FadeUp>
        ) : null}
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FadeUp className="col-span-2 sm:col-span-1" variant="card" delay={0.1}>
          <MetricCard label="Saldo Kas" value={summary.balance} icon={WalletCards} tone="neutral" primary loading={loading} onClick={() => onNavigate("transactions")} />
        </FadeUp>
        <FadeUp variant="card" delay={0.17}>
          <MetricCard label="Pemasukan" value={summary.income} icon={CircleDollarSign} tone="income" loading={loading} onClick={() => onNavigate("transactions")} />
        </FadeUp>
        <FadeUp variant="card" delay={0.24}>
          <MetricCard label="Pengeluaran" value={summary.expense} icon={WalletCards} tone="expense" loading={loading} onClick={() => onNavigate("transactions")} />
        </FadeUp>
        <FadeUp className="col-span-2 sm:col-span-1" variant="card" delay={0.31}>
          <CountMetricCard label="Transaksi" value={transactions.length} description="pada grup aktif" loading={loading} onClick={() => onNavigate("transactions")} />
        </FadeUp>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <DashboardPanel className="self-start xl:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold">Arus Kas Bulanan</h2>
              <p className="text-xs text-[var(--muted)]">Pergerakan kas masuk dan keluar grup</p>
            </div>
            <span className="hidden text-xs font-medium text-[var(--muted)] sm:inline">
              8 periode
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-64" />
          ) : monthlyChart.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={12} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B981" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="expense" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Belum ada arus kas" description="Transaksi kas yang tercatat akan tampil di sini." />
          )}
        </DashboardPanel>

        <DashboardPanel className="flex min-h-[300px] flex-col xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold">Pengingat</h2>
            <Badge tone="muted">{reminders.length} aktif</Badge>
          </div>
          {nextReminders.length ? (
            <div className="mt-5">
              <p className="text-lg font-semibold leading-snug">{nextReminders[0].remind_text}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <CalendarClock className="h-3.5 w-3.5" />
                {nextReminders[0].remind_type}: {nextReminders[0].remind_value}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--muted)]">Belum ada pengingat terjadwal.</p>
          )}
          <Button className="mt-auto w-full" variant="outline" onClick={() => onNavigate("reminders")}>
            Buka Kalender
          </Button>
        </DashboardPanel>

        <div className="grid gap-4 xl:col-span-3">
          <DashboardPanel>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <h2 className="text-base font-semibold">Proyek</h2>
              <button type="button" onClick={() => onNavigate("todos")} className="text-xs font-semibold text-[var(--income)] hover:underline">
                Buka Board
              </button>
            </div>
            <div className="mt-3 space-y-2.5">
              {openTodos.length ? openTodos.map((todo) => (
                <button key={todo.id} type="button" onClick={() => onNavigate("todos")} className="flex min-h-9 w-full items-center gap-2.5 text-left text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--income)]" />
                  <span className="min-w-0 flex-1 truncate font-medium">{parseTaskDetails(todo.todo_text).title}</span>
                </button>
              )) : (
                <p className="py-4 text-center text-xs text-[var(--muted)]">Belum ada proyek aktif</p>
              )}
            </div>
          </DashboardPanel>

          <FadeUp variant="card" delay={0.2}>
            <div className="fernly-tracker">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Time Tracker</h2>
                <Clock className="h-4 w-4 text-white/70" />
              </div>
              <p className="my-auto py-4 text-center text-[clamp(30px,3vw,40px)] font-bold tabular-nums text-white">
                {trackerTime}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button type="button" onClick={() => setTrackerRunning((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--primary)] transition hover:scale-105 active:scale-95" aria-label={trackerRunning ? "Jeda tracker" : "Mulai tracker"}>
                  {trackerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => { setTrackerRunning(false); setTrackerSeconds(0); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white transition hover:scale-105 active:scale-95" aria-label="Reset tracker">
                  <Square className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        <DashboardPanel>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-[17px] font-semibold">Anggota Grup</h2>
              <p className="text-xs text-[var(--muted)]">Anggota yang tersinkron dari grup aktif</p>
            </div>
            <button type="button" onClick={() => onNavigate("participants")} className="text-xs font-semibold text-[var(--income)] hover:underline">
              Kelola Semua
            </button>
          </div>
          {loading ? (
            <div className="mt-4 space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
          ) : participants.length ? (
            <div className="mt-3 divide-y divide-[var(--line)]">
              {participants.slice(0, 5).map((participant) => {
                const roleValue = String(participant.data?.role ?? "user").toLowerCase();
                const roleLabel = roleValue === "owner" ? "Owner" : roleValue === "admin" ? "Admin" : "User";
                const initials = participant.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                return (
                  <div key={participant.id} className="flex min-h-14 items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-xs font-bold">{initials || "U"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{participant.name}</p>
                      <p className="text-xs text-[var(--muted)]">{roleLabel}</p>
                    </div>
                    <Badge tone={roleValue === "owner" || roleValue === "admin" ? "income" : "muted"}>{roleLabel}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Belum ada anggota yang tersinkron.</p>
          )}
        </DashboardPanel>

        <DashboardPanel className="flex min-h-[240px] flex-col">
          <div>
            <h2 className="text-[17px] font-semibold">Progres Proyek</h2>
            <p className="text-xs text-[var(--muted)]">Perbandingan task selesai dan task aktif</p>
          </div>
          <div className="my-auto py-5 text-center">
            <p className="text-[clamp(36px,4vw,52px)] font-bold leading-none text-[var(--income)] tabular-nums">{todoProgress}%</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{doneTodoCount} dari {todos.length} task selesai</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--panel)]">
            <div className="h-full rounded-full bg-[var(--income)] transition-[width] duration-500" style={{ width: `${todoProgress}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-[var(--muted)]">
            <span>Selesai ({doneTodoCount})</span>
            <span>Aktif ({openTodoCount})</span>
          </div>
        </DashboardPanel>
      </section>
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
  transactions,
}: {
  loading: boolean;
  transactions: Transaction[];
}) {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const analytics = useMemo(
    () => buildFinancialAnalytics(transactions, rangeDays),
    [rangeDays, transactions],
  );
  const trendData = useMemo(() => {
    const windowSize = rangeDays === 7 ? 1 : 7;
    return analytics.daily.map((point, index, points) => {
      const start = Math.max(0, index - windowSize + 1);
      const window = points.slice(start, index + 1);
      const divisor = window.length || 1;
      return {
        ...point,
        cashflow: window.reduce((sum, day) => sum + day.income - day.expense, 0) / divisor,
        previousCashflow:
          window.reduce(
            (sum, day) => sum + day.previousIncome - day.previousExpense,
            0,
          ) / divisor,
      };
    });
  }, [analytics.daily, rangeDays]);

  function exportAnalytics() {
    const rows = [
      ["Tanggal", "Pemasukan", "Pengeluaran", "Pemasukan periode lalu", "Pengeluaran periode lalu"],
      ...analytics.daily.map((day) => [
        day.date,
        String(day.income),
        String(day.expense),
        String(day.previousIncome),
        String(day.previousExpense),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `botuang-analytics-${rangeDays}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Analytics diekspor ke CSV.");
  }

  return (
    <div className="space-y-4">
      <PageIntro
        title="Analytics"
        description="Bagaimana arus kas bergerak dan ke mana pengeluaran digunakan."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[11px] border border-[var(--line)] bg-[var(--card)] p-1">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={rangeDays === days}
                  onClick={() => setRangeDays(days)}
                  className={cn(
                    "min-h-9 rounded-[8px] px-3 text-xs font-semibold transition",
                    rangeDays === days
                      ? "bg-[#0D3A23] text-white"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]",
                  )}
                >
                  {days}D
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={exportAnalytics} disabled={!analytics.current.count}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />

      <StaggerContainer className="grid grid-cols-2 gap-3 xl:grid-cols-4" delay={0.1} stagger={0.06}>
        <AnalyticsKpi
          label="Total Pemasukan"
          value={formatRupiah(analytics.current.income)}
          current={analytics.current.income}
          previous={analytics.previous.income}
          points={analytics.daily.map((point) => point.income)}
          loading={loading}
          tone="income"
          rangeDays={rangeDays}
        />
        <AnalyticsKpi
          label="Total Pengeluaran"
          value={formatRupiah(analytics.current.expense)}
          current={analytics.current.expense}
          previous={analytics.previous.expense}
          points={analytics.daily.map((point) => point.expense)}
          loading={loading}
          tone="expense"
          rangeDays={rangeDays}
          lowerIsBetter
        />
        <AnalyticsKpi
          label="Saldo Periode"
          value={formatRupiah(analytics.current.balance)}
          current={analytics.current.balance}
          previous={analytics.previous.balance}
          points={analytics.daily.map((point) => point.income - point.expense)}
          loading={loading}
          tone="neutral"
          rangeDays={rangeDays}
        />
        <AnalyticsKpi
          label="Jumlah Transaksi"
          value={String(analytics.current.count)}
          current={analytics.current.count}
          previous={analytics.previous.count}
          points={analytics.daily.map((point) => point.count)}
          loading={loading}
          tone="neutral"
          rangeDays={rangeDays}
        />
      </StaggerContainer>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <DashboardPanel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">Arus Kas</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Saldo bersih per hari{rangeDays === 7 ? "" : ", rata-rata 7 hari"}, dibandingkan periode sebelumnya.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-emerald-500" />Periode ini</span>
              <span className="flex items-center gap-1.5"><i className="h-px w-4 border-t border-dashed border-zinc-400" />Sebelumnya</span>
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-72" />
          ) : analytics.current.count ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} minTickGap={28} />
                  <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={formatCompactRupiah} width={54} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="cashflow" stroke="#10B981" fill="#10B981" fillOpacity={0.16} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="previousCashflow" stroke="#94A3B8" strokeDasharray="5 5" fillOpacity={0} strokeWidth={1.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Belum ada arus kas" description={`Belum ada transaksi pada ${rangeDays} hari terakhir.`} />
          )}
          {!loading && analytics.current.count ? (
            <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
              {analytics.summary}
            </p>
          ) : null}
        </DashboardPanel>

        <DashboardPanel>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">Pengeluaran per kategori</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Kategori otomatis dari catatan transaksi</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-lg font-semibold tabular-nums">{formatRupiah(analytics.current.expense)}</p>
              <p className="text-[10px] text-[var(--muted)]">tercatat · {rangeDays}d</p>
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-4 h-72" />
          ) : analytics.categories.length ? (
            <>
              <div className="relative mx-auto mt-5 h-44 max-w-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categories}
                      dataKey="amount"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {analytics.categories.map((category) => (
                        <Cell key={category.name} fill={category.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <strong className="font-mono text-base tabular-nums">{analytics.categories.length}</strong>
                  <span className="text-[10px] text-[var(--muted)]">kategori</span>
                </div>
              </div>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {analytics.categories.map((category) => (
                  <div key={category.name} className="py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <strong className="shrink-0 font-mono text-xs tabular-nums">{formatRupiah(category.amount)}</strong>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${category.share}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-[12px] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]">
                Pengeluaran terbesar: <strong className="text-[var(--foreground)]">{analytics.categories[0].name}</strong>{" "}
                sebesar <strong className="font-mono text-rose-500 tabular-nums">{formatRupiah(analytics.categories[0].amount)}</strong>.
              </p>
            </>
          ) : (
            <EmptyState title="Belum ada pengeluaran" description={`Tidak ada pengeluaran pada ${rangeDays} hari terakhir.`} />
          )}
        </DashboardPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <DashboardPanel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">Aktivitas</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Intensitas transaksi selama 20 minggu terakhir.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--muted)]" aria-hidden="true">
              Sedikit
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} className="inline-block h-3 w-3 shrink-0 rounded-[4px]" data-finance-activity={level} />
              ))}
              Banyak
            </div>
          </div>
          {loading ? (
            <Skeleton className="mt-5 h-36" />
          ) : analytics.activity.some((day) => day.count > 0) ? (
            <div
              className="mt-5 grid grid-flow-col grid-rows-7 gap-1"
              role="img"
              aria-label={`Aktivitas transaksi 20 minggu: ${analytics.activityHighDays} hari dengan aktivitas tinggi.`}
            >
              {analytics.activity.map((day) => (
                <span
                  key={day.date}
                  data-finance-activity={day.level}
                  className="aspect-square min-w-0 rounded-[4px]"
                  title={`${formatDate(day.date)}: ${day.count} transaksi`}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada aktivitas" description="Aktivitas harian akan muncul setelah transaksi pertama tercatat." />
          )}
        </DashboardPanel>

        <DashboardPanel>
          <h2 className="font-semibold">Kontributor Teratas</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Pengirim transaksi pada periode terpilih.</p>
          {loading ? (
            <Skeleton className="mt-5 h-48" />
          ) : analytics.contributors.length ? (
            <ol className="mt-5 grid gap-4">
              {analytics.contributors.map((contributor) => (
                <li key={contributor.key} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <span className="row-span-2 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--panel)] text-[11px] font-bold">
                    {getUserInitials({ name: contributor.name, email: "" })}
                  </span>
                  <span className="truncate text-sm font-semibold">{contributor.name}</span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[var(--muted)]">{contributor.count}</span>
                  <span className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel)]" aria-hidden="true">
                    <span
                      className="block h-full origin-left rounded-full bg-[var(--income)]"
                      style={{ width: `${contributor.share}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Belum ada kontributor" description={`Belum ada pengirim transaksi pada ${rangeDays} hari terakhir.`} />
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}

type AnalyticsTone = "income" | "expense" | "neutral";

function AnalyticsKpi({
  label,
  value,
  current,
  previous,
  points,
  loading,
  tone,
  rangeDays,
  lowerIsBetter = false,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  points: number[];
  loading: boolean;
  tone: AnalyticsTone;
  rangeDays: number;
  lowerIsBetter?: boolean;
}) {
  const change = calculatePeriodChange(current, previous);
  const improved = change === null || (lowerIsBetter ? change <= 0 : change >= 0);
  const stroke = tone === "income" ? "#10B981" : tone === "expense" ? "#F43F5E" : "#64748B";
  const chartData = points.map((point, index) => ({ index, value: point }));

  return (
    <div className="flex min-h-[168px] flex-col overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-2 truncate font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      )}
      <div className="mt-2 flex min-h-5 items-center gap-1 text-[11px]">
        {change === null ? (
          <span className="text-[var(--muted)]">Belum ada periode pembanding</span>
        ) : (
          <>
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", improved ? "text-emerald-500" : "text-rose-500")}>
              {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(change).toFixed(1)}%
            </span>
            <span className="text-[var(--muted)]">vs previous {rangeDays}d</span>
          </>
        )}
      </div>
      {!loading ? (
        <div className="mt-auto h-10 pt-2" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="value" stroke={stroke} fill={stroke} fillOpacity={0.1} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}

type FinancialDailyPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
  count: number;
  previousIncome: number;
  previousExpense: number;
};

const expenseCategoryDefinitions = [
  {
    name: "Makan & Jajan",
    color: "#F43F5E",
    pattern: /makan|jajan|kopi|pop\s*ice|konsumsi|snack|warung|resto|restaurant|cafe|nasi|ayam|minum/i,
  },
  {
    name: "Transportasi",
    color: "#3B82F6",
    pattern: /bensin|transport|parkir|tol|ojol|gojek|grab|angkot|bus|kereta|tiket/i,
  },
  {
    name: "Tagihan & Utilitas",
    color: "#8B5CF6",
    pattern: /tagihan|listrik|internet|wifi|air|pulsa|sewa|token|iuran bulanan/i,
  },
  {
    name: "Kegiatan",
    color: "#F59E0B",
    pattern: /acara|rapat|event|kegiatan|lomba|outing|seminar|pelatihan/i,
  },
  {
    name: "Belanja",
    color: "#06B6D4",
    pattern: /belanja|beli|perlengkapan|alat|atk|kebutuhan|inventaris/i,
  },
  {
    name: "Iuran & Donasi",
    color: "#10B981",
    pattern: /iuran|donasi|sumbangan|kas/i,
  },
] as const;

function buildFinancialAnalytics(transactions: Transaction[], rangeDays: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - rangeDays + 1);
  const currentEnd = new Date(today);
  currentEnd.setDate(currentEnd.getDate() + 1);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - rangeDays);

  const liveTransactions = transactions.filter((item) => !item.deleted_at);
  const currentTransactions = liveTransactions.filter((item) => {
    const time = new Date(item.created_at).getTime();
    return time >= currentStart.getTime() && time < currentEnd.getTime();
  });
  const previousTransactions = liveTransactions.filter((item) => {
    const time = new Date(item.created_at).getTime();
    return time >= previousStart.getTime() && time < currentStart.getTime();
  });

  const total = (items: Transaction[]) => {
    const income = items
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = items
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { income, expense, balance: income - expense, count: items.length };
  };

  const sumForDate = (items: Transaction[], date: Date) => {
    const key = toLocalDateKey(date);
    return items.reduce(
      (result, item) => {
        if (toLocalDateKey(new Date(item.created_at)) !== key) return result;
        result[item.type] += Number(item.amount || 0);
        result.count += 1;
        return result;
      },
      { income: 0, expense: 0, count: 0 },
    );
  };

  const daily: FinancialDailyPoint[] = Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(currentStart);
    date.setDate(date.getDate() + index);
    const previousDate = new Date(previousStart);
    previousDate.setDate(previousDate.getDate() + index);
    const currentDay = sumForDate(currentTransactions, date);
    const previousDay = sumForDate(previousTransactions, previousDate);
    return {
      date: toLocalDateKey(date),
      label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(date),
      income: currentDay.income,
      expense: currentDay.expense,
      count: currentDay.count,
      previousIncome: previousDay.income,
      previousExpense: previousDay.expense,
    };
  });

  const current = total(currentTransactions);
  const previous = total(previousTransactions);
  const categoryMap = new Map<string, { name: string; amount: number; color: string }>();
  currentTransactions
    .filter((item) => item.type === "expense")
    .forEach((item) => {
      const definition = expenseCategoryDefinitions.find((category) => category.pattern.test(item.note ?? ""));
      const name = definition?.name ?? "Lainnya";
      const color = definition?.color ?? "#94A3B8";
      const existing = categoryMap.get(name) ?? { name, amount: 0, color };
      existing.amount += Number(item.amount || 0);
      categoryMap.set(name, existing);
    });
  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((category) => ({
      ...category,
      share: current.expense ? Math.max(2, (category.amount / current.expense) * 100) : 0,
    }));

  const activityStart = new Date(today);
  activityStart.setDate(activityStart.getDate() - 139);
  const activityCounts = new Map<string, number>();
  liveTransactions.forEach((item) => {
    const date = new Date(item.created_at);
    if (date.getTime() < activityStart.getTime() || date.getTime() >= currentEnd.getTime()) return;
    const key = toLocalDateKey(date);
    activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
  });
  const maximumActivity = Math.max(0, ...activityCounts.values());
  const activity = Array.from({ length: 140 }, (_, index) => {
    const date = new Date(activityStart);
    date.setDate(date.getDate() + index);
    const dateKey = toLocalDateKey(date);
    const count = activityCounts.get(dateKey) ?? 0;
    const level = count === 0 || maximumActivity === 0
      ? 0
      : Math.min(4, Math.max(1, Math.ceil((count / maximumActivity) * 4)));
    return { date: dateKey, count, level };
  });
  const activityHighDays = activity.filter((day) => day.level >= 3).length;

  const contributorMap = new Map<string, { key: string; name: string; count: number; amount: number }>();
  currentTransactions.forEach((item) => {
    const key = item.sender_id || item.sender_name || "dashboard";
    const name = item.sender_name?.trim() || (item.sender_id ? item.sender_id : "Dashboard BotUang");
    const contributor = contributorMap.get(key) ?? { key, name, count: 0, amount: 0 };
    contributor.count += 1;
    contributor.amount += Number(item.amount || 0);
    contributorMap.set(key, contributor);
  });
  const rankedContributors = Array.from(contributorMap.values())
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, 5);
  const topContributorCount = rankedContributors[0]?.count ?? 0;
  const contributors = rankedContributors.map((contributor) => ({
    ...contributor,
    share: topContributorCount ? (contributor.count / topContributorCount) * 100 : 0,
  }));

  const busiestCashflowDay = daily.reduce<FinancialDailyPoint | null>(
    (largest, point) =>
      !largest || point.income + point.expense > largest.income + largest.expense
        ? point
        : largest,
    null,
  );
  const busiestVolume = busiestCashflowDay
    ? busiestCashflowDay.income + busiestCashflowDay.expense
    : 0;
  const summary = current.count
    ? `Arus kas ${rangeDays} hari: saldo bersih ${formatRupiah(current.balance)}, periode sebelumnya ${formatRupiah(previous.balance)}. Hari paling aktif ${busiestCashflowDay?.label ?? "-"} dengan pergerakan ${formatRupiah(busiestVolume)}.`
    : `Belum ada aktivitas kas pada ${rangeDays} hari terakhir.`;

  return {
    current,
    previous,
    daily,
    categories,
    activity,
    activityHighDays,
    contributors,
    summary,
  };
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculatePeriodChange(current: number, previous: number) {
  if (current === 0 && previous === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatCompactRupiah(value: number) {
  const absolute = Math.abs(Number(value));
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (absolute >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
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
    <FadeUp
      as="section"
      variant="card"
      className={cn(
        "rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]",
        className,
      )}
    >
      {children}
    </FadeUp>
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
  onClick,
}: {
  label: string;
  value: number;
  description: string;
  loading: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn("min-h-[132px] min-w-0 p-3.5 sm:p-4", onClick && "fernly-card-interactive")}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Buka transaksi dari ${label}` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">
              {value}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--panel)] text-[var(--muted)]">
          <ClipboardCheck className="h-4 w-4" />
        </span>
      </div>
    </Card>
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
    <FadeUp className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]" variant="card">
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
    </FadeUp>
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

    if (shouldWriteLegacyBot()) {
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

    if (intent.action === "transaction" && shouldWriteLegacyBot() && !botOk) {
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

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
  primary,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof WalletCards;
  tone: "neutral" | "income" | "expense";
  primary?: boolean;
  loading: boolean;
  onClick?: () => void;
}) {
  const color =
    tone === "income"
      ? "text-emerald-500"
      : tone === "expense"
        ? "text-rose-500"
        : primary
          ? "text-white"
          : "text-[var(--foreground)]";
  return (
    <Card
      className={cn(
        "min-h-[150px] min-w-0 p-3.5 sm:min-h-[156px] sm:p-4",
        onClick && "fernly-card-interactive",
        primary
          ? "border-transparent bg-[var(--primary)] text-white shadow-[var(--primary-shadow)]"
          : "",
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Buka transaksi dari ${label}` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              primary ? "text-emerald-100/75" : "text-[var(--muted)]",
            )}
          >
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-36" />
          ) : (
            <p
              className={cn(
                "mt-2 font-mono font-semibold tabular-nums",
                primary ? "text-xl sm:text-2xl xl:text-3xl" : "text-xl sm:text-2xl",
                color,
              )}
            >
              {formatRupiah(value)}
            </p>
          )}
          {primary ? (
            <p className="mt-3 hidden text-xs font-medium text-emerald-100/70 sm:block">
              Total kas dari transaksi grup aktif.
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]",
            primary
              ? "bg-white/10 text-emerald-100"
              : "bg-[var(--panel)] text-[var(--muted)]",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
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

    if (shouldWriteLegacyBot() && targetGroupId) {
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

    if (shouldWriteLegacyBot() && targetGroupId) {
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
  const labels: Record<string, string> = {
    income: "Pemasukan",
    expense: "Pengeluaran",
    previousIncome: "Pemasukan periode lalu",
    previousExpense: "Pengeluaran periode lalu",
    cashflow: "Periode ini",
    previousCashflow: "Sebelumnya",
  };
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="font-mono tabular-nums">
          {labels[item.dataKey] ?? item.dataKey}:{" "}
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
    <FadeUp className="mt-5 rounded-[16px] border border-dashed border-[var(--line)] bg-[var(--panel)]/55 p-6 text-center" variant="content">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--muted)]">{description}</p>
    </FadeUp>
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
        <RevealHeading className="text-[28px] font-semibold leading-tight tracking-normal md:text-[34px]">
          {title}
        </RevealHeading>
        <FadeUp variant="compact" delay={0.08}>
          <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
        </FadeUp>
      </div>
      {action ? <FadeUp className="shrink-0" variant="compact" delay={0.13}>{action}</FadeUp> : null}
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
    <FadeUp className="min-w-0 rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]" variant="card">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-lg font-semibold tabular-nums",
          tone === "income" ? "text-emerald-500" : tone === "warning" ? "text-amber-400" : "",
        )}
      >
        {value}
      </p>
    </FadeUp>
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

    if (shouldWriteLegacyBot()) {
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

    if (shouldWriteLegacyBot() && !botOk) {
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
    if (shouldWriteLegacyBot()) {
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
    if (shouldWriteLegacyBot()) {
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
    if (shouldWriteLegacyBot()) {
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
    if (shouldWriteLegacyBot()) {
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

type TaskStage = "todo" | "in_progress" | "in_review" | "done";

function taskTagClass(tag: string) {
  const normalized = tag.toLowerCase();
  if (normalized === "backend") return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
  if (normalized === "design") return "bg-pink-500/10 text-pink-600 dark:text-pink-300";
  if (normalized === "marketing") return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (normalized === "qa") return "bg-violet-500/10 text-violet-600 dark:text-violet-300";
  return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
}

function parseTaskDetails(todo_text: string) {
  let stage: TaskStage = "todo";
  let priority = "normal";
  let tag = "Design";
  let due = "";
  let owner = "";
  let cleanText = todo_text;

  const stageMatch = cleanText.match(/\[stage:(todo|in_progress|in_review|done)\]/i);
  if (stageMatch) {
    stage = stageMatch[1].toLowerCase() as TaskStage;
    cleanText = cleanText.replace(stageMatch[0], "").trim();
  }

  const dueMatch = cleanText.match(/\[due:(\d{4}-\d{2}-\d{2})\]/i);
  if (dueMatch) {
    due = dueMatch[1];
    cleanText = cleanText.replace(dueMatch[0], "").trim();
  }

  const ownerMatch = cleanText.match(/\[owner:([^\]]+)\]/i);
  if (ownerMatch) {
    owner = ownerMatch[1].trim();
    cleanText = cleanText.replace(ownerMatch[0], "").trim();
  }

  const priMatch = cleanText.match(/\[(tinggi|rendah|normal|high|medium|low)\]/i);
  if (priMatch) {
    priority = priMatch[1].toLowerCase();
    cleanText = cleanText.replace(priMatch[0], "").trim();
  }

  const tagMatch = cleanText.match(/\[tag:([a-zA-Z0-9_\-\s]+)\]/i);
  if (tagMatch) {
    tag = tagMatch[1].trim();
    cleanText = cleanText.replace(tagMatch[0], "").trim();
  } else {
    // Generate deterministic tag based on title keywords
    const lower = cleanText.toLowerCase();
    if (lower.includes("api") || lower.includes("backend") || lower.includes("server") || lower.includes("bot")) tag = "Backend";
    else if (lower.includes("ui") || lower.includes("css") || lower.includes("tampilan") || lower.includes("halaman")) tag = "Frontend";
    else if (lower.includes("desain") || lower.includes("logo") || lower.includes("icon")) tag = "Design";
    else if (lower.includes("test") || lower.includes("bug") || lower.includes("audit")) tag = "QA";
    else if (lower.includes("iklan") || lower.includes("promo") || lower.includes("sewa")) tag = "Marketing";
  }

  return { stage, priority, tag, due, owner, title: cleanText || todo_text };
}

function buildTaskText({
  stage,
  priority,
  tag,
  due,
  owner,
  title,
}: {
  stage: TaskStage;
  priority: string;
  tag: string;
  due?: string;
  owner?: string;
  title: string;
}) {
  return [
    "[stage:" + stage + "]",
    "[" + priority + "]",
    "[tag:" + tag + "]",
    due ? "[due:" + due + "]" : "",
    owner ? "[owner:" + owner.replaceAll("]", "") + "]" : "",
    title.trim(),
  ]
    .filter(Boolean)
    .join("");
}

function formatTaskDue(due: string) {
  if (!due) return "Belum dijadwalkan";
  const target = new Date(due + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (difference < 0) return "Terlambat " + Math.abs(difference) + " hari";
  if (difference === 0) return "Hari ini";
  if (difference === 1) return "Besok";
  if (difference <= 7) return difference + " hari lagi";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(target);
}

function TodosPage({
  loading,
  groupId,
  currentUserName,
  sessionToken = "",
  botApiUrl = "",
  todos,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  currentUserName: string;
  sessionToken?: string;
  botApiUrl?: string;
  todos: Todo[];
  onChanged: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tag, setTag] = useState("Frontend");
  const [initialStage, setInitialStage] = useState<TaskStage>("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState(currentUserName);
  const [open, setOpen] = useState(false);
  const [filterSegment, setFilterSegment] = useState<"all" | "mine" | "high" | "week">("all");

  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editTag, setEditTag] = useState("Frontend");
  const [editStage, setEditStage] = useState<TaskStage>("todo");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState("");
  const [draggedTodoId, setDraggedTodoId] = useState("");
  const [dropTargetStage, setDropTargetStage] = useState<TaskStage | "">("");
  const [openTaskMenuId, setOpenTaskMenuId] = useState("");
  const [optimisticStages, setOptimisticStages] = useState<Record<string, TaskStage>>({});
  const [saving, setSaving] = useState(false);

  // Parse items
  const parsedTodos = useMemo(() => {
    return todos.map((t) => {
      const details = parseTaskDetails(t.todo_text);
      // If legacy is_done is true and no stage was encoded, default to "done"
      const finalStage: TaskStage = optimisticStages[String(t.id)] ?? (t.is_done ? "done" : details.stage);
      return {
        ...t,
        parsed: {
          ...details,
          stage: finalStage,
        },
      };
    });
  }, [optimisticStages, todos]);

  // Apply filters
  const filteredTodos = useMemo(() => {
    return parsedTodos.filter((item) => {
      if (filterSegment === "high") {
        return item.parsed.priority === "tinggi" || item.parsed.priority === "high";
      }
      if (filterSegment === "mine") {
        return item.parsed.owner.toLowerCase() === currentUserName.toLowerCase();
      }
      if (filterSegment === "week") {
        if (!item.parsed.due || item.parsed.stage === "done") return false;
        const dueTime = new Date(item.parsed.due + "T23:59:59").getTime();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueTime >= today.getTime() && dueTime <= today.getTime() + 7 * 86_400_000;
      }
      return true;
    });
  }, [currentUserName, parsedTodos, filterSegment]);

  // Stage columns
  const columns: { stage: TaskStage; label: string; dotColor: string }[] = [
    { stage: "todo", label: "To do", dotColor: "#8d9a92" },
    { stage: "in_progress", label: "In progress", dotColor: "#e8a317" },
    { stage: "in_review", label: "In review", dotColor: "#3b5bdb" },
    { stage: "done", label: "Done", dotColor: "var(--income)" },
  ];

  async function add(event: FormEvent) {
    event.preventDefault();
    const todo_text = buildTaskText({
      stage: initialStage,
      priority,
      tag,
      due: dueDate,
      owner: assignee || currentUserName,
      title: text,
    });
    let botOk = false;

    if (shouldWriteLegacyBot()) {
      const res = await fetchBotGroupData({
        resource: "todos",
        groupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "POST",
        body: {
          title: todo_text,
          done: initialStage === "done",
        },
      });
      botOk = Boolean(res.ok);
    }

    const { error } = await supabase.from("todos").insert({
      group_id: groupId,
      todo_text,
      is_done: initialStage === "done",
    });
    if (error && !botOk) toast.error(error.message);
    else {
      setText("");
      setDueDate("");
      setAssignee(currentUserName);
      setOpen(false);
      toast.success("Task baru ditambahkan.");
      onChanged();
    }
  }

  async function updateTaskStage(todo: Todo, nextStage: TaskStage) {
    const details = parseTaskDetails(todo.todo_text);
    const todoId = String(todo.id);
    const newText = buildTaskText({ ...details, stage: nextStage });
    const nextDone = nextStage === "done";

    setOptimisticStages((current) => ({ ...current, [todoId]: nextStage }));
    setOpenTaskMenuId("");

    let botOk = false;
    let botMessage = "";
    const targetGroupId = todo.group_id || groupId;

    if (shouldWriteLegacyBot() && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "todos",
        id: todo.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          title: newText,
          done: nextDone,
        },
      });
      botOk = Boolean(res.ok);
      botMessage = res.message ?? "";
    }

    const databaseResult = isUuid(todo.id)
      ? await supabase
          .from("todos")
          .update({
            todo_text: newText,
            is_done: nextDone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", todo.id)
      : { error: null };

    if (!isUuid(todo.id) && !botOk) {
      setOptimisticStages((current) => {
        const next = { ...current };
        delete next[todoId];
        return next;
      });
      toast.error(botMessage || "Task bot belum dapat dipindahkan. Periksa koneksi Bot API.");
    } else if (databaseResult.error && !botOk) {
      setOptimisticStages((current) => {
        const next = { ...current };
        delete next[todoId];
        return next;
      });
      toast.error(databaseResult.error.message);
    }
    else {
      toast.success(`Task dipindahkan ke ${nextStage.replace("_", " ")}`);
      onChanged();
      window.setTimeout(() => {
        setOptimisticStages((current) => {
          if (current[todoId] !== nextStage) return current;
          const next = { ...current };
          delete next[todoId];
          return next;
        });
      }, 5_000);
    }
  }

  function openEdit(todo: Todo) {
    const parsed = parseTaskDetails(todo.todo_text);
    setEditText(parsed.title);
    setEditPriority(parsed.priority);
    setEditTag(parsed.tag);
    setEditStage(todo.is_done ? "done" : parsed.stage);
    setEditDueDate(parsed.due);
    setEditAssignee(parsed.owner || currentUserName);
    setEditTodo(todo);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editTodo) return;
    setSaving(true);
    const todo_text = buildTaskText({
      stage: editStage,
      priority: editPriority,
      tag: editTag,
      due: editDueDate,
      owner: editAssignee || currentUserName,
      title: editText,
    });
    const nextDone = editStage === "done";

    let botOk = false;
    let botMessage = "";
    const targetGroupId = editTodo.group_id || groupId;

    if (shouldWriteLegacyBot() && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "todos",
        id: editTodo.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "PUT",
        body: {
          title: todo_text,
          done: nextDone,
        },
      });
      botOk = Boolean(res.ok);
      botMessage = res.message ?? "";
    }

    const databaseResult = isUuid(editTodo.id)
      ? await supabase
          .from("todos")
          .update({
            todo_text,
            is_done: nextDone,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editTodo.id)
      : { error: null };

    setSaving(false);
    if (!isUuid(editTodo.id) && !botOk) {
      toast.error(botMessage || "Task bot belum dapat diperbarui. Periksa koneksi Bot API.");
      return;
    }
    if (databaseResult.error && !botOk) {
      toast.error(databaseResult.error.message);
      return;
    }
    toast.success("Task diperbarui.");
    setEditTodo(null);
    onChanged();
  }

  async function remove(todo: Todo) {
    let botOk = false;
    let botMessage = "";
    const targetGroupId = todo.group_id || groupId;

    if (shouldWriteLegacyBot() && targetGroupId) {
      const res = await fetchBotGroupData({
        resource: "todos",
        id: todo.id,
        groupId: targetGroupId,
        apiUrl: botApiUrl,
        token: sessionToken,
        method: "DELETE",
      });
      botOk = Boolean(res.ok);
      botMessage = res.message ?? "";
    }

    const databaseResult = isUuid(todo.id)
      ? await supabase
          .from("todos")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", todo.id)
      : { error: null };
    if (!isUuid(todo.id) && !botOk) {
      toast.error(botMessage || "Task bot belum dapat dihapus. Periksa koneksi Bot API.");
    } else if (databaseResult.error && !botOk) toast.error(databaseResult.error.message);
    else {
      toast.success("Task dihapus.");
      onChanged();
    }
  }

  return (
    <div className="space-y-5">
      {/* Header matching Fernly */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <RevealHeading className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
            Tasks
          </RevealHeading>
          <FadeUp variant="compact" delay={0.08}>
            <p className="mt-0.5 text-xs text-[var(--muted)] sm:text-sm">
              Drag a card to another stage, or use its menu to move it.
            </p>
          </FadeUp>
        </div>

        <FadeUp variant="compact" delay={0.13}>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="h-9 gap-1.5 px-3.5 text-xs font-semibold">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>New Task</SheetTitle>
              <form onSubmit={add} className="mt-5 space-y-3">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Judul task..."
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-[var(--muted)]">Priority</label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
                  >
                    <option value="normal">Normal</option>
                    <option value="tinggi">High</option>
                    <option value="rendah">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--muted)]">Tag</label>
                  <select
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
                  >
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="Design">Design</option>
                    <option value="QA">QA</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Stage Awal</label>
                <select
                  value={initialStage}
                  onChange={(event) => setInitialStage(event.target.value as TaskStage)}
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="in_review">In review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-[var(--muted)]">
                  Due date
                  <Input
                    className="mt-1"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
                <label className="text-xs font-medium text-[var(--muted)]">
                  Penanggung jawab
                  <Input
                    className="mt-1"
                    value={assignee}
                    onChange={(event) => setAssignee(event.target.value)}
                    placeholder="Nama"
                  />
                </label>
              </div>
                <Button className="w-full" disabled={saving}>Simpan Task</Button>
              </form>
            </SheetContent>
          </Sheet>
        </FadeUp>
      </div>

      {/* Segment filters bar matching Fernly */}
      <FadeUp className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3" variant="compact" delay={0.18}>
        <div className="max-w-full overflow-x-auto rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-1">
          <div className="inline-flex min-w-max items-center gap-1 text-xs">
          {[
            { id: "all", label: "All" },
            { id: "mine", label: "My tasks" },
            { id: "high", label: "High priority" },
            { id: "week", label: "Due this week" },
          ].map((seg) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => setFilterSegment(seg.id as never)}
              className={cn(
                "rounded-[7px] px-2.5 py-1 font-medium transition",
                filterSegment === seg.id
                  ? "bg-[#0D3A23] text-white shadow-xs"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {seg.label}
            </button>
          ))}
          </div>
        </div>

        <span className="text-xs font-medium text-[var(--muted)]">
          {filteredTodos.length} tasks shown
        </span>
      </FadeUp>

      {/* 4 Kanban Columns */}
      {loading ? (
        <StaggerContainer className="fernly-kanban" delay={0.1} stagger={0.08} variant="task">
          <Skeleton className="h-64 rounded-[16px]" />
          <Skeleton className="h-64 rounded-[16px]" />
          <Skeleton className="h-64 rounded-[16px]" />
          <Skeleton className="h-64 rounded-[16px]" />
        </StaggerContainer>
      ) : (
        <StaggerContainer className="fernly-kanban" delay={0.1} stagger={0.08} variant="task">
          {columns.map((col) => {
            const colTasks = filteredTodos.filter((t) => t.parsed.stage === col.stage);
            return (
              <div
                key={col.stage}
                data-task-stage={col.stage}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (draggedTodoId) setDropTargetStage(col.stage);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const todoId = event.dataTransfer.getData("text/task-id") || draggedTodoId;
                  const todo = parsedTodos.find((item) => String(item.id) === todoId);
                  setDraggedTodoId("");
                  setDropTargetStage("");
                  if (todo && todo.parsed.stage !== col.stage) {
                    void updateTaskStage(todo, col.stage);
                  }
                }}
                className={cn(
                  "fernly-col flex flex-col border border-[var(--line)] transition-colors",
                  dropTargetStage === col.stage && draggedTodoId && "is-over",
                )}
              >
                {/* Column header */}
                <div className="fernly-col__head">
                  <span className="fernly-col__dot" style={{ backgroundColor: col.dotColor }} />
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{col.label}</h3>
                  <span className="fernly-col__count">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task card list */}
                <div className="grid max-h-[620px] flex-1 content-start gap-3 overflow-y-auto pr-0.5">
                  {colTasks.length ? (
                    colTasks.map((item) => {
                      const isHigh = item.parsed.priority === "tinggi" || item.parsed.priority === "high";
                      const isLow = item.parsed.priority === "rendah" || item.parsed.priority === "low";

                      return (
                        <motion.article
                          key={item.id}
                          layout
                          layoutId={`task-${item.id}`}
                          draggable
                          tabIndex={0}
                          aria-label={`${item.parsed.title}. ${col.label}. ${item.parsed.tag}, ${isHigh ? "high" : isLow ? "low" : "medium"} priority.`}
                          onDragStartCapture={(event) => {
                            const todoId = String(item.id);
                            setDraggedTodoId(todoId);
                            setDropTargetStage(item.parsed.stage);
                            setOpenTaskMenuId("");
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/task-id", todoId);
                          }}
                          onDragEndCapture={() => {
                            setDraggedTodoId("");
                            setDropTargetStage("");
                          }}
                          animate={
                            draggedTodoId === String(item.id)
                              ? { opacity: 0.35, scale: 0.97 }
                              : { opacity: 1, scale: 1 }
                          }
                          transition={{
                            layout: reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34 },
                            opacity: { duration: reduceMotion ? 0 : 0.16 },
                            scale: { duration: reduceMotion ? 0 : 0.16 },
                          }}
                          className={cn(
                            "fernly-task group cursor-grab select-none active:cursor-grabbing",
                            item.parsed.stage === "done" && "is-done",
                            draggedTodoId === String(item.id) && "is-dragging",
                          )}
                        >
                          {/* Tags & Priority row */}
                          <div className="flex items-center gap-2">
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", taskTagClass(item.parsed.tag))}>
                              {item.parsed.tag}
                            </span>
                            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", isHigh ? "text-rose-500" : isLow ? "text-[var(--muted)]" : "text-amber-600 dark:text-amber-400")}>
                              <Flag className="h-3.5 w-3.5" />
                              {isHigh ? "High" : isLow ? "Low" : "Medium"}
                            </span>
                            <div
                              className="relative ml-auto"
                              onBlur={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                  setOpenTaskMenuId("");
                                }
                              }}
                            >
                              <button
                                type="button"
                                className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                                aria-label={`Menu task ${item.parsed.title}`}
                                aria-haspopup="menu"
                                aria-expanded={openTaskMenuId === String(item.id)}
                                onClick={() => setOpenTaskMenuId((current) => current === String(item.id) ? "" : String(item.id))}
                              >
                                <MoreHorizontal className="h-[18px] w-[18px]" />
                              </button>
                              <AnimatePresence>
                                {openTaskMenuId === String(item.id) ? (
                                  <motion.div
                                    role="menu"
                                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                                    transition={{ duration: 0.16 }}
                                    className="absolute right-0 top-8 z-30 w-44 rounded-[12px] border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-xl"
                                  >
                                    {columns.map((target) => (
                                      <button
                                        key={target.stage}
                                        type="button"
                                        role="menuitem"
                                        disabled={target.stage === item.parsed.stage}
                                        onClick={() => void updateTaskStage(item, target.stage)}
                                        className="flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-xs font-medium transition hover:bg-[var(--panel)] disabled:opacity-40"
                                      >
                                        <i className="h-2 w-2 rounded-full" style={{ backgroundColor: target.dotColor }} />
                                        Pindah ke {target.label}
                                      </button>
                                    ))}
                                    <div className="my-1 border-t border-[var(--line)]" />
                                    <button type="button" role="menuitem" onClick={() => openEdit(item)} className="flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-xs font-medium transition hover:bg-[var(--panel)]">
                                      <Pencil className="h-3.5 w-3.5" /> Edit task
                                    </button>
                                    <button type="button" role="menuitem" onClick={() => void remove(item)} className="flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2.5 text-left text-xs font-medium text-rose-500 transition hover:bg-rose-500/10">
                                      <Trash2 className="h-3.5 w-3.5" /> Hapus task
                                    </button>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </div>
                          </div>

                          {/* Title */}
                          <p className={cn(
                            "my-2.5 text-[14.5px] font-semibold leading-[1.35] text-[var(--foreground)]",
                            item.parsed.stage === "done" ? "line-through opacity-70" : ""
                          )}>
                            {item.parsed.title}
                          </p>

                          {/* Meter bar matching Fernly */}
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel)]">
                            <motion.div
                              className="h-full origin-left rounded-full bg-[var(--income)]"
                              initial={false}
                              animate={{
                                width: item.parsed.stage === "done" ? "100%" : item.parsed.stage === "in_review" ? "75%" : item.parsed.stage === "in_progress" ? "45%" : "0%",
                              }}
                              transition={{ type: "spring", stiffness: 320, damping: 30 }}
                            />
                          </div>

                          {/* Footer with due info & actions */}
                          <div className="mt-3 flex items-center gap-2.5 text-xs text-[var(--muted)]">
                            <span className={cn(
                              "inline-flex min-w-0 items-center gap-1",
                              item.parsed.due && new Date(item.parsed.due + "T23:59:59").getTime() < Date.now() && item.parsed.stage !== "done"
                                ? "font-semibold text-rose-500"
                                : "",
                            )}>
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{item.parsed.stage === "done" ? "Selesai" : formatTaskDue(item.parsed.due)}</span>
                            </span>
                            {item.parsed.owner ? (
                              <span
                                className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[9px] font-bold text-[var(--foreground)] ring-2 ring-[var(--card)]"
                                title={item.parsed.owner}
                                aria-label={"Ditugaskan kepada " + item.parsed.owner}
                              >
                                {getUserInitials({ name: item.parsed.owner, email: "" })}
                              </span>
                            ) : null}
                          </div>
                        </motion.article>
                      );
                    })
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-[12px] border border-dashed border-[var(--line)] p-4 text-center text-xs text-[var(--muted)]">
                      Belum ada task
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </StaggerContainer>
      )}

      {/* Edit Dialog/Sheet */}
      <Sheet open={Boolean(editTodo)} onOpenChange={(isOpen) => { if (!isOpen) setEditTodo(null); }}>
        <SheetContent>
          <SheetTitle>Edit Task</SheetTitle>
          <form onSubmit={saveEdit} className="mt-5 space-y-3">
            <Input
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              placeholder="Judul task..."
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Priority</label>
                <select
                  value={editPriority}
                  onChange={(event) => setEditPriority(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="tinggi">High</option>
                  <option value="rendah">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted)]">Tag</label>
                <select
                  value={editTag}
                  onChange={(event) => setEditTag(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Design">Design</option>
                  <option value="QA">QA</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Stage</label>
              <select
                value={editStage}
                onChange={(event) => setEditStage(event.target.value as TaskStage)}
                className="mt-1 min-h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-xs"
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="in_review">In review</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-[var(--muted)]">
                Due date
                <Input
                  className="mt-1"
                  type="date"
                  value={editDueDate}
                  onChange={(event) => setEditDueDate(event.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-[var(--muted)]">
                Penanggung jawab
                <Input
                  className="mt-1"
                  value={editAssignee}
                  onChange={(event) => setEditAssignee(event.target.value)}
                  placeholder="Nama"
                />
              </label>
            </div>
            <Button className="w-full" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
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

function getReminderDateKey(reminder: Reminder) {
  const explicitDate = toDateInputValue(reminder.remind_value ?? "");
  if (explicitDate) return explicitDate;
  if (reminder.remind_type === "time") {
    return toLocalDateKey(new Date(reminder.created_at));
  }
  return "";
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

const INDONESIAN_HOLIDAYS = [
  { date: "2025-01-01", name: "Tahun Baru 2025 Masehi" },
  { date: "2025-01-27", name: "Isra Mi'raj Nabi Muhammad SAW" },
  { date: "2025-01-29", name: "Tahun Baru Imlek 2576 Kongzili" },
  { date: "2025-03-29", name: "Hari Suci Nyepi (Tahun Baru Saka 1947)" },
  { date: "2025-03-31", name: "Hari Raya Idul Fitri 1446 H" },
  { date: "2025-04-01", name: "Hari Raya Idul Fitri 1446 H (Hari ke-2)" },
  { date: "2025-04-18", name: "Wafat Yesus Kristus" },
  { date: "2025-04-20", name: "Kebangkitan Yesus Kristus (Paskah)" },
  { date: "2025-05-01", name: "Hari Buruh Internasional" },
  { date: "2025-05-12", name: "Hari Raya Waisak 2569 BE" },
  { date: "2025-05-29", name: "Kenaikan Yesus Kristus" },
  { date: "2025-06-01", name: "Hari Lahir Pancasila" },
  { date: "2025-06-06", name: "Hari Raya Idul Adha 1446 H" },
  { date: "2025-06-27", name: "1 Muharam 1447 H (Tahun Baru Islam)" },
  { date: "2025-08-17", name: "Hari Kemerdekaan RI ke-80" },
  { date: "2025-09-05", name: "Maulid Nabi Muhammad SAW" },
  { date: "2025-12-25", name: "Hari Raya Natal" },
  { date: "2026-01-01", name: "Tahun Baru 2026 Masehi" },
  { date: "2026-01-16", name: "Isra Mikraj Nabi Muhammad SAW" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili" },
  { date: "2026-03-19", name: "Hari Suci Nyepi (Tahun Baru Saka 1948)" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447 H" },
  { date: "2026-03-22", name: "Hari Raya Idul Fitri 1447 H (Hari ke-2)" },
  { date: "2026-04-03", name: "Wafat Yesus Kristus" },
  { date: "2026-04-05", name: "Kebangkitan Yesus Kristus (Paskah)" },
  { date: "2026-05-01", name: "Hari Buruh Internasional" },
  { date: "2026-05-14", name: "Kenaikan Yesus Kristus" },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447 H" },
  { date: "2026-05-31", name: "Hari Raya Waisak 2570 BE" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-06-16", name: "1 Muharam 1448 H (Tahun Baru Islam)" },
  { date: "2026-08-17", name: "Hari Kemerdekaan RI ke-81" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW" },
  { date: "2026-12-25", name: "Hari Raya Natal" },
  { date: "2027-01-01", name: "Tahun Baru 2027 Masehi" },
  { date: "2027-01-05", name: "Isra Mikraj Nabi Muhammad SAW 1448 H" },
  { date: "2027-02-06", name: "Tahun Baru Imlek 2578 Kongzili" },
  { date: "2027-03-08", name: "Hari Suci Nyepi (Tahun Baru Saka 1949)" },
  { date: "2027-03-10", name: "Hari Raya Idul Fitri 1448 H" },
  { date: "2027-03-11", name: "Hari Raya Idul Fitri 1448 H (Hari ke-2)" },
  { date: "2027-03-26", name: "Wafat Yesus Kristus" },
  { date: "2027-03-28", name: "Kebangkitan Yesus Kristus (Paskah)" },
  { date: "2027-05-01", name: "Hari Buruh Internasional" },
  { date: "2027-05-06", name: "Kenaikan Yesus Kristus" },
  { date: "2027-05-17", name: "Hari Raya Idul Adha 1448 H" },
  { date: "2027-05-20", name: "Hari Raya Waisak 2571 BE" },
  { date: "2027-06-01", name: "Hari Lahir Pancasila" },
  { date: "2027-06-06", name: "1 Muharam 1449 H (Tahun Baru Islam)" },
  { date: "2027-08-15", name: "Maulid Nabi Muhammad SAW" },
  { date: "2027-08-17", name: "Hari Proklamasi Kemerdekaan" },
  { date: "2027-12-25", name: "Kelahiran Yesus Kristus" },
  { date: "2027-12-26", name: "Isra Mikraj Nabi Muhammad SAW 1449 H" },
];

function RemindersPage({
  loading,
  groupId,
  sessionToken,
  botApiUrl,
  reminders,
  todos = [],
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken: string;
  botApiUrl: string;
  reminders: Reminder[];
  todos?: Todo[];
  onChanged: () => void;
}) {
  const [type, setType] = useState<ReminderScheduleType>("time");
  const [value, setValue] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reminders" | "holidays" | "tasks">("reminders");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toLocalDateKey(new Date()));
  const [weekStartsOn, setWeekStartsOn] = useState<"sunday" | "monday">("sunday");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWeekStartsOn(
        window.localStorage.getItem("botuang.week-start") === "monday"
          ? "monday"
          : "sunday",
      );
    });
    const handleWeekStart = (event: Event) => {
      const value = (event as CustomEvent<"sunday" | "monday">).detail;
      setWeekStartsOn(value === "monday" ? "monday" : "sunday");
    };
    window.addEventListener("botuang:week-start", handleWeekStart);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("botuang:week-start", handleWeekStart);
    };
  }, []);

  const currentYear = selectedMonth.getFullYear();
  const currentMonthIdx = selectedMonth.getMonth();

  const daysInMonth = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
    const firstWeekday = new Date(currentYear, currentMonthIdx, 1).getDay();
    const firstDayIndex =
      weekStartsOn === "monday" ? (firstWeekday + 6) % 7 : firstWeekday;
    return { totalDays, firstDayIndex };
  }, [currentYear, currentMonthIdx, weekStartsOn]);

  const monthHolidays = useMemo(() => {
    const monthStr = String(currentMonthIdx + 1).padStart(2, "0");
    const prefix = `${currentYear}-${monthStr}`;
    return INDONESIAN_HOLIDAYS.filter((h) => h.date.startsWith(prefix));
  }, [currentYear, currentMonthIdx]);

  const dueTasks = useMemo(
    () =>
      todos
        .map((todo) => ({ todo, details: parseTaskDetails(todo.todo_text) }))
        .filter((item) => !item.todo.is_done && Boolean(item.details.due))
        .sort((a, b) => a.details.due.localeCompare(b.details.due)),
    [todos],
  );
  const selectedAgenda = useMemo(
    () => ({
      holiday: INDONESIAN_HOLIDAYS.find((holiday) => holiday.date === selectedDateKey),
      isSunday: new Date(`${selectedDateKey}T12:00:00`).getDay() === 0,
      reminders: reminders.filter((reminder) => getReminderDateKey(reminder) === selectedDateKey),
      tasks: dueTasks.filter((item) => item.details.due === selectedDateKey),
    }),
    [dueTasks, reminders, selectedDateKey],
  );

  async function add(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      if (shouldWriteLegacyBot()) {
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

    if (shouldWriteLegacyBot() && targetGroupId) {
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

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const prevMonth = () => {
    setSelectedMonth(new Date(currentYear, currentMonthIdx - 1, 1));
  };
  const nextMonth = () => {
    setSelectedMonth(new Date(currentYear, currentMonthIdx + 1, 1));
  };

  return (
    <div className="space-y-5">
      <PageIntro
        title="Kalender"
        description="Kelola jadwal pengingat, pantau hari libur nasional, dan tenggat tugas grup"
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Kalender Grid */}
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[var(--soft-shadow)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              {monthNames[currentMonthIdx]} {currentYear}
            </h3>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Bulan sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setSelectedMonth(new Date())}>
                Bulan Ini
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Bulan berikutnya">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--muted)]">
            {(weekStartsOn === "monday"
              ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
              : ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
            ).map((label) => (
              <span key={label} className={label === "Min" ? "text-rose-500" : undefined}>
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: daysInMonth.firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 rounded-[12px] bg-transparent sm:h-24" />
            ))}
            {Array.from({ length: daysInMonth.totalDays }).map((_, i) => {
              const day = i + 1;
              const dayStr = String(day).padStart(2, "0");
              const monthStr = String(currentMonthIdx + 1).padStart(2, "0");
              const fullDateStr = `${currentYear}-${monthStr}-${dayStr}`;
              
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentMonthIdx &&
                new Date().getFullYear() === currentYear;

              const holiday = INDONESIAN_HOLIDAYS.find((h) => h.date === fullDateStr);
              const dayReminders = reminders.filter((reminder) => getReminderDateKey(reminder) === fullDateStr);
              const dayTasks = dueTasks.filter((item) => item.details.due === fullDateStr);
              const isSunday = new Date(currentYear, currentMonthIdx, day).getDay() === 0;
              const isSelected = selectedDateKey === fullDateStr;

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  onClick={() => setSelectedDateKey(fullDateStr)}
                  aria-label={`${day} ${monthNames[currentMonthIdx]} ${currentYear}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "group relative flex h-20 min-w-0 flex-col rounded-[12px] border p-1.5 text-left transition hover:border-[var(--line-strong)] sm:h-24",
                    isToday ? "border-emerald-500 bg-emerald-500/5 font-semibold" : "border-[var(--line)] bg-[var(--surface)]",
                    holiday || isSunday ? "bg-rose-500/[0.03]" : "",
                    isSelected ? "ring-2 ring-[var(--income)] ring-offset-1 ring-offset-[var(--card)]" : "",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-emerald-600 text-white" : holiday || isSunday ? "text-rose-500 font-bold" : "text-[var(--foreground)]"
                      )}
                    >
                      {day}
                    </span>
                    <span className="flex items-center gap-1">
                      {holiday || isSunday ? <i className="h-1.5 w-1.5 rounded-full bg-rose-500" title={holiday?.name ?? "Tanggal merah"} /> : null}
                      {dayReminders.length ? <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Reminder" /> : null}
                      {dayTasks.length ? <i className="h-1.5 w-1.5 rounded-full bg-blue-500" title="Due task" /> : null}
                    </span>
                  </div>
                  <span className="mt-1 grid min-w-0 gap-0.5 overflow-hidden">
                    {holiday ? <span className="truncate rounded-[4px] bg-rose-500/10 px-1 text-[9px] font-semibold leading-4 text-rose-500">{holiday.name}</span> : null}
                    {!holiday && isSunday ? <span className="truncate rounded-[4px] bg-rose-500/10 px-1 text-[9px] font-semibold leading-4 text-rose-500">Tanggal merah</span> : null}
                    {dayReminders.slice(0, 1).map((reminder) => <span key={reminder.id} className="truncate rounded-[4px] bg-emerald-500/10 px-1 text-[9px] font-semibold leading-4 text-emerald-600">{reminder.remind_text}</span>)}
                    {dayTasks.slice(0, 1).map(({ todo, details }) => <span key={todo.id} className="truncate rounded-[4px] bg-blue-500/10 px-1 text-[9px] font-semibold leading-4 text-blue-500">{details.title}</span>)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Hari Libur / Tanggal Merah
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Pengingat Grup
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Due Task
            </span>
          </div>
        </div>

        {/* 3 Sidebar Tabs: Reminder, Hari Libur, Task */}
        <div className="flex flex-col rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--soft-shadow)]">
          <div className="mb-4 border-b border-[var(--line)] pb-4">
            <p className="text-[11px] font-semibold uppercase text-[var(--muted)]">Agenda Terpilih</p>
            <h2 className="mt-1 text-lg font-semibold">
              {new Date(`${selectedDateKey}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </h2>
            <div className="mt-3 grid gap-2">
              {selectedAgenda.holiday ? <p className="rounded-[9px] bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-500">{selectedAgenda.holiday.name}</p> : null}
              {!selectedAgenda.holiday && selectedAgenda.isSunday ? <p className="rounded-[9px] bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-500">Hari Minggu / Tanggal Merah</p> : null}
              {selectedAgenda.reminders.map((reminder) => <p key={reminder.id} className="rounded-[9px] bg-emerald-500/10 px-2.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{reminder.remind_text}</p>)}
              {selectedAgenda.tasks.map(({ todo, details }) => <p key={todo.id} className="rounded-[9px] bg-blue-500/10 px-2.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-300">{details.title}</p>)}
              {!selectedAgenda.holiday && !selectedAgenda.isSunday && !selectedAgenda.reminders.length && !selectedAgenda.tasks.length ? <p className="text-sm text-[var(--muted)]">Tidak ada agenda pada tanggal ini.</p> : null}
            </div>
          </div>
          {/* Segmented Control */}
          <div className="grid grid-cols-3 rounded-[12px] border border-[var(--line)] bg-[var(--surface)] p-1 text-xs font-semibold mb-4">
            <button
              type="button"
              onClick={() => setActiveTab("reminders")}
              className={cn(
                "min-h-11 rounded-[9px] px-1.5 py-1 text-[10px] transition sm:px-2 sm:text-xs",
                activeTab === "reminders"
                  ? "bg-[#0D3A23] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              Reminder ({reminders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("holidays")}
              className={cn(
                "min-h-11 rounded-[9px] px-1.5 py-1 text-[10px] transition sm:px-2 sm:text-xs",
                activeTab === "holidays"
                  ? "bg-[#0D3A23] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              Hari Libur ({monthHolidays.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={cn(
                "min-h-11 rounded-[9px] px-1.5 py-1 text-[10px] transition sm:px-2 sm:text-xs",
                activeTab === "tasks"
                  ? "bg-[#0D3A23] text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              Task ({dueTasks.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] pr-1">
            {activeTab === "reminders" && (
              loading ? (
                <Skeleton className="h-32" />
              ) : reminders.length ? (
                <div className="divide-y divide-[var(--line)]">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center gap-3 rounded-[14px] p-2.5 transition hover:bg-[var(--surface)]">
                      <div className="flex flex-col items-center">
                        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--panel)] text-emerald-500">
                          <CalendarClock className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{reminder.remind_text}</p>
                          <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            {formatReminderTypeLabel(reminder.remind_type)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {formatReminderScheduleValue(reminder.remind_type, reminder.remind_value)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">Oleh {reminder.created_by ?? "Dashboard"}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                        onClick={() => remove(reminder)}
                        aria-label="Hapus reminder"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Belum ada reminder" description="Buat pengingat baru di grup WhatsApp atau via tombol di atas." />
              )
            )}

            {activeTab === "holidays" && (
              <div className="divide-y divide-[var(--line)]">
                {monthHolidays.length ? (
                  monthHolidays.map((holiday) => (
                    <div key={holiday.date} className="flex items-center gap-3 rounded-[14px] p-2.5 transition hover:bg-[var(--surface)]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-rose-500/10 text-rose-500">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{holiday.name}</p>
                        <p className="text-xs font-mono text-rose-500 tabular-nums">
                          {new Date(holiday.date).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-[var(--muted)]">
                    Tidak ada tanggal merah di bulan {monthNames[currentMonthIdx]} {currentYear}.
                  </div>
                )}
                <div className="pt-3">
                  <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Hari Libur Mendatang</p>
                  {INDONESIAN_HOLIDAYS.filter((h) => new Date(h.date + "T23:59:59") >= new Date()).slice(0, 5).map((h) => (
                    <div key={`up-${h.date}`} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="truncate pr-2">{h.name}</span>
                      <span className="shrink-0 font-mono text-[var(--muted)] tabular-nums">{h.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="divide-y divide-[var(--line)]">
                {dueTasks.length ? (
                  dueTasks.map(({ todo, details }) => {
                    return (
                      <div key={todo.id} className="flex items-start gap-2.5 rounded-[14px] p-2.5 transition hover:bg-[var(--surface)]">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-blue-500/10 text-blue-500">
                          <CheckSquare className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--foreground)]">{details.title}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={cn(
                              "rounded-[6px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              details.priority === "tinggi" || details.priority === "high" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-[var(--panel)] text-[var(--muted)]"
                            )}>
                              {details.priority}
                            </span>
                            <span className="text-[11px] font-mono text-[var(--muted)]">{formatTaskDue(details.due)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState title="Semua tugas selesai" description="Tidak ada tugas tertunda yang jatuh tempo." />
                )}
              </div>
            )}
          </div>
        </div>
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

    if (shouldWriteLegacyBot()) {
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

    if (shouldWriteLegacyBot() && targetGroupId) {
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

    if (shouldWriteLegacyBot() && targetGroupId) {
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
          <StaggerContainer className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" delay={0.1} stagger={0.07}>
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
          </StaggerContainer>
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
      ["task+ todo@20/10/2026@high@Judul", "Tambah task Kanban dengan due date"],
      ["movetask 2@review", "Pindahkan task ke stage lain"],
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

type NotificationPreferenceKey =
  | "taskAssigned"
  | "reminderDue"
  | "rentalUpdates"
  | "weeklySummary"
  | "productUpdates";

type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const defaultNotificationPreferences: NotificationPreferences = {
  taskAssigned: true,
  reminderDue: true,
  rentalUpdates: true,
  weeklySummary: false,
  productUpdates: false,
};

function getStoredProfilePreferences(email: string) {
  if (typeof window === "undefined") {
    return { timezone: "Asia/Jakarta", bio: "" };
  }
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(
        `botuang.profile.preferences.${email || "local"}`,
      ) ?? "null",
    ) as { timezone?: string; bio?: string } | null;
    return {
      timezone: saved?.timezone ?? "Asia/Jakarta",
      bio: saved?.bio ?? "",
    };
  } catch {
    return { timezone: "Asia/Jakarta", bio: "" };
  }
}

function getStoredNotificationPreferences(email: string) {
  if (typeof window === "undefined") return defaultNotificationPreferences;
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(
        `botuang.notifications.${email || "local"}`,
      ) ?? "null",
    ) as Partial<NotificationPreferences> | null;
    return { ...defaultNotificationPreferences, ...(saved ?? {}) };
  } catch {
    return defaultNotificationPreferences;
  }
}

function PreferenceSwitch({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <li className="flex min-h-[76px] items-center justify-between gap-4 border-b border-[var(--line)] py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)] sm:text-[13px]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
          checked ? "bg-[var(--primary)]" : "bg-[var(--line)]",
        )}
      >
        <motion.span
          aria-hidden="true"
          className="absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgba(19,26,21,0.25)]"
          animate={{ x: checked ? 22 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 30 }
          }
        />
      </button>
    </li>
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
  currentUser,
  role,
  theme,
  onThemeChange,
  onCurrentUserChange,
  onChanged,
}: {
  loading: boolean;
  groupId: string;
  sessionToken: string;
  botApiUrl: string;
  rental: Rental | null;
  settings: GroupSettings | null;
  days: number | null;
  currentUser: DashboardUser;
  role: "admin" | "owner";
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  onCurrentUserChange: (user: DashboardUser) => void;
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
  const [savingServices, setSavingServices] = useState(false);
  const [qrisPreviewUrl, setQrisPreviewUrl] = useState("");
  const [newPin, setNewPin] = useState("");
  const [months, setMonths] = useState("1");
  const [proof, setProof] = useState<File | null>(null);
  const [profileName, setProfileName] = useState(
    currentUser.name || currentUser.email.split("@")[0] || "",
  );
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileTimezone, setProfileTimezone] = useState("Asia/Jakarta");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [weekStartsOn, setWeekStartsOn] = useState<"sunday" | "monday">("sunday");
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(defaultNotificationPreferences);
  const [settingsSection, setSettingsSection] = useState<
    | "profile"
    | "notifications"
    | "appearance"
    | "rental"
    | "group"
    | "location"
    | "bot"
    | "security"
  >("profile");

  useEffect(() => {
    dispatchForm({ type: "reset", value: getSettingsFormState(settings) });
  }, [settings]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedProfile = getStoredProfilePreferences(currentUser.email);
      setProfileName(currentUser.name || currentUser.email.split("@")[0] || "");
      setProfileEmail(currentUser.email);
      setProfileTimezone(savedProfile.timezone);
      setProfileBio(savedProfile.bio);
      setNotificationPreferences(
        getStoredNotificationPreferences(currentUser.email),
      );
      setWeekStartsOn(
        window.localStorage.getItem("botuang.week-start") === "monday"
          ? "monday"
          : "sunday",
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentUser.email, currentUser.name]);

  function setFormField<K extends keyof SettingsFormState>(
    field: K,
    value: SettingsFormState[K],
  ) {
    dispatchForm({ type: "set", field, value });
  }

  function setEnabledPrayer(prayer: keyof EnabledPrayers, value: boolean) {
    dispatchForm({ type: "set-prayer", prayer, value });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const name = profileName.trim();
    const email = profileEmail.trim().toLowerCase();
    if (!name) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Alamat email tidak valid.");
      return;
    }

    setSavingProfile(true);
    const attributes = {
      ...(email !== currentUser.email.toLowerCase() ? { email } : {}),
      data: {
        full_name: name,
        timezone: profileTimezone,
        bio: profileBio.trim(),
      },
    };
    const { data, error } = await supabase.auth.updateUser(attributes);
    setSavingProfile(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const resolvedEmail = data.user?.email ?? currentUser.email;
    const preferenceKey = `botuang.profile.preferences.${resolvedEmail || "local"}`;
    window.localStorage.setItem(
      preferenceKey,
      JSON.stringify({ timezone: profileTimezone, bio: profileBio.trim() }),
    );

    try {
      const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
      const session = stored ? JSON.parse(stored) : {};
      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify({ ...session, userName: name, userEmail: resolvedEmail }),
      );
    } catch {
      // The authenticated Supabase profile remains the source of truth.
    }

    onCurrentUserChange({ name, email: resolvedEmail });
    toast.success(
      email !== currentUser.email.toLowerCase()
        ? "Profil disimpan. Periksa email untuk konfirmasi alamat baru."
        : "Profil berhasil disimpan.",
    );
  }

  function resetProfile() {
    setProfileName(currentUser.name || currentUser.email.split("@")[0] || "");
    setProfileEmail(currentUser.email);
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(
          `botuang.profile.preferences.${currentUser.email || "local"}`,
        ) ?? "null",
      ) as { timezone?: string; bio?: string } | null;
      setProfileTimezone(saved?.timezone ?? "Asia/Jakarta");
      setProfileBio(saved?.bio ?? "");
    } catch {
      setProfileTimezone("Asia/Jakarta");
      setProfileBio("");
    }
  }

  function updateNotificationPreference(
    key: NotificationPreferenceKey,
    value: boolean,
  ) {
    setNotificationPreferences((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(
        `botuang.notifications.${currentUser.email || "local"}`,
        JSON.stringify(next),
      );
      return next;
    });
    toast.success("Preferensi notifikasi disimpan.");
  }

  function updateWeekStart(value: "sunday" | "monday") {
    setWeekStartsOn(value);
    window.localStorage.setItem("botuang.week-start", value);
    window.dispatchEvent(
      new CustomEvent("botuang:week-start", { detail: value }),
    );
    toast.success(
      value === "monday" ? "Kalender dimulai hari Senin." : "Kalender dimulai hari Minggu.",
    );
  }

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

  async function persistSettings({
    prayerEnabledValue = prayerEnabled,
    successMessage = "Setting grup disimpan.",
  }: {
    prayerEnabledValue?: boolean;
    successMessage?: string;
  } = {}) {
    const parsedLatitude = latitude.trim() ? Number(latitude) : null;
    const parsedLongitude = longitude.trim() ? Number(longitude) : null;
    const validCoordinates =
      parsedLatitude !== null &&
      parsedLongitude !== null &&
      Number.isFinite(parsedLatitude) &&
      Number.isFinite(parsedLongitude) &&
      parsedLatitude >= -90 &&
      parsedLatitude <= 90 &&
      parsedLongitude >= -180 &&
      parsedLongitude <= 180;

    if (prayerEnabledValue && !validCoordinates) {
      toast.error("Share lokasi atau isi latitude dan longitude yang valid untuk mengaktifkan azan.");
      return false;
    }
    if (prayerEnabledValue && !Object.values(enabledPrayers).some(Boolean)) {
      toast.error("Aktifkan minimal satu waktu salat.");
      return false;
    }

    const payload = {
      header_text: header,
      location_name: locationName,
      location_latitude: parsedLatitude,
      location_longitude: parsedLongitude,
      location_timezone: timezone,
      weather_location: location,
      azan_location: validCoordinates
        ? `${parsedLatitude},${parsedLongitude}`
        : azanLocation,
      emergency_location: emergencyLocation,
      weather_enabled: weatherEnabled,
      azan_enabled: prayerEnabledValue,
      prayer_enabled: prayerEnabledValue,
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
    const result = await fetchGroupSettings(groupId, "PUT", payload);
    if (result.error) {
      toast.error(result.error.message);
      return false;
    }

    if (prayerEnabledValue !== prayerEnabled) {
      setFormField("prayerEnabled", prayerEnabledValue);
    }
    toast.success(successMessage);
    void fetchBotGroupData({
      resource: "settings",
      groupId,
      apiUrl: botApiUrl,
      token: sessionToken,
      method: "POST",
      body: payload,
    });
    onChanged();
    return true;
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSavingServices(true);
    const saved = await persistSettings();
    setSavingServices(false);
    if (saved && prayerEnabled) await loadPrayerStatus();
  }

  async function activateAndCheckPrayer() {
    setPrayerStatusLoading(true);
    const saved = await persistSettings({
      prayerEnabledValue: true,
      successMessage: "Pengingat azan diaktifkan dan lokasi disimpan.",
    });
    setPrayerStatusLoading(false);
    if (saved) await loadPrayerStatus();
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

  useEffect(() => {
    if (!groupId || settingsSection !== "location") return;
    void loadPrayerStatus();
  }, [groupId, settingsSection, settings?.updated_at]);

  async function sendPrayerTest() {
    setTestSending(true);
    try {
      const saved = await persistSettings({
        prayerEnabledValue: true,
        successMessage: "Konfigurasi azan siap diuji.",
      });
      if (!saved) return;

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
    { key: "profile", label: "Profile", icon: Users },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "appearance", label: "Appearance", icon: Sun },
    { key: "rental", label: "Rental", icon: WalletCards },
    { key: "group", label: "Group", icon: Users },
    { key: "location", label: "Location & Services", icon: MapPin },
    { key: "bot", label: "Bot", icon: Bot },
    { key: "security", label: "Security", icon: ShieldCheck },
  ] as const;
  const profileInitials = (profileName || profileEmail || "BU")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-4">
      <PageIntro
        title="Settings"
        description="Your profile, notifications and how BotUang looks."
      />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav
          className="flex gap-1 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-2 shadow-[var(--soft-shadow)] lg:sticky lg:top-24 lg:grid lg:self-start lg:overflow-visible"
          aria-label="Settings sections"
        >
          {settingSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.key}
                type="button"
                role="tab"
                aria-selected={settingsSection === section.key}
                onClick={() => setSettingsSection(section.key)}
                className={cn(
                  "relative flex min-h-12 shrink-0 items-center gap-3 rounded-[14px] px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] lg:w-full",
                  settingsSection === section.key
                    ? "text-[var(--income)]"
                    : "text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
                )}
              >
                {settingsSection === section.key ? (
                  <motion.span
                    layoutId="settings-active-tab"
                    className="absolute inset-0 rounded-[14px] bg-[var(--primary-soft)]"
                    transition={{ type: "spring", stiffness: 430, damping: 34 }}
                    aria-hidden="true"
                  />
                ) : null}
                <Icon className="relative h-4 w-4" />
                <span className="relative whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={settingsSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
      {settingsSection === "profile" ? (
        <section className={cn(settingsPanelClass, "p-5 sm:p-7")}>
          <form onSubmit={saveProfile} noValidate>
            <div className="flex items-center gap-4 sm:gap-[18px]">
              <span
                className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-xl font-semibold text-[var(--income)]"
                aria-hidden="true"
              >
                {profileInitials || "BU"}
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  This is how your identity appears across the BotUang workspace.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Full name
                <Input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  autoComplete="name"
                  maxLength={40}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Email
                <Input
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Role
                <Input value={role === "owner" ? "Owner" : "Admin"} readOnly disabled />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Time zone
                <select
                  value={profileTimezone}
                  onChange={(event) => setProfileTimezone(event.target.value)}
                  className="min-h-11 rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <option value="Asia/Jakarta">GMT+7 - Jakarta</option>
                  <option value="Asia/Makassar">GMT+8 - Makassar</option>
                  <option value="Asia/Jayapura">GMT+9 - Jayapura</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                Bio
                <Textarea
                  value={profileBio}
                  onChange={(event) => setProfileBio(event.target.value)}
                  rows={3}
                  maxLength={200}
                  placeholder="Tell your team a little about yourself."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={resetProfile}>
                Discard
              </Button>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {settingsSection === "notifications" ? (
        <section className={cn(settingsPanelClass, "p-5 sm:p-7")}>
          <h2 className="text-xl font-semibold tracking-tight">Notifications</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose which dashboard updates should reach you.
          </p>
          <ul className="mt-4">
            {[
              {
                key: "taskAssigned" as const,
                title: "Task assigned to me",
                description: "When a group task is assigned to your profile.",
              },
              {
                key: "reminderDue" as const,
                title: "Reminder schedule",
                description: "Upcoming reminders and due tasks from the active group.",
              },
              {
                key: "rentalUpdates" as const,
                title: "Rental updates",
                description: "Payment request decisions and rental expiry warnings.",
              },
              {
                key: "weeklySummary" as const,
                title: "Weekly financial summary",
                description: "A weekly digest of group income, expenses, and balance.",
              },
              {
                key: "productUpdates" as const,
                title: "Product updates",
                description: "Important changes to BotUang features and integrations.",
              },
            ].map((item) => (
              <PreferenceSwitch
                key={item.key}
                title={item.title}
                description={item.description}
                checked={notificationPreferences[item.key]}
                onCheckedChange={(value) =>
                  updateNotificationPreference(item.key, value)
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {settingsSection === "appearance" ? (
        <section className={cn(settingsPanelClass, "p-5 sm:p-7")}>
          <h2 className="text-xl font-semibold tracking-tight">Appearance</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Choose how BotUang looks on this device.
          </p>

          <fieldset className="mt-7">
            <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              Theme
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: "light" as const, label: "Light", icon: Sun },
                { value: "dark" as const, label: "Dark", icon: Moon },
              ].map((option) => {
                const Icon = option.icon;
                const selected = theme === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-3 rounded-[14px] border bg-[var(--surface)] px-4 transition-colors",
                      selected
                        ? "border-[var(--income)] shadow-[inset_0_0_0_1px_var(--income)]"
                        : "border-[var(--line)] hover:border-[var(--muted-2)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="dashboard-theme"
                      value={option.value}
                      checked={selected}
                      onChange={() => onThemeChange(option.value)}
                      className="sr-only"
                    />
                    <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--card)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{option.label}</span>
                    {selected ? <Check className="ml-auto h-4 w-4 text-[var(--income)]" /> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-7 border-t border-[var(--line)] pt-6">
            <legend className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
              Week starts on
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { value: "sunday" as const, label: "Sunday" },
                { value: "monday" as const, label: "Monday" },
              ].map((option) => (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="week-start"
                    value={option.value}
                    checked={weekStartsOn === option.value}
                    onChange={() => updateWeekStart(option.value)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface)] px-5 text-sm font-medium transition-colors peer-checked:bg-[var(--primary)] peer-checked:text-white peer-focus-visible:shadow-[var(--focus-ring)]">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      ) : null}

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
              <RevealImage delay={0.1}>
                <Image
                  src={qrisPreviewUrl}
                  alt="QRIS pembayaran owner"
                  width={512}
                  height={512}
                  unoptimized
                  className="max-h-72 w-full rounded-[14px] object-contain"
                />
              </RevealImage>
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
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-[var(--muted)]">Lokasi</p>
                          <p className="font-medium">{prayerStatus.location || locationName || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">Zona waktu</p>
                          <p className="font-medium">{prayerStatus.timezoneLabel ?? "WIB"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--muted)]">Waktu berikutnya</p>
                          <p className="font-semibold tabular-nums">
                            {prayerStatus.nextPrayer
                              ? `${prayerStatus.nextPrayer.key} ${prayerStatus.nextPrayer.time}`
                              : "-"}
                          </p>
                        </div>
                      </div>
                      {prayerStatus.schedule ? (
                        <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 sm:grid-cols-5">
                          {[
                            ["subuh", "Subuh"],
                            ["dzuhur", "Dzuhur"],
                            ["ashar", "Ashar"],
                            ["maghrib", "Maghrib"],
                            ["isya", "Isya"],
                          ].map(([key, label]) => (
                            <div key={key} className="rounded-[10px] bg-[var(--card)] px-3 py-2">
                              <p className="text-[11px] text-[var(--muted)]">{label}</p>
                              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                                {prayerStatus.schedule?.[key] || "-"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={activateAndCheckPrayer} disabled={prayerStatusLoading || savingServices}>
                      {prayerStatusLoading ? "Mengaktifkan..." : "Aktifkan & Cek Jadwal"}
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
            <Button className="w-full" disabled={savingServices}>
              {savingServices ? "Menyimpan..." : "Simpan Layanan"}
            </Button>
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
