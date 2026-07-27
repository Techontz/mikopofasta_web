"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HandCoins, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ProductFormDialog } from "@/features/admin/loan-products/product-form-dialog";
import { deleteLoanProduct } from "@/features/admin/loan-products/actions";
import { formatMoney } from "@/lib/domain/money";
import type { LoanProduct, InterestFormula, RepaymentSchedule, LoanProductRepaymentSchedule } from "@/types/loan-product";

interface ProductsTableProps {
  products: LoanProduct[];
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
  pivot: LoanProductRepaymentSchedule[];
}

export function ProductsTable({ products, formulas, schedules, pivot }: ProductsTableProps) {
  const formulaName = (id: string) => formulas.find((f) => f.id === id)?.name ?? "—";
  const scheduleIdsFor = (productId: string) => pivot.filter((p) => p.loanProductId === productId).map((p) => p.repaymentScheduleId);

  const columns: ColumnDef<LoanProduct>[] = [
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
      cell: ({ row }) => (row.original.requiresMandate ? <Badge variant="outline">Required</Badge> : "—"),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"} className="capitalize">
          {row.original.status}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ProductFormDialog product={row.original} formulas={formulas} schedules={schedules} productScheduleIds={scheduleIdsFor(row.original.id)} />
          <ConfirmDeleteDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
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
    <DataTable
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
