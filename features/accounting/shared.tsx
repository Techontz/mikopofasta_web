"use client";

import { StatusBadge, type StatusTone } from "@/components/settings";
import type { CashDepositStatus, PeriodStatus, ReserveStatus } from "@/types/accounting";

/**
 * The status vocabulary shared by the accounting screens.
 *
 * Components only. The formatters live in `format.ts`, which is deliberately
 * NOT a client module so the Server Components can call them too — see the note
 * at the top of that file.
 */

const RESERVE_TONE: Record<ReserveStatus, StatusTone> = {
  pending: "warning",
  approved: "active",
  rejected: "danger",
};

const RESERVE_LABEL: Record<ReserveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function ReserveStatusBadge({ status }: { status: ReserveStatus }) {
  return <StatusBadge tone={RESERVE_TONE[status]}>{RESERVE_LABEL[status]}</StatusBadge>;
}

const DEPOSIT_TONE: Record<CashDepositStatus, StatusTone> = {
  pending: "warning",
  matched: "info",
  confirmed: "active",
};

const DEPOSIT_LABEL: Record<CashDepositStatus, string> = {
  pending: "Awaiting verification",
  matched: "Matched",
  confirmed: "Confirmed",
};

export function DepositStatusBadge({ status }: { status: CashDepositStatus }) {
  return <StatusBadge tone={DEPOSIT_TONE[status]}>{DEPOSIT_LABEL[status]}</StatusBadge>;
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return (
    <StatusBadge tone={status === "closed" ? "active" : "warning"}>
      {status === "closed" ? "Closed" : "Open"}
    </StatusBadge>
  );
}

/**
 * The journal entry a row produced, or a plain statement that it produced none.
 *
 * Shown wherever an action may or may not post. A pending reserve request and a
 * write-off with nothing left to write off both legitimately have no entry, and
 * a blank cell would read as missing data rather than as an answer.
 */
export function LedgerReference({
  journalEntryId,
  absentLabel = "Not posted",
}: {
  journalEntryId: string | null;
  absentLabel?: string;
}) {
  if (journalEntryId === null) {
    return <span className="text-[var(--st-ink-faint)]">{absentLabel}</span>;
  }

  return <span className="font-tabular text-[var(--st-ink-soft)]">JE #{journalEntryId}</span>;
}
