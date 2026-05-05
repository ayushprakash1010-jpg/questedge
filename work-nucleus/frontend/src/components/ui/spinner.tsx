import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 spinner — full-page / modal / inline-button loading states.
// For content placeholders prefer a Skeleton. See design-system-v2/CLAUDE.md §7.
const spinnerVariants = cva(
  "animate-spin rounded-full border-current border-t-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border-2",
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-4",
        lg: "h-12 w-12 border-4",
      },
      tone: {
        primary: "text-indigo-600",
        muted: "text-slate-400",
        white: "text-white",
      },
    },
    defaultVariants: {
      size: "md",
      tone: "primary",
    },
  }
);

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role">,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, tone, label = "Loading", ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size, tone }), className)}
      {...props}
    />
  )
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
