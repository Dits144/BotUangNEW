"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/app/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({
  className,
  ...props
}: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex rounded-[13px] border border-[var(--line)] bg-[var(--panel)] p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "min-h-9 rounded-[10px] px-3 text-sm font-semibold text-[var(--muted)] transition data-[state=active]:bg-[var(--card)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-[var(--soft-shadow)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}
