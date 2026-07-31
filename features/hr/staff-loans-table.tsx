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
 * Read-only, because the endpoint is. `StaffController` exposes `loans()` as a
 * GET and nothing else — there is no create, approve or repay route for a staff
 * loan — so this page does not draw buttons that would have nothing to call.
 */
const STATUS_TONE: Record<string, StatusTone> = {
  active: "active",
  repaid: "inactive",
  written_off: "danger",
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
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan amount" />,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "disbursedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Disbursed" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {row.original.disbursedAt}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.status] ?? "neutral"} className="capitalize">
          {row.original.status.replace(/_/g, " ")}
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
          {row.original.journalEntryId}
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
          <td className="px-4 py-3">
            <Money strong>{formatMoney(shown.reduce((s, l) => s + l.amount, 0))}</Money>
          </td>
          <td colSpan={3} />
        </>
      )}
    />
  );
}
