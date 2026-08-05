"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { FilePlus2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CustomerCell } from "@/components/customer-avatar";
import { LoanStatusBadge } from "@/features/loans/loan-status-badge";
import { LOAN_STATUS_LABELS } from "@/lib/domain/loan-status-machine";
import { formatMoney } from "@/lib/domain/money";
import { LOAN_STATUSES, type LoanStatus } from "@/types/enums";

export interface LoanRow {
  id: string;
  loanNumber: string;
  customerName: string;
  branchName: string;
  productName: string;
  principalAmount: number;
  outstanding: number;
  status: LoanStatus;
  disbursementDate: string | null;
}

export function LoansTable({ loans, canCreate }: { loans: LoanRow[]; canCreate: boolean }) {
  const columns: ColumnDef<LoanRow>[] = [
    {
      accessorKey: "loanNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan #" />,
      cell: ({ row }) => (
        <Link href={`/loans/${row.original.id}`} className="font-medium hover:underline">
          {row.original.loanNumber}
        </Link>
      ),
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      /* An avatar makes a loan book scannable by borrower — the same face and
         tint the customer carries on every other screen. No photo on the loan
         row, so initials; that is the ordinary case. */
      cell: ({ row }) => <CustomerCell name={row.original.customerName} size="xs" />,
    },
    { accessorKey: "branchName", header: "Branch" },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "principalAmount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Principal" />,
      cell: ({ row }) => <span className="font-tabular">{formatMoney(row.original.principalAmount)}</span>,
    },
    {
      accessorKey: "outstanding",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Outstanding" />,
      cell: ({ row }) =>
        row.original.outstanding > 0 ? (
          <span className="font-tabular">{formatMoney(row.original.outstanding)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <LoanStatusBadge status={row.original.status} />,
      filterFn: "arrIncludesSome",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={loans}
      searchFields={["loanNumber", "customerName"]}
      searchPlaceholder="Search by loan # or customer…"
      facetedFilters={[
        { columnId: "status", title: "Status", options: LOAN_STATUSES.map((s) => ({ label: LOAN_STATUS_LABELS[s], value: s })) },
      ]}
      toolbarAction={
        canCreate ? (
          <Button size="sm" nativeButton={false} render={<Link href="/loans/new" />}>
            <FilePlus2 className="size-4" />
            New Application
          </Button>
        ) : undefined
      }
      emptyState={{
        icon: Landmark,
        title: "No loans yet",
        description: canCreate
          ? "Submit a loan application for a KYC-completed customer to get started."
          : "Loans submitted by your branch will appear here.",
      }}
    />
  );
}
