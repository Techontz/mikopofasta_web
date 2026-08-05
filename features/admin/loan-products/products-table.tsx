"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HandCoins, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ProductFormDialog } from "@/features/admin/loan-products/product-form-dialog";
import { deleteLoanProduct } from "@/features/admin/loan-products/actions";
import { formatMoney } from "@/lib/domain/money";
import type { LoanProductWithConfig } from "@/lib/api/loans";
import type { InterestFormula, RepaymentSchedule } from "@/types/loan-product";

interface ProductsTableProps {
  products: LoanProductWithConfig[];
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
}

/** Allowed cadences come with the product (`allowedRepaymentScheduleIds`), so there is no pivot to join. */
export function ProductsTable({ products, formulas, schedules }: ProductsTableProps) {
  const formulaName = (id: string) => formulas.find((f) => f.id === id)?.name ?? "—";

  const columns: ColumnDef<LoanProductWithConfig>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    { id: "formula", header: "Interest Formula", cell: ({ row }) => formulaName(row.original.interestFormulaId) },
    {
      id: "range",
      header: "Amount Range",
      cell: ({ row }) => `${formatMoney(row.original.minAmount)} – ${formatMoney(row.original.maxAmount)}`,
    },
    { id: "tenure", header: "Tenure", cell: ({ row }) => `${row.original.minTenureDays}–${row.original.maxTenureDays} days` },
    {
      id: "mandate",
      header: "Mandate",
      cell: ({ row }) => (row.original.requiresMandate ? <StatusBadge tone="info" dot={false}>Required</StatusBadge> : "—"),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === "active" ? "active" : "inactive"} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ProductFormDialog product={row.original} formulas={formulas} schedules={schedules} productScheduleIds={row.original.allowedRepaymentScheduleIds} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete loan product ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete loan product?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Loan product deleted."
            onConfirm={() => deleteLoanProduct(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={products}
      searchFields={["name", "code"]}
      searchPlaceholder="Search loan products…"
      facetedFilters={[{ columnId: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] }]}
      toolbarAction={<ProductFormDialog formulas={formulas} schedules={schedules} />}
      emptyState={{ icon: HandCoins, title: "No loan products yet", description: "Create a loan product to make it available for application." }}
    />
  );
}
