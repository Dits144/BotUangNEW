"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/app/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
}: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#131a15]/45 backdrop-blur-[2px] data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-[24px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_24px_60px_-20px_rgba(19,26,21,0.35)] focus:outline-none md:inset-y-3 md:left-auto md:right-3 md:w-[420px] md:rounded-[22px] data-[state=closed]:translate-y-4 data-[state=closed]:opacity-0 data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:duration-200 data-[state=open]:duration-300",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-zinc-300 dark:bg-white/15 md:hidden" />
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-[10px] p-2 text-[var(--muted)] transition hover:bg-[var(--panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
