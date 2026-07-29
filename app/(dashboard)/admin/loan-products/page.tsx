import { getInterestFormulas, getLoanProducts, getRepaymentSchedules } from "@/lib/api/loans";
import { ProductsTable } from "@/features/admin/loan-products/products-table";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/settings";

export default async function LoanProductsPage() {
  const [products, formulas, schedules] = await Promise.all([
    getLoanProducts(),
    getInterestFormulas(),
    getRepaymentSchedules(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HandCoins}
        title="Loan Category"
        description="Interest, limits, tenure, mandate requirements, and penalty configuration per product."
        breadcrumb={[{ label: "Settings", href: "/admin" }, { label: "Loan Category" }]}
      />
      <ProductsTable products={products} formulas={formulas} schedules={schedules} />
    </div>
  );
}
