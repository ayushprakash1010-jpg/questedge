import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 card — see design-system-v2/CLAUDE.md §4 (Cards).
// `variant` selects the surface treatment; `accent` renders the v2 gradient
// stripe at the top (used by KPI cards).
const cardVariants = cva(
  "rounded-xl text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-slate-200/60 bg-white shadow-sm",
        sunken: "border border-slate-200/60 bg-slate-50",
        highlighted:
          "border border-indigo-600 bg-white shadow-[0_0_0_1px_var(--color-indigo-600),var(--shadow-xl)]",
        glass:
          "border border-white/60 bg-white/80 backdrop-blur-md backdrop-saturate-150",
        dark:
          "border border-slate-700/50 bg-slate-800/50 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const accentMap = {
  indigo: "from-indigo-500 to-indigo-600",
  cyan: "from-cyan-500 to-cyan-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  red: "from-red-500 to-red-600",
  purple: "from-purple-500 to-purple-600",
} as const;

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  accent?: keyof typeof accentMap;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, accent, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), accent && "overflow-hidden", className)}
      {...props}
    >
      {accent ? (
        <div className={cn("h-0.5 bg-gradient-to-r", accentMap[accent])} />
      ) : null}
      {children}
    </div>
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 pb-3", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-base font-semibold leading-none tracking-tight text-slate-900", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-slate-500", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
