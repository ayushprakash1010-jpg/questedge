import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 skeleton — uses the global .shimmer animation defined in globals.css.
// Prefer this over a spinner for content placeholders (CLAUDE.md §7).
const skeletonVariants = cva("shimmer", {
  variants: {
    variant: {
      line: "h-3.5 rounded-md",
      circle: "rounded-full",
      block: "rounded-xl",
    },
  },
  defaultVariants: { variant: "line" },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      aria-busy="true"
      aria-live="polite"
      className={cn(skeletonVariants({ variant }), className)}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton, skeletonVariants };
