import { getInterestFormulas, getLoanProducts, getRepaymentSchedules } from "@/lib/api/loans";
import { getCustomerCategories } from "@/lib/api/customers";
import { getApprovalStages } from "@/lib/api/approval-stages";
import { ProductsTable } from "@/features/admin/loan-products/products-table";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/settings";

/**
 * Administration → Loan Category.
 *
 * The loan PRODUCTS an institution offers, and their whole configuration. Not
 * to be confused with Administration → Customer Types, which classifies the
 * people who borrow: a Customer Type says who somebody is, a Loan Category says
 * what the institution will lend them. The link between them is availability —
 * which types may borrow which products — and it is edited here.
 */
export default async function LoanProductsPage() {
  const [products, formulas, schedules, customerTypes, stages] = await Promise.all([
    getLoanProducts(),
    getInterestFormulas(),
    getRepaymentSchedules(),
    /* Active only: a retired Customer Type must not be offered as a new
       availability rule. Administrator-created; nothing is shipped. */
    getCustomerCategories(true),
    /* The configured approval chain — the source of truth behind "Approve
       status", which the legacy screen offered as three fixed words. */
    getApprovalStages(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HandCoins}
        title="Loan Category"
        description="The loan products this institution offers — amount band, interest, duration, repayments, deduction, approval tier and which Customer Types may borrow each."
        breadcrumb={[{ label: "Administration", href: "/admin" }, { label: "Loan Category" }]}
      />
      <ProductsTable
        products={products}
        formulas={formulas}
        schedules={schedules}
        customerTypes={customerTypes}
        approvalStages={stages.stages}
      />
    </div>
  );
}
