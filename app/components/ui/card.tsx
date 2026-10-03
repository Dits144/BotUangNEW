import * as React from "react";
import { cn } from "@/app/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--soft-shadow)]",
        className,
      )}
      {...props}
    />
  );
}
