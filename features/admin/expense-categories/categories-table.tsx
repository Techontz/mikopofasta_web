"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Receipt, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ExpenseCategoryFormDialog } from "@/features/admin/expense-categories/category-form-dialog";
import { deleteExpenseCategory } from "@/features/admin/expense-categories/actions";
import type { ExpenseCategory } from "@/types/expense";
import type { ChartOfAccount } from "@/types/ledger";

export function ExpenseCategoriesTable({ categories, accounts }: { categories: ExpenseCategory[]; accounts: ChartOfAccount[] }) {
  const accountCode = (id: string) => accounts.find((a) => a.id === id)?.code ?? "—";

  const columns: ColumnDef<ExpenseCategory>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      accessorKey: "scope",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
      cell: ({ row }) => <StatusBadge tone="neutral" dot={false} className="uppercase">{row.original.scope}</StatusBadge>,
      filterFn: "arrIncludesSome",
    },
    { id: "account", header: "Ledger Account", cell: ({ row }) => <span className="font-mono text-xs">{accountCode(row.original.chartAccountId)}</span> },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ExpenseCategoryFormDialog category={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                <Trash2 />
              </Button>
            }
            title="Delete expense category?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Expense category deleted."
            onConfirm={() => deleteExpenseCategory(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={categories}
      searchFields={["name"]}
      searchPlaceholder="Search expense categories…"
      facetedFilters={[{ columnId: "scope", title: "Scope", options: [{ label: "Branch", value: "branch" }, { label: "HQ", value: "hq" }] }]}
      toolbarAction={<ExpenseCategoryFormDialog />}
      emptyState={{ icon: Receipt, title: "No expense categories yet", description: "Create a category to start tagging branch and HQ expenses." }}
    />
  );
}
