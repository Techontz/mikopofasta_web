"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HandCoins } from "lucide-react";
import { Money, StatusBadge, type StatusTone } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { STAFF_LOAN_STATUSES } from "@/types/enums";
import type { StaffLoanWithName } from "@/lib/api/hr";

/**
 * HRM → Staff Loan.
 *
 * Reads `GET /api/v1/staff/loans` through the existing `getStaffLoans()` —
 * the endpoint and the client function were already there and already consumed
 * by the HR overview and the staff record; only this dedicated page was
 * missing, so nothing new was added to the API for it.
 *
 * No longer read-only. §14 of the HR document defines the flow — request, HR
 * approval, Finance disbursement, recovery from payroll — and Module 7
 * implemented it. Before that only a seeder could create a staff loan, and
 * nothing could ever end one: `closed` was assigned nowhere in the codebase, so
 * payroll deducted a flat figure against a repaid loan indefinitely.
 *
 * The recovery columns are the visible half of that fix. A loan now knows what
 * it has recovered and what it still owes, and the next instalment is derived
 * from its own terms rather than being the same figure for everybody.
 */
const STATUS_TONE: Record<string, StatusTone> = {
  requested: "warning",
  approved: "info",
  active: "active",
  closed: "inactive",
  rejected: "danger",
};

export function StaffLoansTable({ loans }: { loans: StaffLoanWithName[] }) {
  const columns: ColumnDef<StaffLoanWithName>[] = [
    {
      accessorKey: "staffName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Staff name" />,
      cell: ({ row }) => (
        <Link
          href={`/hr/staff/${row.original.staffProfileId}`}
          className="whitespace-nowrap font-medium text-[var(--st-ink)] hover:underline"
        >
          {row.original.staffName ?? row.original.staffProfileId}
        </Link>
      ),
    },
    {
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => (
        <span className="font-tabular text-[13px] text-[var(--st-ink-soft)]">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan amount" />,
      cell: ({ row }) => (
        <div>
          <Money strong>{formatMoney(row.original.amount)}</Money>
          <p className="mt-0.5 text-right text-[11.5px] text-[var(--st-ink-faint)]">
            over {row.original.recoveryPeriods} payslip
            {row.original.recoveryPeriods === 1 ? "" : "s"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "amountRecovered",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Recovered" />,
      cell: ({ row }) => (
        <Money muted={row.original.amountRecovered === 0}>
          {formatMoney(row.original.amountRecovered)}
        </Money>
      ),
    },
    {
      accessorKey: "outstanding",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
      cell: ({ row }) => (
        <div>
          <Money strong muted={row.original.outstanding === 0}>
            {row.original.outstanding === 0 ? "—" : formatMoney(row.original.outstanding)}
          </Money>
          {row.original.nextRecovery > 0 && (
            <p className="mt-0.5 text-right text-[11.5px] text-[var(--st-ink-faint)]">
              next {formatMoney(row.original.nextRecovery)}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "disbursedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disbursed" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {/* Null until Finance disburses — a requested loan has moved no money. */}
          {row.original.disbursedAt ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.status] ?? "neutral"}>
          {row.original.statusLabel}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      id: "journal",
      header: "Journal entry",
      /* Every staff loan posts to the ledger on disbursement, so the entry id
         is the audit trail back to that posting. */
      cell: ({ row }) => (
        <span className="font-tabular text-[12px] text-[var(--st-ink-faint)]">
          {row.original.journalEntryId ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={loans}
      searchFields={["staffName", "staffProfileId"]}
      searchPlaceholder="Search staff name…"
      facetedFilters={[
        {
          columnId: "status",
          title: "Status",
          options: STAFF_LOAN_STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s })),
        },
      ]}
      emptyState={{
        icon: HandCoins,
        title: "No staff loans",
        description: "No employee currently holds a loan from the business.",
      }}
      renderFooter={(shown) => (
        <>
          <td className="px-4 py-3 font-semibold text-[var(--st-ink)]">
            {shown.length} loan{shown.length === 1 ? "" : "s"}
          </td>
          <td />
          <td className="px-4 py-3">
            <Money strong>{formatMoney(shown.reduce((s, l) => s + l.amount, 0))}</Money>
          </td>
          <td className="px-4 py-3">
            <Money strong>{formatMoney(shown.reduce((s, l) => s + l.amountRecovered, 0))}</Money>
          </td>
          <td className="px-4 py-3">
            <Money strong>{formatMoney(shown.reduce((s, l) => s + l.outstanding, 0))}</Money>
          </td>
          <td colSpan={3} />
        </>
      )}
    />
  );
}
