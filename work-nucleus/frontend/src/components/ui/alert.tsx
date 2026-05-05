import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 inline alert — info / success / warning / destructive.
// For floating notifications use Toast (added later). For AI recommendations
// use AiInsightCard. Color mapping mirrors the insight-card severity scheme
// in design-system-v2/CLAUDE.md §7.
const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg+div]:translate-y-[-2px] [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        info: "bg-blue-50/50 border-blue-200 text-blue-900 [&>svg]:text-blue-600",
        success: "bg-emerald-50/50 border-emerald-200 text-emerald-900 [&>svg]:text-emerald-600",
        warning: "bg-amber-50/50 border-amber-200 text-amber-900 [&>svg]:text-amber-600",
        destructive: "bg-red-50/50 border-red-200 text-red-900 [&>svg]:text-red-600",
      },
    },
    defaultVariants: { variant: "info" },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 text-sm font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };
