"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/domain/trial-balance";
import { ACCOUNT_TYPES, type AccountType } from "@/types/enums";

export interface AccountRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  kind: string;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  const columns: ColumnDef<AccountRow>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <Link href={`/ledger/accounts/${row.original.accountId}`} className="font-tabular font-medium hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
      cell: ({ row }) => (
        <Link href={`/ledger/accounts/${row.original.accountId}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="outline">{ACCOUNT_TYPE_LABELS[row.original.type]}</Badge>,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "kind",
      header: "Kind",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.kind}</span>,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "debitTotal",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Debits" />,
      cell: ({ row }) => <span className="font-tabular">{row.original.debitTotal > 0 ? formatMoney(row.original.debitTotal) : "—"}</span>,
    },
    {
      accessorKey: "creditTotal",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Credits" />,
      cell: ({ row }) => <span className="font-tabular">{row.original.creditTotal > 0 ? formatMoney(row.original.creditTotal) : "—"}</span>,
    },
    {
      accessorKey: "balance",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
      cell: ({ row }) => <span className="font-tabular font-medium">{formatMoney(row.original.balance)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={accounts}
      searchFields={["code", "name"]}
      searchPlaceholder="Search by code or account name…"
      facetedFilters={[
        { columnId: "type", title: "Type", options: ACCOUNT_TYPES.map((t) => ({ label: ACCOUNT_TYPE_LABELS[t], value: t })) },
        {
          columnId: "kind",
          title: "Kind",
          options: [
            { label: "System", value: "System" },
            { label: "Dynamic", value: "Dynamic" },
          ],
        },
      ]}
      emptyState={{ icon: BookOpen, title: "No accounts found", description: "The chart of accounts is seeded at system setup." }}
    />
  );
}
