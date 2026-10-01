"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_SECTION_KEY } from "@/app/lib/constants";

type LegacyDashboardSection =
  | "participants"
  | "todos"
  | "reminders"
  | "commands"
  | "settings"
  | "owner";

export function LegacyDashboardRedirect({
  section,
}: {
  section: LegacyDashboardSection;
}) {
  const router = useRouter();

  useEffect(() => {
    window.sessionStorage.setItem(DASHBOARD_SECTION_KEY, section);
    router.replace("/dashboard");
  }, [router, section]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-5 text-[var(--foreground)]">
      <p className="text-sm text-[var(--muted)]">Membuka dashboard...</p>
    </main>
  );
}
