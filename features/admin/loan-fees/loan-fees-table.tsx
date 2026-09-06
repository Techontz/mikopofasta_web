"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Receipt } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { LoanFeeFormDialog } from "@/features/admin/loan-fees/loan-fee-form-dialog";
import { formatMoney } from "@/lib/domain/money";
import { CHARGE_VALUE_TYPE_LABELS, type LoanFeeRow } from "@/types/loan-charge";

/**
 * Settings → Loan Fee.
 *
 * The columns are the legacy screen's, in its order: category, level, interest,
 * fee type, fee, insurance. Level and interest come from the loan product and
 * are read-only here — they are set under Loan Category.
 */
export function LoanFeesTable({ rows }: { rows: LoanFeeRow[] }) {
  const columns: ColumnDef<LoanFeeRow>[] = [
    {
      accessorKey: "productName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan category" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-[var(--st-ink)]">{row.original.productName}</span>
          <span className="font-mono text-[12px] text-[var(--st-ink-faint)]">{row.original.productCode}</span>
        </div>
      ),
    },
    {
      id: "level",
      header: "Loan level",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">
          {formatMoney(row.original.minAmount)} – {formatMoney(row.original.maxAmount)}
        </span>
      ),
    },
    {
      accessorKey: "interestRate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Interest" />,
      cell: ({ row }) => <span className="font-tabular">{row.original.interestRate}%</span>,
    },
    {
      id: "feeType",
      header: "Fee type",
      cell: ({ row }) =>
        row.original.fee ? (
          <StatusBadge tone="neutral" dot={false}>
            {CHARGE_VALUE_TYPE_LABELS[row.original.fee.feeType]}
          </StatusBadge>
        ) : (
          <span className="text-[var(--st-ink-faint)]">—</span>
        ),
    },
    {
      id: "fee",
      header: "Loan fee",
      cell: ({ row }) => {
        const fee = row.original.fee;
        if (!fee) return <span className="text-[var(--st-ink-faint)]">Not set</span>;
        // The unit follows the type — a flat 5,000 and a 5% share are both
        // stored in feeAmount, and only feeType says which this is.
        return (
          <span className="font-tabular whitespace-nowrap">
            {fee.feeType === "percentage_value" ? `${fee.feeAmount}%` : formatMoney(fee.feeAmount)}
          </span>
        );
      },
    },
    {
      id: "insurance",
      header: "Insurance",
      cell: ({ row }) =>
        row.original.fee ? (
          <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.fee.insuranceAmount)}</span>
        ) : (
          <span className="text-[var(--st-ink-faint)]">—</span>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <LoanFeeFormDialog row={row.original} />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={rows}
      searchFields={["productName", "productCode"]}
      searchPlaceholder="Search loan categories…"
      emptyState={{
        icon: Receipt,
        title: "No loan categories yet",
        description: "Create a loan category first — fees are priced against one.",
      }}
    />
  );
}
