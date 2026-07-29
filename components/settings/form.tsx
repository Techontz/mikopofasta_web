"use client";

import * as React from "react";
import { ChevronDown, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Settings form controls.
 *
 * Presentation only. These never validate — they render the state a form
 * library or server action already decided, so the rules stay where they were
 * written. `error` is a string the caller supplies; nothing here derives it.
 */

let fieldSeq = 0;
function useFieldId(provided?: string) {
  const [generated] = React.useState(() => `st-field-${++fieldSeq}`);
  return provided ?? generated;
}

// ---------------------------------------------------------------------------
// Field wrapper
// ---------------------------------------------------------------------------

export function Field({
  label,
  help,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: string;
  help?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="st-field-label">
          {label}
          {required && (
            <span className="ml-0.5 text-[#d92d20]" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {/* The explanation stays visible; the error replaces nothing, it adds. */}
      {help && !error && <p className="st-field-help">{help}</p>}
      {error && (
        <p className="st-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Two-column grid for a row of fields; collapses to one column on small screens. */
export function FieldGrid({
  columns = 2,
  children,
  className,
}: {
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-5 gap-y-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; prefix?: string; suffix?: string }
>(function TextInput({ className, invalid, prefix, suffix, ...props }, ref) {
  const control = (
    <input ref={ref} aria-invalid={invalid || undefined} className={cn("st-control", className)} {...props} />
  );
  if (!prefix && !suffix) return control;

  // A unit reads better attached to the field than repeated in the label.
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--st-ink-faint)]">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn("st-control", prefix && "pl-11", suffix && "pr-11", className)}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--st-ink-faint)]">
          {suffix}
        </span>
      )}
    </div>
  );
});

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function TextArea({ className, invalid, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn("st-control", className)}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn("st-control appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--st-ink-faint)]"
        aria-hidden
      />
    </div>
  );
});

/** Native date input — the platform picker is keyboard- and locale-correct. */
export const DateInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function DateInput({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="date"
      aria-invalid={invalid || undefined}
      className={cn("st-control", className)}
      {...props}
    />
  );
});

export function Toggle({
  checked,
  onCheckedChange,
  label,
  help,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  label: string;
  help?: string;
  disabled?: boolean;
  id?: string;
}) {
  const fieldId = useFieldId(id);
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <label htmlFor={fieldId} className="st-field-label cursor-pointer">
          {label}
        </label>
        {help && <p className="st-field-help mt-1">{help}</p>}
      </div>
      <button
        id={fieldId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-[var(--st-accent)]" : "bg-[#d5dae1]",
          disabled && "cursor-not-allowed opacity-55"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-150",
            checked ? "translate-x-[19px]" : "translate-x-[3px]"
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: ButtonTone;
    icon?: LucideIcon;
    loading?: boolean;
  }
>(function Button({ tone = "secondary", icon: Icon, loading, children, className, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn("st-btn", `st-btn-${tone}`, className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className="size-4" strokeWidth={1.9} aria-hidden />
      )}
      {children}
    </button>
  );
});

/** Square icon-only button. `label` is required — it becomes the accessible name. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; icon: LucideIcon; label: string }
>(function IconButton({ tone = "ghost", icon: Icon, label, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn("st-btn st-btn-icon", `st-btn-${tone}`, className)}
      {...props}
    >
      <Icon className="size-4" strokeWidth={1.9} aria-hidden />
    </button>
  );
});

/** Right-aligned button row — the standard footer of a settings card. */
export function ActionButtons({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "between";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "justify-end",
        align === "between" && "justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form shell
// ---------------------------------------------------------------------------

/**
 * Wraps a form's fields and its action row. The `action` prop is passed
 * straight through to the underlying <form>, so whatever server action the
 * screen already used keeps running unchanged.
 */
export function SettingsForm({
  children,
  footer,
  className,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & { footer?: React.ReactNode }) {
  return (
    <form className={cn("space-y-5", className)} {...props}>
      {children}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4" style={{ borderColor: "var(--st-line)" }}>
          {footer}
        </div>
      )}
    </form>
  );
}
