import * as React from "react";
import { cn } from "@/app/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-[var(--card)] shadow-[var(--soft-shadow)]",
        className,
      )}
      {...props}
    />
  );
}
