"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { HandCoins, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ProductFormDialog } from "@/features/admin/loan-products/product-form-dialog";
import { deleteLoanProduct } from "@/features/admin/loan-products/actions";
import { formatMoney } from "@/lib/domain/money";
import type { LoanProductWithConfig } from "@/lib/api/loans";
import type { InterestFormula, RepaymentSchedule } from "@/types/loan-product";
import type { ApprovalStageRecord } from "@/lib/api/approval-stages";
import type { CustomerCategory } from "@/types/customer";
import { ProductDetailsDialog } from "@/features/admin/loan-products/product-details-dialog";
import { AssignBranchButton } from "@/features/admin/loan-products/assign-branch-button";

interface ProductsTableProps {
  products: LoanProductWithConfig[];
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
  /** Administrator-created Customer Types. Never a literal in this file. */
  customerTypes: CustomerCategory[];
  /** The configured approval chain — the source of truth for "Approve status". */
  approvalStages: ApprovalStageRecord[];
}

/** Allowed cadences come with the product (`allowedRepaymentScheduleIds`), so there is no pivot to join. */
export function ProductsTable({ products, formulas, schedules, customerTypes, approvalStages }: ProductsTableProps) {
  const formulaName = (id: string) => formulas.find((f) => f.id === id)?.name ?? "—";

  const columns: ColumnDef<LoanProductWithConfig>[] = [
    /*
     * The legacy Loan Category list, column for column. It is a dense ERP
     * table and that is deliberate: an officer configuring products compares
     * them across rows, so hiding a column to narrow the table would cost more
     * than the horizontal scroll does.
     */
    {
      id: "serial",
      header: "S/No.",
      cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.index + 1}.</span>,
    },
    {
      id: "customerType",
      header: "Customer Type",
      /*
       * Who may borrow this product. The only classification this screen uses —
       * there is no separate loan-type concept.
       *
       * Resolved through the existing eligibility pivot against the Customer
       * Types module, so a type created at Administration → Customer Types is
       * selectable and displayable here immediately, with no code change. Never
       * a list stored on the product, and never a name written in this file.
       */
      cell: ({ row }) => {
        const names = (row.original.customerTypeIds ?? [])
          .map((id) => customerTypes.find((t) => t.id === id)?.name)
          .filter(Boolean);

        /* Unassigned is stated, not invented. An earlier version rendered "All"
           here, which claimed an eligibility the product does not actually
           hold. */
        return names.length === 0 ? (
          <span className="text-muted-foreground">No customer type</span>
        ) : (
          names.join(", ")
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Loan Category name" />,
    },
    {
      id: "range",
      header: "Loan level",
      cell: ({ row }) => `${formatMoney(row.original.minAmount)} – ${formatMoney(row.original.maxAmount)}`,
    },
    {
      id: "interest",
      header: "Loan Interest",
      cell: ({ row }) => `${row.original.interestRate}%`,
    },
    { id: "formula", header: "Interest Formular", cell: ({ row }) => formulaName(row.original.interestFormulaId) },
    {
      id: "duration",
      header: "Duration",
      /* The cadence of the schedules attached to the product — Daily, Weekly,
         Monthly. Read from the schedules themselves, not a second column. */
      cell: ({ row }) => {
        const names = (row.original.allowedRepaymentScheduleIds ?? [])
          .map((id) => schedules.find((sc) => sc.id === id)?.name)
          .filter(Boolean);
        return names.length === 0 ? <span className="text-muted-foreground">—</span> : names.join(", ");
      },
    },
    {
      id: "repayments",
      header: "Number Of Repayment",
      cell: ({ row }) => {
        const { minRepayments: lo, maxRepayments: hi } = row.original;
        if (lo == null && hi == null) return <span className="text-muted-foreground">—</span>;
        return lo != null && hi != null ? `${lo} - ${hi}` : String(lo ?? hi);
      },
    },
    {
      id: "deduction",
      header: "Deduction",
      cell: ({ row }) => (row.original.allowsDeduction ? "YES" : "NO"),
    },
    {
      id: "penalty",
      header: "Penalty",
      /* A product carries a penalty when a rate is actually set on it. */
      cell: ({ row }) => (Number(row.original.penaltyRate) > 0 ? "YES" : "NO"),
    },
    {
      id: "approval",
      header: "Approve status",
      /* The configured stage, named. Blank means the loan walks the whole
         chain, which is what an unconfigured product does. */
      cell: ({ row }) => {
        const stage = approvalStages.find((st) => st.id === row.original.approvalStageId);
        return stage ? stage.name : <span className="text-muted-foreground">Full chain</span>;
      },
    },
    {
      id: "topup",
      header: "Topup percent",
      cell: ({ row }) => (row.original.topupPercent == null ? <span className="text-muted-foreground">—</span> : `${row.original.topupPercent}%`),
    },
    {
      id: "takehome",
      header: "Take home percent",
      cell: ({ row }) =>
        row.original.takeHomePercent == null ? <span className="text-muted-foreground">—</span> : `${row.original.takeHomePercent}%`,
    },
    {
      id: "actions",
      header: "Action",
      /*
       * Four buttons, in the order the legacy screen puts them: details, edit,
       * status, delete. Kept as four distinct controls rather than folded into
       * a kebab — an officer working down this table uses all four, and a menu
       * would put two clicks in front of each.
       */
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ProductDetailsDialog product={row.original} />
          <ProductFormDialog
            product={row.original}
            formulas={formulas}
            schedules={schedules}
            customerTypes={customerTypes}
            approvalStages={approvalStages}
            productScheduleIds={row.original.allowedRepaymentScheduleIds}
          />
          <AssignBranchButton productId={row.original.id} name={row.original.name} />
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
            /* Honest about the likely outcome: the server refuses a delete once
               loans reference the product, and deactivating is the answer. */
            description={
              (row.original.loanCount ?? 0) > 0
                ? `"${row.original.name}" is referenced by ${row.original.loanCount} loan${row.original.loanCount === 1 ? "" : "s"} and cannot be deleted — those records read their terms from it. The server will refuse this.`
                : `"${row.original.name}" will be permanently removed. This can't be undone.`
            }
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
      toolbarAction={<ProductFormDialog formulas={formulas} schedules={schedules} customerTypes={customerTypes} approvalStages={approvalStages} />}
      emptyState={{ icon: HandCoins, title: "No loan products yet", description: "Create a loan product to make it available for application." }}
    />
  );
}
