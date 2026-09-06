"use client";

import { FileX2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import type { WriteOff } from "@/types/accounting";
import { LedgerReference } from "@/features/accounting/shared";
import { formatDateTime } from "@/features/accounting/format";

/** The write-off register, with what has come back against each. */
export function WriteOffTable({ writeOffs }: { writeOffs: WriteOff[] }) {
  const columns: ColumnDef<WriteOff>[] = [
    {
      accessorKey: "loanNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan" />,
      cell: ({ row }) => (
        <span className="font-tabular font-medium text-[var(--st-ink)]">{row.original.loanNumber ?? "—"}</span>
      ),
    },
    {
      accessorKey: "principalWrittenOff",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Written off" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.principalWrittenOff)}</span>
      ),
    },
    {
      id: "forgone",
      header: "Forgone",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
          <p>Interest {formatMoney(row.original.interestForgone)}</p>
          <p>Penalty {formatMoney(row.original.penaltyForgone)}</p>
        </div>
      ),
    },
    {
      accessorKey: "recoveredToDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Recovered" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.recoveredToDate)}</span>
      ),
    },
    {
      accessorKey: "outstanding",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Still chasing" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap font-semibold text-[var(--st-ink)]">
          {formatMoney(row.original.outstanding)}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <p className="max-w-[24rem] text-[14px] text-[var(--st-ink-soft)]">{row.original.reason}</p>
      ),
    },
    {
      id: "audit",
      header: "Audit",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
          <p>By {row.original.approvedByName ?? "—"}</p>
          <p>{formatDateTime(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "ledger",
      header: "Ledger",
      cell: ({ row }) => (
        <LedgerReference
          journalEntryId={row.original.journalEntryId}
          absentLabel="Nothing to post"
        />
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={writeOffs}
      searchFields={["loanNumber", "reason"]}
      searchPlaceholder="Search write-offs…"
      emptyState={{
        icon: FileX2,
        title: "No loans written off",
        description: "A loan must be in default before it can be written off.",
      }}
    />
  );
}
