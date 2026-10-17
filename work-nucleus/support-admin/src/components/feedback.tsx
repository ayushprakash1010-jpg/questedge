import { cn } from "@/lib/utils";
import { Search, AlertCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
}

/** Empty state — shows when a list returns 0 results */
export function EmptyState({
  title = "No results",
  description = "Nothing matches your current filters.",
  icon: Icon = Search,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16 text-center px-6", className)}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Error state with optional retry button */
export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center py-16 text-center px-6", className)}
      role="alert"
    >
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-red-700">Error</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Inline success toast / banner */
export function SuccessBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
      role="status"
      aria-live="polite"
    >
      <span>✓ {message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 text-green-600 hover:text-green-800 text-xs underline"
          aria-label="Dismiss success message"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
