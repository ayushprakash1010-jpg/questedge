"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogField {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  type?: "text" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  validate?: (val: string) => string | null;
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (primaryValue?: string, secondaryValue?: string) => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  input?: ConfirmDialogField;
  secondInput?: ConfirmDialogField;
}

function validateField(field: ConfirmDialogField | undefined, value: string): string | null {
  if (!field) return null;
  const trimmed = value.trim();
  if (field.required && !trimmed) {
    return `${field.label} is required.`;
  }
  if (field.minLength && trimmed.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} characters.`;
  }
  if (field.type === "number" && trimmed) {
    const n = Number(trimmed);
    if (Number.isNaN(n)) return `${field.label} must be a valid number.`;
    if (field.min !== undefined && n < field.min) {
      return `${field.label} must be at least ${field.min}.`;
    }
    if (field.max !== undefined && n > field.max) {
      return `${field.label} must be at most ${field.max}.`;
    }
  }
  if (field.validate) {
    return field.validate(value);
  }
  return null;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  input,
  secondInput,
}: ConfirmDialogProps) {
  const [val1, setVal1] = React.useState(input?.defaultValue ?? "");
  const [val2, setVal2] = React.useState(secondInput?.defaultValue ?? "");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setVal1(input?.defaultValue ?? (input?.options?.[0]?.value || ""));
      setVal2(secondInput?.defaultValue ?? (secondInput?.options?.[0]?.value || ""));
      setValidationError(null);
      setTimeout(() => {
        const el = dialogRef.current?.querySelector<HTMLElement>(
          "input, select, textarea, button[data-autofocus='true'], button:not([disabled])"
        );
        el?.focus();
      }, 10);
    }
  }, [open, input?.defaultValue, input?.options, secondInput?.defaultValue, secondInput?.options]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onClose]);

  if (!open) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const err1 = validateField(input, val1);
    if (err1) {
      setValidationError(err1);
      return;
    }
    const err2 = validateField(secondInput, val2);
    if (err2) {
      setValidationError(err2);
      return;
    }
    setValidationError(null);
    await onConfirm(input ? val1 : undefined, secondInput ? val2 : undefined);
  };

  const renderField = (
    field: ConfirmDialogField,
    value: string,
    onChange: (v: string) => void,
    id: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {field.label}
      </Label>
      {field.type === "select" ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={3}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150"
      >
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {variant === "danger" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              )}
              <div>
                <h2
                  id="confirm-dialog-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close dialog"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {input && renderField(input, val1, setVal1, "confirm-dialog-input-1")}
          {secondInput && renderField(secondInput, val2, setVal2, "confirm-dialog-input-2")}

          {validationError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              {validationError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={variant === "danger" ? "destructive" : "default"}
              disabled={loading}
              data-autofocus="true"
            >
              {loading ? "Processing..." : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
