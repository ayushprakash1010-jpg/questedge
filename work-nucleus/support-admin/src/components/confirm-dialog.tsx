import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  consequences?: string[];
  reason?: string;
  onReasonChange?: (reason: string) => void;
  requireReason?: boolean;
  variant?: "danger" | "warning" | "info";
  confirmLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles = {
  danger: {
    icon: AlertTriangle,
    iconClass: "text-red-500",
    btnClass: "bg-red-600 hover:bg-red-700",
    borderClass: "border-l-4 border-red-300 bg-red-50",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    btnClass: "bg-amber-600 hover:bg-amber-700",
    borderClass: "border-l-4 border-amber-300 bg-amber-50",
  },
  info: {
    icon: Info,
    iconClass: "text-indigo-500",
    btnClass: "bg-indigo-600 hover:bg-indigo-700",
    borderClass: "border-l-4 border-indigo-300 bg-indigo-50",
  },
};

/**
 * Reusable ConfirmDialog component.
 * Used for all destructive or significant admin actions.
 * All interactive elements have unique IDs for accessibility and testing.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  consequences,
  reason,
  onReasonChange,
  requireReason = false,
  variant = "warning",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  submitting = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const style = variantStyles[variant];
  const Icon = style.icon;
  const isDisabled = submitting || (requireReason && (reason?.trim().length ?? 0) < 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="w-full max-w-md rounded-2xl bg-card border shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconClass}`} aria-hidden="true" />
          <div>
            <h2 id="confirm-dialog-title" className="font-semibold text-base">{title}</h2>
            <p id="confirm-dialog-desc" className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>

        {/* Consequences */}
        {consequences && consequences.length > 0 && (
          <ul className={`rounded-lg px-4 py-3 text-xs space-y-1 ${style.borderClass}`}>
            {consequences.map((c, i) => (
              <li key={i} className="text-foreground/80">• {c}</li>
            ))}
          </ul>
        )}

        {/* Reason field */}
        {requireReason && onReasonChange !== undefined && (
          <div>
            <label htmlFor="confirm-reason" className="block text-sm font-medium mb-1">
              Reason <span className="text-red-500" aria-hidden="true">*</span>
              <span className="sr-only">(required, minimum 10 characters)</span>
            </label>
            <textarea
              id="confirm-reason"
              rows={3}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Describe the reason for this action (min. 10 characters)…"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              aria-required="true"
              aria-describedby={reason && reason.trim().length < 10 ? "reason-error" : undefined}
            />
            {reason !== undefined && reason.length > 0 && reason.trim().length < 10 && (
              <p id="reason-error" className="text-xs text-red-500 mt-1" role="alert">
                Minimum 10 characters required ({reason.trim().length}/10)
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 rounded-lg bg-red-50 border border-red-200 px-3 py-2" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-1">
          <button
            id="confirm-dialog-cancel"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            id="confirm-dialog-submit"
            onClick={onConfirm}
            disabled={isDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40 transition-colors ${style.btnClass}`}
          >
            {submitting ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
