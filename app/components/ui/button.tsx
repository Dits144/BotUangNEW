import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[12px] px-4 py-2 text-sm font-semibold transition-[background,color,border-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white shadow-[var(--primary-shadow)] hover:bg-[var(--primary-hover)]",
        secondary:
          "border border-[var(--line)] bg-[var(--panel)] text-[var(--foreground)] hover:border-[var(--muted-2)] hover:bg-[var(--primary-soft)]",
        outline:
          "border border-[var(--line)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--muted-2)] hover:bg-[var(--panel)]",
        ghost:
          "bg-transparent text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
        danger:
          "bg-rose-500 text-white hover:bg-rose-400 shadow-sm shadow-rose-950/20",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChildLike?: "true";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChildLike, children, ...props }, ref) => {
    if (asChildLike === "true" && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(
          buttonVariants({ variant, size, className }),
          (children.props as { className?: string }).className,
        ),
      });
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
