import * as React from "react";
import { cn } from "@/app/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "min-h-11 w-full rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[var(--muted)] focus-visible:border-[var(--income)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--panel)] disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full resize-y rounded-[12px] border border-[var(--line)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--foreground)] transition-[border-color,box-shadow,background] duration-200 placeholder:text-[var(--muted)] focus-visible:border-[var(--income)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--panel)] disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
