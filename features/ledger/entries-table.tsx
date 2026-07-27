"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { NotebookText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { JOURNAL_SOURCE_TYPES, type JournalSourceType } from "@/types/enums";

export interface EntryRow {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  amount: number;
  lineCount: number;
  state: string;
}

function label(v: string): string {
  return v.replace(/_/g, " ");
}

const STATE_TONE: Record<string, string> = {
  Posted: "",
  Reversal: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  Reversed: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function EntriesTable({ entries }: { entries: EntryRow[] }) {
  const columns: ColumnDef<EntryRow>[] = [
    {
      accessorKey: "entryNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entry #" />,
      cell: ({ row }) => (
        <Link href={`/ledger/entries/${row.original.id}`} className="font-tabular font-medium hover:underline">
          {row.original.entryNumber}
        </Link>
      ),
    },
    {
      accessorKey: "entryDate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.entryDate}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="block max-w-96 truncate">{row.original.description}</span>,
    },
    {
      accessorKey: "sourceType",
      header: "Source",
      cell: ({ row }) => <span className="capitalize">{label(row.original.sourceType)}</span>,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <span className="font-tabular">{formatMoney(row.original.amount)}</span>,
    },
    { accessorKey: "lineCount", header: "Lines" },
    {
      accessorKey: "state",
      header: "State",
      cell: ({ row }) => (
        <Badge variant="outline" className={`whitespace-nowrap ${STATE_TONE[row.original.state] ?? ""}`}>
          {row.original.state}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={entries}
      searchFields={["entryNumber", "description"]}
      searchPlaceholder="Search by entry # or description…"
      facetedFilters={[
        { columnId: "sourceType", title: "Source", options: JOURNAL_SOURCE_TYPES.map((s) => ({ label: label(s), value: s })) },
        {
          columnId: "state",
          title: "State",
          options: [
            { label: "Posted", value: "Posted" },
            { label: "Reversal", value: "Reversal" },
            { label: "Reversed", value: "Reversed" },
          ],
        },
      ]}
      emptyState={{ icon: NotebookText, title: "No journal entries", description: "Entries appear here as money moves through the system." }}
    />
  );
}
