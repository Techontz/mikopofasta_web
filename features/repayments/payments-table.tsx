"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { PAYMENT_CHANNELS, PAYMENT_STATUSES, type PaymentChannel, type PaymentStatus } from "@/types/enums";

export interface PaymentRow {
  id: string;
  paymentReference: string;
  loanNumber: string;
  customerName: string;
  branchName: string;
  amount: number;
  channel: PaymentChannel;
  status: PaymentStatus;
  receivedAt: string;
}

const STATUS_TONE: Record<PaymentStatus, string> = {
  received: "",
  pending_verification: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  unmatched: "border-destructive/40 bg-destructive/10 text-destructive",
  allocated: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  reversed: "border-destructive/40 bg-destructive/10 text-destructive",
  duplicate_flagged: "border-destructive/40 bg-destructive/10 text-destructive",
};

function label(value: string): string {
  return value.replace(/_/g, " ");
}

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  const columns: ColumnDef<PaymentRow>[] = [
    {
      accessorKey: "paymentReference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => (
        <Link href={`/repayments/${row.original.id}`} className="font-medium hover:underline">
          {row.original.paymentReference}
        </Link>
      ),
    },
    { accessorKey: "loanNumber", header: "Loan #" },
    { accessorKey: "customerName", header: "Customer" },
    { accessorKey: "branchName", header: "Branch" },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <span className="font-tabular">{formatMoney(row.original.amount)}</span>,
    },
    {
      accessorKey: "channel",
      header: "Channel",
      cell: ({ row }) => <span className="capitalize">{label(row.original.channel)}</span>,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={`capitalize whitespace-nowrap ${STATUS_TONE[row.original.status]}`}>
          {label(row.original.status)}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "receivedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Received" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{new Date(row.original.receivedAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={payments}
      searchFields={["paymentReference", "loanNumber", "customerName"]}
      searchPlaceholder="Search by reference, loan #, or customer…"
      facetedFilters={[
        { columnId: "status", title: "Status", options: PAYMENT_STATUSES.map((s) => ({ label: label(s), value: s })) },
        { columnId: "channel", title: "Channel", options: PAYMENT_CHANNELS.map((c) => ({ label: label(c), value: c })) },
      ]}
      emptyState={{ icon: Wallet, title: "No payments recorded yet", description: "Payments appear here as they arrive from any channel." }}
    />
  );
}
