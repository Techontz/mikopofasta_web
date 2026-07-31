"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Money, StatusBadge, type StatusTone } from "@/components/settings";
import { formatMoney } from "@/lib/domain/money";
import { advanceTotals, type AdvanceStatus, type SalaryAdvance } from "@/types/salary-advance";

/**
 * What the Salary Advance screens share.
 *
 * Four of the six show the same advance at different points in its life, so
 * their columns are built here once. A screen picks the ones it shows and adds
 * its own Actions column — which is what keeps "Principal + Interest" computed
 * the same way on all four, and a status pill the same colour throughout.
 */

export const ADVANCE_TONE: Record<AdvanceStatus, StatusTone> = {
  requested: "warning",
  approved: "info",
  active: "default",
  repaid: "active",
  rejected: "danger",
};

export const ADVANCE_STATUS_LABEL: Record<AdvanceStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  active: "Active",
  repaid: "Paid",
  rejected: "Rejected",
};

/** Pinned locale and zone so a server render and its hydration agree (#418). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatAdvanceDate(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : DATE.format(parsed);
}

/*
 * Right-aligned headers are written out per column rather than produced by a
 * factory. A factory returning an arrow that returns JSX reads as an anonymous
 * component to the linter, and naming each one keeps the column definitions
 * greppable by their header text.
 */
/** Customer, with the branch beneath it where the screen shows both. */
export const customerColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "customerName",
  header: "Customer Name",
  cell: ({ row }) => (
    <div className="min-w-0">
      <p className="font-medium text-[var(--st-ink)]">{row.original.customerName}</p>
      <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{row.original.reference}</p>
    </div>
  ),
};

export const phoneColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "phone",
  header: "Phone Number",
  cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.phone}</span>,
};

export const branchColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "branch",
  header: "Branch",
  cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
};

export const loanAmountColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "loanAmount",
  header: () => <span className="block text-right">Loan Amount</span>,
  cell: ({ row }) => <Money>{formatMoney(row.original.loanAmount)}</Money>,
};

export const interestColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "interest",
  header: () => <span className="block text-right">Interest</span>,
  cell: ({ row }) => <Money>{formatMoney(row.original.interest)}</Money>,
};

export const principalPlusInterestColumn: ColumnDef<SalaryAdvance> = {
  id: "principalPlusInterest",
  header: () => <span className="block text-right">Principal + Interest</span>,
  cell: ({ row }) => <Money strong>{formatMoney(advanceTotals(row.original).principalPlusInterest)}</Money>,
};

export const paidAmountColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "paidAmount",
  header: () => <span className="block text-right">Paid Amount</span>,
  cell: ({ row }) => (
    <Money muted={row.original.paidAmount === 0}>
      {row.original.paidAmount === 0 ? "—" : formatMoney(row.original.paidAmount)}
    </Money>
  ),
};

export const remainingColumn: ColumnDef<SalaryAdvance> = {
  id: "remaining",
  header: () => <span className="block text-right">Remaining Amount</span>,
  cell: ({ row }) => {
    const { remaining } = advanceTotals(row.original);
    return (
      <Money strong muted={remaining === 0}>
        {remaining === 0 ? "—" : formatMoney(remaining)}
      </Money>
    );
  },
};

export const statusColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "status",
  header: "Status",
  cell: ({ row }) => (
    <StatusBadge tone={ADVANCE_TONE[row.original.status]}>
      {ADVANCE_STATUS_LABEL[row.original.status]}
    </StatusBadge>
  ),
};

export const chargeFeeColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "chargeFee",
  header: () => <span className="block text-right">Charge Fee</span>,
  cell: ({ row }) => <Money>{formatMoney(row.original.chargeFee)}</Money>,
};

export const dateColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "date",
  header: "Date",
  cell: ({ row }) => (
    <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
      {formatAdvanceDate(row.original.date)}
    </span>
  ),
};

/**
 * The Alert column on Active Salary Advance.
 *
 * Overdue is the thing this column exists to surface, so a current advance says
 * so plainly rather than showing an empty cell that could equally mean "no data
 * yet". The day count is part of the pill because "overdue" alone does not tell
 * an officer whether to call today.
 */
export const alertColumn: ColumnDef<SalaryAdvance> = {
  accessorKey: "overdueDays",
  header: "Alert",
  cell: ({ row }) => {
    const days = row.original.overdueDays;
    if (days <= 0) {
      return (
        <StatusBadge tone="active" dot={false}>
          On time
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone={days >= 14 ? "danger" : "warning"}>
        {days} day{days === 1 ? "" : "s"} late
      </StatusBadge>
    );
  },
};

/** The fields every advance screen searches. */
export const ADVANCE_SEARCH_FIELDS: (keyof SalaryAdvance)[] = [
  "customerName",
  "reference",
  "phone",
  "branch",
  "categoryName",
];
