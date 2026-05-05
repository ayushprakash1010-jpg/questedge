import * as React from "react";
import { cn } from "@/lib/utils";

// v2 input — see design-system-v2/CLAUDE.md §4 (Input).
// `error` toggles the red border + ring; `leftIcon` renders a 16px icon at
// left-3 with the input padded to clear it (replaces the relative-wrapper
// boilerplate sprinkled across pages).
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
}

const baseClass =
  "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50";

const errorClass =
  "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20";

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, ...props }, ref) => {
    if (leftIcon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-slate-400 [&>svg]:h-4 [&>svg]:w-4">
            {leftIcon}
          </span>
          <input
            type={type}
            className={cn(baseClass, "pl-9", error && errorClass, className)}
            ref={ref}
            aria-invalid={error || undefined}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(baseClass, error && errorClass, className)}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
