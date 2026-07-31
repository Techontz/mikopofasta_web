"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { SettingsDialog } from "@/components/settings/dialog";
import { ActionButtons, Button, Field, IconButton, TextArea } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import type { FloatStatus, FloatTransfer } from "@/types/capital";
import { approveFloatTransfer, deleteFloatTransfer, rejectFloatTransfer } from "@/features/capital/actions";

/** Shared by all four float screens so a date reads the same on each. */
export const TRANSFER_AT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const STATUS_TONE: Record<FloatStatus, "warning" | "active" | "danger"> = {
  pending: "warning",
  approved: "active",
  rejected: "danger",
};

export function FloatStatusBadge({ transfer }: { transfer: FloatTransfer }) {
  return (
    <StatusBadge tone={STATUS_TONE[transfer.status]}>{transfer.statusLabel}</StatusBadge>
  );
}

export function formatTransferDate(iso: string | null): string {
  return iso ? TRANSFER_AT.format(new Date(iso)) : "—";
}

/**
 * Approve / reject, offered only while a transfer is pending.
 *
 * The API refuses if the approver raised it (§14), so a requester looking at
 * their own row sees the same disabled state the server would enforce.
 */
export function FloatDecisionActions({
  transfer,
  currentUserId,
}: {
  transfer: FloatTransfer;
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const isOwn = transfer.requestedBy === currentUserId;

  function onApprove() {
    startTransition(async () => {
      const result = await approveFloatTransfer(transfer.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function onReject() {
    startTransition(async () => {
      const result = await rejectFloatTransfer(transfer.id, reason);
      if (result.ok) {
        toast.success(result.message);
        setRejecting(false);
        setReason("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex justify-end gap-1.5">
      <IconButton
        icon={Check}
        tone="secondary"
        disabled={pending || isOwn}
        label={
          isOwn
            ? "You raised this transfer, so someone else must approve it"
            : `Approve ${formatMoney(transfer.amount)}`
        }
        onClick={onApprove}
      />

      <SettingsDialog
        open={rejecting}
        onOpenChange={setRejecting}
        trigger={
          <IconButton
            icon={X}
            tone="secondary"
            disabled={pending || isOwn}
            label={isOwn ? "You raised this transfer, so someone else must decide it" : "Reject this transfer"}
          />
        }
        title="Reject this transfer?"
        description={`${formatMoney(transfer.amount)} from ${transfer.fromBranchName ?? "—"} to ${transfer.toBranchName ?? "—"}. Nothing is posted to the ledger.`}
        footer={
          <ActionButtons>
            <Button type="button" tone="secondary" onClick={() => setRejecting(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" tone="danger" onClick={onReject} loading={pending} disabled={reason.trim().length < 3}>
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </ActionButtons>
        }
      >
        <Field label="Reason" htmlFor="reject-reason" required help="Recorded against the transfer as the only account of the decision.">
          <TextArea
            id="reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being refused?"
          />
        </Field>
      </SettingsDialog>

      <DeleteFloatDialog transfer={transfer} />
    </div>
  );
}

/** Only a pending transfer can be deleted; an applied one has moved money. */
export function DeleteFloatDialog({ transfer }: { transfer: FloatTransfer }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  if (transfer.status !== "pending") {
    return (
      <IconButton
        icon={Trash2}
        tone="secondary"
        disabled
        label="An applied transfer has moved money and cannot be deleted"
      />
    );
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteFloatTransfer(transfer.id);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} tone="secondary" label={`Delete transfer of ${formatMoney(transfer.amount)}`} />}
      title="Delete this pending transfer?"
      description={`${formatMoney(transfer.amount)} from ${transfer.fromBranchName ?? "—"} to ${transfer.toBranchName ?? "—"}. It has not moved any money, so nothing is reversed.`}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" tone="danger" onClick={onDelete} loading={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </ActionButtons>
      }
    >
      <></>
    </SettingsDialog>
  );
}
