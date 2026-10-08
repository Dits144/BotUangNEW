import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
  "inline-flex whitespace-nowrap cursor-pointer rounded-full items-center justify-center gap-2.5 font-medium transition-[background-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[var(--income)] to-[var(--primary)] text-[#f2f8f4] hover:brightness-110 shadow-sm",
        secondary:
          "bg-[var(--card)] text-[var(--foreground)] border border-[var(--line)] hover:bg-[var(--panel)]",
        outline:
          "bg-[var(--card)] text-[var(--foreground)] shadow-[inset_0_0_0_1.5px_var(--primary)] hover:bg-[var(--primary-soft)]",
        ghost:
          "bg-transparent text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]",
        danger:
          "bg-gradient-to-b from-[#d64a4a] to-[#a32727] text-white hover:brightness-110",
      },
      size: {
        default: "h-[50px] px-6 text-[15px]",
        sm: "h-[40px] px-4 text-xs font-semibold",
        icon: "h-[44px] w-[44px] p-0 rounded-full",
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
