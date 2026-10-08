import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "income" | "expense" | "warning" | "muted";
  children: ReactNode;
}) {
  const tones = {
    neutral:
      "border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)]",
    income:
      "border-[color-mix(in_srgb,var(--income)_24%,transparent)] bg-[var(--primary-soft)] text-[var(--income)]",
    expense:
      "border-rose-400/20 bg-rose-500/10 text-[var(--expense)]",
    warning:
      "border-amber-400/25 bg-amber-500/10 text-[var(--warning)]",
    muted:
      "border-[var(--line)] bg-transparent text-[var(--muted)]",
  };

  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-[10px] border px-2.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
