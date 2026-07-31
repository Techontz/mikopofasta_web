"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Receipt, Trash2 } from "lucide-react";
import { Money, StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ExpenseCategoryFormDialog } from "@/features/admin/expense-categories/category-form-dialog";
import { deleteExpenseCategory } from "@/features/admin/expense-categories/actions";
import { formatMoney } from "@/lib/domain/money";
import type { ExpenseRegisterEntry } from "@/lib/api/expenses";

/**
 * Settings → Expense Categories.
 *
 * The ledger account code comes down on the record rather than being looked up
 * against a separate chart-of-accounts list. The backend creates the account
 * with the category and hands back its code, so there is no join to get wrong
 * and no way for the two to disagree about which account a category owns.
 */
export function ExpenseCategoriesTable({ categories }: { categories: ExpenseRegisterEntry[] }) {
  const columns: ColumnDef<ExpenseRegisterEntry>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      accessorKey: "scope",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
      cell: ({ row }) => (
        <StatusBadge tone="neutral" dot={false} className="uppercase">
          {row.original.scope}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      id: "account",
      header: "Ledger Account",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.chartAccountCode ?? "—"}</span>,
    },
    {
      id: "spent",
      header: () => <span className="block text-right">Spent to date</span>,
      cell: ({ row }) =>
        row.original.spentToDate === null ? (
          <span className="block text-right text-[var(--st-ink-faint)]">—</span>
        ) : (
          <Money>{formatMoney(row.original.spentToDate)}</Money>
        ),
    },
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
            /*
             * Not "permanently removed": the category is soft-deleted and its
             * ledger account deactivated, because it holds every shilling ever
             * spent under this name. Saying otherwise would describe a
             * destruction that does not happen.
             */
            description={`"${row.original.name}" will stop accepting new requests. Requests already filed keep it, and what has been spent stays on the books.`}
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
      facetedFilters={[
        {
          columnId: "scope",
          title: "Scope",
          options: [
            { label: "Branch", value: "branch" },
            { label: "Headquarters", value: "headquarters" },
          ],
        },
      ]}
      toolbarAction={<ExpenseCategoryFormDialog />}
      emptyState={{
        icon: Receipt,
        title: "No expense categories yet",
        description: "Create a category to start tagging branch and head-office expenses.",
      }}
    />
  );
}
