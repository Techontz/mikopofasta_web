"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Tags, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { CategoryFormDialog } from "@/features/admin/customer-categories/category-form-dialog";
import { deleteCustomerCategory } from "@/features/admin/customer-categories/actions";
import { RISK_TIERS } from "@/types/enums";
import type { CustomerCategory } from "@/types/customer";

const RISK_TONE: Record<string, "active" | "warning" | "danger"> = { low: "active", medium: "warning", high: "danger" };

export function CategoriesTable({ categories }: { categories: CustomerCategory[] }) {
  const columns: ColumnDef<CustomerCategory>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "riskTier",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Risk Tier" />,
      cell: ({ row }) => <StatusBadge tone={RISK_TONE[row.original.riskTier] ?? "neutral"} className="capitalize">{row.original.riskTier}</StatusBadge>,
      filterFn: "arrIncludesSome",
    },
    { id: "fields", header: "Dynamic Fields", cell: ({ row }) => row.original.dynamicFormSchema.length },
    {
      id: "approval",
      header: "Extra Approval",
      cell: ({ row }) => (row.original.requiresExtraApproval ? <StatusBadge tone="info" dot={false}>Required</StatusBadge> : "—"),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <CategoryFormDialog category={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete customer category ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete customer category?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Category deleted."
            onConfirm={() => deleteCustomerCategory(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={categories}
      searchFields={["name", "code"]}
      searchPlaceholder="Search categories…"
      facetedFilters={[{ columnId: "riskTier", title: "Risk Tier", options: RISK_TIERS.map((t) => ({ label: t, value: t })) }]}
      toolbarAction={<CategoryFormDialog />}
      emptyState={{ icon: Tags, title: "No customer categories yet", description: "Create a category to define KYC rules for a customer segment." }}
    />
  );
}
