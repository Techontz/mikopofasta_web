"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionButtons, Button } from "@/components/settings/form";
import { cn } from "@/lib/utils";

/**
 * The dialog every Settings and Capital form opens in.
 *
 * Two things it exists to guarantee, both easy to forget one dialog at a time:
 *
 *   - `.st-scope` on the panel. Dialogs portal to document.body, outside the
 *     subtree that carries the configuration design tokens, so without this
 *     the contents fall back to the app's defaults.
 *   - `noValidate` on the form. Native constraint validation runs before
 *     react-hook-form is handed control, so a `type="email"` or `required`
 *     attribute would block submission with a browser bubble and leave the
 *     inline messages unreachable. The Zod rules are unchanged — this only
 *     decides which validator gets to speak.
 */
export function SettingsDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitLabel,
  pendingLabel = "Saving…",
  pending = false,
  formId,
  size = "md",
  footer,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /**
   * The element that opens the dialog. Omit it when the dialog is opened from
   * somewhere else — a row action that sets state, say. A trigger must be a
   * real `<button>`: Base UI gives it button semantics and warns if it is
   * handed anything else, so a placeholder element is not an option.
   */
  trigger?: React.ReactElement;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Omit to render a plain panel with no form wrapper. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  formId?: string;
  size?: "md" | "lg";
  /** Replaces the default Cancel/Submit pair when a dialog needs its own. */
  footer?: React.ReactNode;
}) {
  const body = (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      <div className="space-y-5">{children}</div>

      {footer ?? (
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} tone="primary" loading={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </ActionButtons>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent
        className={cn("st-scope max-h-[85vh] overflow-y-auto", size === "lg" && "sm:max-w-2xl")}
      >
        {onSubmit ? (
          <form id={formId} noValidate onSubmit={onSubmit} className="space-y-5">
            {body}
          </form>
        ) : (
          body
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The confirmation every destructive action asks for.
 *
 * One component rather than a hand-rolled dialog per screen, because the thing
 * that must never vary is the shape of the question: what is about to happen,
 * to what, and whether it can be undone. The consequence line is required —
 * a confirm that only says "Are you sure?" moves the decision without
 * informing it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  consequence,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  tone = "danger",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  trigger: React.ReactElement;
  title: string;
  consequence: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={title}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" tone={tone} onClick={onConfirm} loading={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </ActionButtons>
      }
    >
      <p className="text-[13px] leading-relaxed text-[var(--st-ink-soft)]">{consequence}</p>
    </SettingsDialog>
  );
}
