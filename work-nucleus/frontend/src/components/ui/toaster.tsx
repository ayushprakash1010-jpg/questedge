"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

// v2 toast surface — see design-system-v2/preview/components.html (Toasts).
// Mount once at the app root. Callers invoke toast() / toast.success() /
// toast.error() / toast.warning() etc. directly from `sonner`.
//
// Re-export `toast` so consumers can import everything from one entry point:
//   import { toast } from "@/components/ui/toaster";
export { toast } from "sonner";

const baseToast =
  "rounded-xl border border-slate-200/60 bg-white p-3.5 shadow-[var(--shadow-dropdown)] text-sm text-slate-700";

const baseTitle = "text-sm font-semibold text-slate-900";
const baseDescription = "text-xs text-slate-500";
const baseAction = "rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700";
const baseCancel = "rounded-md text-xs font-medium text-slate-500 hover:text-slate-900";

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      offset={20}
      gap={8}
      closeButton
      toastOptions={{
        classNames: {
          toast: baseToast,
          title: baseTitle,
          description: baseDescription,
          actionButton: baseAction,
          cancelButton: baseCancel,
          // Severity strips on the left edge — match the v2 toast-icon tile.
          success: "[&>[data-icon]]:text-emerald-600",
          error: "[&>[data-icon]]:text-red-600",
          warning: "[&>[data-icon]]:text-amber-600",
          info: "[&>[data-icon]]:text-blue-600",
        },
      }}
      {...props}
    />
  );
}
