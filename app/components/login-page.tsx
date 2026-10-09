"use client";

import type { FormEvent, InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  AUTH_REDIRECT_KEY,
  DASHBOARD_SESSION_KEY,
} from "@/app/lib/constants";
import { supabase } from "@/app/lib/supabase";
import { cn } from "@/app/lib/utils";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const ownerEmails = new Set(["dits144@gmail.com"]);
const publicAppUrl = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.dashboardits.tech"
).replace(/\/$/, "");

function getEmailConfirmationRedirect() {
  return `${publicAppUrl}/login?email_confirmed=1`;
}

export function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [confirmationStatus, setConfirmationStatus] = useState<
    { tone: "success" | "error"; message: string } | null
  >(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const confirmationRequested =
      url.searchParams.get("email_confirmed") === "1" ||
      Boolean(code) ||
      window.location.hash.includes("type=signup") ||
      window.location.hash.includes("access_token=");
    const errorDescription =
      url.searchParams.get("error_description") ||
      new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
        "error_description",
      );

    if (!confirmationRequested) return;

    let active = true;
    async function confirmSession() {
      if (errorDescription) {
        setConfirmationStatus({
          tone: "error",
          message: decodeURIComponent(errorDescription.replaceAll("+", " ")),
        });
        return;
      }
      if (code) {
        const exchange = await supabase.auth.exchangeCodeForSession(code);
        if (exchange.error && active) {
          setConfirmationStatus({ tone: "error", message: exchange.error.message });
          return;
        }
      }

      const session = await supabase.auth.getSession();
      if (!active) return;
      const confirmedEmail = session.data.session?.user.email ?? "";
      if (confirmedEmail) {
        setEmail(confirmedEmail);
        setVerificationEmail("");
      }
      setMode("login");
      setConfirmationStatus({
        tone: "success",
        message: confirmedEmail
          ? `Email ${confirmedEmail} sudah dikonfirmasi. Akun aktif dan siap digunakan.`
          : "Email berhasil dikonfirmasi. Akun aktif dan sekarang dapat digunakan untuk login.",
      });
      window.history.replaceState(null, "", "/login?email_confirmed=1");
    }

    void confirmSession();
    return () => {
      active = false;
    };
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
      userGroupId ||
      firstGroup?.group_id ||
      "";

    if (platformRole === "owner") {
      window.localStorage.setItem(
        DASHBOARD_SESSION_KEY,
        JSON.stringify({
          ...previousSession,
          groupId: targetGroup || undefined,
          groupName:
            firstGroup?.group_name ?? previousSession.groupName ?? "Grup WhatsApp",
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
            firstGroup?.group_name ?? previousSession.groupName ?? "Grup WhatsApp",
          role: platformRole,
          userName: userName || previousSession.userName,
          userEmail: email.trim().toLowerCase(),
          connectedAt: new Date().toISOString(),
        }),
      );
      router.push("/dashboard");
      return;
    }

    toast.message("Login berhasil. Hubungkan grup untuk mulai memakai dashboard.");
    router.push("/dashboard");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register" && password !== confirmPassword) {
      toast.error("Konfirmasi password tidak sama.");
      return;
    }
    setLoading(true);
    const auth =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getEmailConfirmationRedirect(),
              data: {
                full_name: fullName.trim() || undefined,
                name: fullName.trim() || undefined,
              },
            },
          });

    if (auth.error) {
      setLoading(false);
      toast.error(
        auth.error.message.toLowerCase().includes("email not confirmed")
          ? "Email belum dikonfirmasi. Buka email verifikasi atau kirim ulang link."
          : auth.error.message,
      );
      return;
    }

    if (mode === "register") {
      setLoading(false);
      if (auth.data.session) {
        setConfirmationStatus({
          tone: "success",
          message: "Akun berhasil dibuat dan sudah aktif. Silakan masuk ke dashboard.",
        });
        setMode("login");
        return;
      }
      setVerificationEmail(email.trim());
      toast.success("Periksa email kamu.");
      setMode("login");
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

  async function resendVerification() {
    const targetEmail = (verificationEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Masukkan email yang akan diverifikasi.");
      return;
    }
    setResendingVerification(true);
    const result = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: { emailRedirectTo: getEmailConfirmationRedirect() },
    });
    setResendingVerification(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    setVerificationEmail(targetEmail);
    toast.success("Email verifikasi baru dikirim dengan link dashboard produksi.");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)]">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--soft-shadow)] lg:grid-cols-[1fr_440px]">
        <aside className="relative hidden min-h-full overflow-hidden border-r border-[var(--line)] bg-[#07111d] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="relative flex w-fit items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-emerald-300/25 bg-emerald-300/10">
              <Image src="/botuang-mark.svg" alt="" width={32} height={32} className="h-8 w-8" />
            </span>
            <span className="text-base font-semibold">
              Bot<span className="text-emerald-300">Uang</span>
            </span>
          </Link>

          <div className="relative max-w-xl">
            <p className="text-xs font-semibold uppercase text-emerald-200/70">
              WhatsApp Finance Workspace
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight">
              Kelola kas grup tanpa dashboard yang berat.
            </h1>
            <div className="mt-7 grid gap-3 text-sm text-white/72">
              {["Catat pemasukan dan pengeluaran", "Kelola todo, reminder, dan command", "Akses owner dan admin dalam satu akun"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[#07111d]">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <p className="relative text-xs text-white/45">
            Ringan, cepat, dan terhubung ke data grup BotUang.
          </p>
        </aside>

        <div className="flex items-center justify-center p-5 sm:p-8">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
              <Image src="/botuang-mark.svg" alt="" width={40} height={40} className="h-10 w-10" />
              <span className="font-semibold">
                Bot<span className="text-emerald-500">Uang</span>
              </span>
            </Link>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: mode === "register" ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: mode === "register" ? -16 : 16 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              >
                <h1 className="text-2xl font-semibold">
                  {mode === "register" ? "Buat akun admin" : "Selamat datang kembali"}
                </h1>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {mode === "register"
                    ? "Daftar dengan nama, email, dan password untuk mulai mengelola grup."
                    : "Masuk untuk lanjut mengelola dashboard BotUang."}
                </p>
              </motion.div>
            </AnimatePresence>

            <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <TabsList className="mt-6 grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
            </Tabs>

            {verificationEmail ? (
              <div className="mt-5 rounded-[14px] border border-emerald-300/20 bg-emerald-400/8 p-4 text-sm">
                <p className="font-semibold text-emerald-500">Periksa email kamu</p>
                <p className="mt-1 text-[var(--muted)]">
                  Kami mengirim link verifikasi ke {verificationEmail}.
                </p>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resendingVerification}
                  className="mt-3 min-h-11 font-semibold text-emerald-500 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {resendingVerification ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
                </button>
              </div>
            ) : null}

            {confirmationStatus ? (
              <div
                className={cn(
                  "mt-5 rounded-[14px] border p-4 text-sm",
                  confirmationStatus.tone === "success"
                    ? "border-emerald-300/20 bg-emerald-400/8"
                    : "border-rose-400/20 bg-rose-500/8",
                )}
                role="status"
              >
                <p
                  className={cn(
                    "font-semibold",
                    confirmationStatus.tone === "success"
                      ? "text-emerald-500"
                      : "text-rose-500",
                  )}
                >
                  {confirmationStatus.tone === "success"
                    ? "Akun sudah aktif"
                    : "Konfirmasi email gagal"}
                </p>
                <p className="mt-1 leading-6 text-[var(--muted)]">
                  {confirmationStatus.message}
                </p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-5 grid gap-4" autoComplete="off">
              <AnimatePresence initial={false}>
                {mode === "register" ? (
                  <motion.div
                    key="name"
                    initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.18 }}
                    className="overflow-hidden"
                  >
                    <AuthField
                      label="Nama"
                      icon={<User className="h-4 w-4" />}
                      value={fullName}
                      onChange={setFullName}
                      placeholder="Nama admin"
                      required
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AuthField
                label="Email"
                icon={<Mail className="h-4 w-4" />}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="dits144@gmail.com"
                autoComplete="email"
                required
              />

              <AuthField
                label="Password"
                icon={<KeyRound className="h-4 w-4" />}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="Minimal 6 karakter"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                minLength={6}
                required
                action={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-[10px] p-2 text-[var(--muted)] transition hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              {mode === "register" ? (
                <div className="grid gap-1 text-xs text-[var(--muted)]">
                  <PasswordRule passed={password.length >= 6}>Minimal 6 karakter</PasswordRule>
                </div>
              ) : null}

              {mode === "register" ? (
                <AuthField
                  label="Konfirmasi Password"
                  icon={<KeyRound className="h-4 w-4" />}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              ) : null}

              <Button className="mt-1 w-full" disabled={loading}>
                {loading ? "Memproses..." : mode === "register" ? "Buat Akun" : "Masuk Dashboard"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-[var(--muted)]">
              {mode === "register" ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "register" ? "login" : "register")}
                className="font-semibold text-emerald-500 underline-offset-4 hover:underline"
              >
                {mode === "register" ? "Login" : "Register"}
              </button>
            </p>

            <footer className="mt-6 flex items-center justify-between text-xs text-[var(--muted)]">
              <Link href="/connect" className="transition hover:text-[var(--foreground)]">
                Connect Group
              </Link>
              <Link href="/" className="transition hover:text-[var(--foreground)]">
                Back Home
              </Link>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthField({
  label,
  icon,
  value,
  onChange,
  action,
  ...props
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  action?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        {icon}
        {label}
      </span>
      <span className="flex min-h-11 items-center rounded-[11px] border border-[var(--line)] bg-[var(--background)] px-3 shadow-sm transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400">
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
        {action}
      </span>
    </label>
  );
}

function PasswordRule({
  passed,
  children,
}: {
  passed: boolean;
  children: ReactNode;
}) {
  return (
    <p className={cn("flex items-center gap-2", passed ? "text-emerald-500" : "")}>
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          passed
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-[var(--line)] text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {children}
    </p>
  );
}
