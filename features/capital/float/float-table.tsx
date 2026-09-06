"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight } from "lucide-react";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import type { FloatTransfer } from "@/types/capital";
import { DeleteFloatDialog, FloatDecisionActions, FloatStatusBadge, formatTransferDate } from "./float-shared";

/**
 * The list shared by the float screens. `variant` picks the legacy column set:
 *
 *   today    — Float: Branch | Amount | Date | Action
 *   branch   — Float Branch To Branch: S/no | From | To | Amount | Status | Date | Action
 *   approved — Approved Float: the same, without an action column
 */
export function FloatTable({
  transfers,
  variant,
  currentUserId,
  total,
}: {
  transfers: FloatTransfer[];
  variant: "today" | "branch" | "approved";
  currentUserId?: string;
  total: number;
}) {
  const sno: ColumnDef<FloatTransfer> = {
    id: "sno",
    header: "S/no.",
    cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
  };

  const amount: ColumnDef<FloatTransfer> = {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.amount)}</span>,
  };

  const date: ColumnDef<FloatTransfer> = {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="font-tabular whitespace-nowrap">{formatTransferDate(row.original.createdAt)}</span>
    ),
  };

  const status: ColumnDef<FloatTransfer> = {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <FloatStatusBadge transfer={row.original} />,
  };

  const columns: ColumnDef<FloatTransfer>[] =
    variant === "today"
      ? [
          { id: "branch", header: "Branch", cell: ({ row }) => row.original.toBranchName ?? "—" },
          amount,
          date,
          {
            id: "actions",
            header: "Action",
            cell: ({ row }) => (
              <div className="flex justify-end">
                <DeleteFloatDialog transfer={row.original} />
              </div>
            ),
          },
        ]
      : [
          sno,
          { id: "from", header: "From Branch", cell: ({ row }) => row.original.fromBranchName ?? "—" },
          { id: "to", header: "To Branch", cell: ({ row }) => row.original.toBranchName ?? "—" },
          amount,
          status,
          date,
          ...(variant === "branch"
            ? [
                {
                  id: "actions",
                  header: "Action",
                  cell: ({ row }) =>
                    row.original.status === "pending" ? (
                      <FloatDecisionActions transfer={row.original} currentUserId={currentUserId ?? ""} />
                    ) : (
                      <div className="flex justify-end">
                        <DeleteFloatDialog transfer={row.original} />
                      </div>
                    ),
                } satisfies ColumnDef<FloatTransfer>,
              ]
            : []),
        ];

  return (
    <div className="space-y-3">
      <SettingsTable
        columns={columns}
        data={transfers}
        searchFields={["fromBranchName", "toBranchName"]}
        searchPlaceholder="Search transfers…"
        emptyState={{
          icon: ArrowLeftRight,
          title: "No data available in table",
          description:
            variant === "today"
              ? "No float has been sent to a branch today."
              : variant === "approved"
                ? "No transfer has been approved yet."
                : "Raise a transfer using the button above.",
        }}
      />

      {/* The legacy screens print a TOTAL beneath the list. */}
      <div
        className="st-card flex items-center justify-between px-4 py-3"
        style={{ background: "var(--st-subtle)" }}
      >
        <span className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--st-ink-faint)]">Total</span>
        <span className="font-tabular text-[15px] font-semibold text-[var(--st-ink)]">{formatMoney(total)}</span>
      </div>
    </div>
  );
}
