"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AUTH_REDIRECT_KEY,
  DASHBOARD_SESSION_KEY,
} from "@/app/lib/constants";
import { supabase } from "@/app/lib/supabase";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const ownerEmails = new Set(["dits144@gmail.com"]);

export function LoginPage() {
  const router = useRouter();
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const blobsData = useMemo(
    () => [
      { size: 340, left: 8, top: 6, delay: -8, duration: 24 },
      { size: 260, left: 68, top: 10, delay: -18, duration: 28 },
      { size: 300, left: 72, top: 62, delay: -4, duration: 22 },
      { size: 210, left: 18, top: 68, delay: -12, duration: 26 },
      { size: 180, left: 48, top: 34, delay: -20, duration: 30 },
      { size: 150, left: 86, top: 38, delay: -6, duration: 20 },
    ],
    [],
  );

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;

      blobRefs.current.forEach((blob, index) => {
        if (!blob) return;
        const speed = (index + 1) * 8;
        blob.style.marginLeft = `${x * speed}px`;
        blob.style.marginTop = `${y * speed}px`;
      });
    }

    document.addEventListener("mousemove", handleMouseMove);
    return () => document.removeEventListener("mousemove", handleMouseMove);
  }, []);

  async function routeToDashboard(
    userGroupId?: string,
    role: "admin" | "owner" = "admin",
    userName = "",
  ) {
    const redirectTo = window.sessionStorage.getItem(AUTH_REDIRECT_KEY);
    if (redirectTo?.startsWith("/connect")) {
      window.sessionStorage.removeItem(AUTH_REDIRECT_KEY);
      router.push(redirectTo);
      return;
    }

    const authSession = await supabase.auth.getSession();
    const accessToken = authSession.data.session?.access_token ?? "";
    const accessResult = accessToken
      ? await fetch("/api/access/groups", {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(
            (response) =>
              response.json() as Promise<{
                ok?: boolean;
                groups?: Array<{
                  group_id: string;
                  group_name?: string | null;
                  role?: "admin" | "owner";
                }>;
                platform_role?: "admin" | "owner";
              }>,
          )
          .catch(() => ({
            ok: false,
            groups: [],
            platform_role: undefined as "admin" | "owner" | undefined,
          }))
      : {
          ok: false,
          groups: [],
          platform_role: undefined as "admin" | "owner" | undefined,
        };

    const platformRole = accessResult.platform_role ?? role;
    const firstGroup = accessResult.groups?.[0];
    const stored = window.localStorage.getItem(DASHBOARD_SESSION_KEY);
    const previousSession = stored
      ? (JSON.parse(stored) as {
          groupId?: string;
        groupName?: string;
        apiUrl?: string;
        token?: string;
        userName?: string;
        userEmail?: string;
      })
      : {};
    const targetGroup =
      groupId ||
      userGroupId ||
      previousSession.groupId ||
      firstGroup?.group_id ||
      "";

    if (platformRole === "owner") {
      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify({
          ...previousSession,
          groupId: targetGroup || undefined,
          groupName:
            firstGroup?.group_name ?? previousSession.groupName ?? targetGroup,
          apiUrl: previousSession.apiUrl,
          role: "owner" as const,
          userName: userName || previousSession.userName,
          userEmail: email.trim().toLowerCase(),
          ownerEmail: email.trim().toLowerCase(),
          connectedAt: new Date().toISOString(),
        }),
      );
      router.push(targetGroup ? "/dashboard" : "/dashboard/owner");
      return;
    }

    if (targetGroup) {
      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify({
          ...previousSession,
          groupId: targetGroup,
          groupName:
            firstGroup?.group_name ?? previousSession.groupName ?? targetGroup,
          role: platformRole,
          userName: userName || previousSession.userName,
          userEmail: email.trim().toLowerCase(),
          connectedAt: new Date().toISOString(),
        }),
      );
      router.push("/dashboard");
      return;
    }

    const { data } = await supabase
      .from("group_rentals")
      .select("group_id, group_name")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (data?.group_id) {
      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify({
          groupId: data.group_id,
          groupName: data.group_name,
          role: "admin",
          userName,
          userEmail: email.trim().toLowerCase(),
          connectedAt: new Date().toISOString(),
        }),
      );
      router.push("/dashboard");
      return;
    }

    toast.message("Login berhasil. Hubungkan grup dari WhatsApp untuk membuka dashboard.");
    router.push("/connect");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const auth =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName.trim() || undefined,
                name: fullName.trim() || undefined,
                group_id: groupId || undefined,
              },
            },
          });

    if (auth.error) {
      setLoading(false);
      toast.error(auth.error.message);
      return;
    }

    const userGroupId = auth.data.user?.user_metadata?.group_id as string | undefined;
    const userName =
      (auth.data.user?.user_metadata?.full_name as string | undefined) ??
      (auth.data.user?.user_metadata?.name as string | undefined) ??
      fullName.trim();
    const userRole =
      auth.data.user?.user_metadata?.role === "owner" ||
      ownerEmails.has((auth.data.user?.email ?? email).trim().toLowerCase())
        ? "owner"
        : "admin";
    toast.success(mode === "login" ? "Login berhasil." : "Akun admin dibuat.");
    await routeToDashboard(userGroupId, userRole, userName);
  }

  return (
    <main className="mercury-login relative min-h-screen overflow-hidden bg-[#05090f] text-white">
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id="botuang-gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="mercury-stage" aria-hidden="true">
        {blobsData.map((blob, index) => (
          <div
            key={index}
            ref={(element) => {
              blobRefs.current[index] = element;
            }}
            className="mercury-blob"
            style={{
              width: `${blob.size}px`,
              height: `${blob.size}px`,
              left: `${blob.left}%`,
              top: `${blob.top}%`,
              animationDelay: `${blob.delay}s`,
              animationDuration: `${blob.duration}s`,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 grid min-h-screen px-5 py-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:px-8">
        <div className="hidden min-h-full flex-col justify-between lg:flex">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-emerald-300/25 bg-emerald-300/10">
              <img src="/botuang-mark.svg" alt="" className="h-8 w-8" />
            </span>
            <span className="text-base font-semibold">
              Bot<span className="text-emerald-300">Uang</span>
            </span>
          </Link>

          <div className="max-w-2xl pb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.42em] text-white/45">
              WhatsApp Finance Workspace
            </p>
            <h1 className="mt-4 max-w-xl text-6xl font-black leading-[0.92] tracking-[-0.06em]">
              Manage
              <br />
              Keuangan
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
              Akses dashboard kas grup, reminder, todo, dan command WhatsApp dari satu ruang kerja finansial.
            </p>
          </div>
        </div>

        <div className="flex min-h-full items-center justify-center lg:justify-end">
          <div className="w-full max-w-[440px] px-1 py-8 sm:px-6 lg:px-0">
            <div className="mb-10 lg:hidden">
              <Link href="/" className="flex w-fit items-center gap-3">
                <img src="/botuang-mark.svg" alt="" className="h-10 w-10" />
                <span className="font-semibold">
                  Bot<span className="text-emerald-300">Uang</span>
                </span>
              </Link>
            </div>

            <header className="mb-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.38em] text-white/45">
                {mode === "login" ? "Secure Account Access" : "Create Admin Access"}
              </span>
              <h2 className="mt-3 text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-6xl">
                {mode === "login" ? (
                  <>
                    Login
                    <br />
                    BotUang
                  </>
                ) : (
                  <>
                    Admin
                    <br />
                    Baru
                  </>
                )}
              </h2>
            </header>

            <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <TabsList className="mb-8 grid w-full grid-cols-2 border-white/10 bg-white/[0.05]">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSubmit} className="space-y-7" autoComplete="off">
              {mode === "register" ? (
                <MercuryField
                  label="Nama"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Nama admin"
                  required
                />
              ) : null}
              <MercuryField
                label="Email Admin"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="dits144@gmail.com"
                required
              />
              <MercuryField
                label="Password"
                icon={<KeyRound className="h-4 w-4" />}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="********"
                minLength={6}
                required
              />
              <MercuryField
                label="Group ID"
                icon={<ShieldCheck className="h-4 w-4" />}
                value={groupId}
                onChange={setGroupId}
                placeholder="Opsional bila sudah connect"
              />

              <div className="mercury-submit-wrap">
                <div className="mercury-drop" aria-hidden="true" />
                <button type="submit" className="mercury-submit" disabled={loading}>
                  <span>
                    {loading ? "Memproses" : mode === "login" ? "Masuk Dashboard" : "Buat Akun"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>

            <footer className="mt-8 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
              <Link href="/connect" className="transition hover:text-white">
                Connect Group
              </Link>
              <Link href="/" className="transition hover:text-white">
                Back Home
              </Link>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}

function MercuryField({
  label,
  icon,
  value,
  onChange,
  ...props
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="mercury-field group block">
      <span className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-white/45">
        {icon}
        {label}
      </span>
      <span className="relative block">
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 border-b border-white/12 bg-transparent px-0 py-3 text-lg text-white outline-none transition placeholder:text-white/22 focus:border-white/20"
        />
        <span className="mercury-input-glow" />
      </span>
    </label>
  );
}
