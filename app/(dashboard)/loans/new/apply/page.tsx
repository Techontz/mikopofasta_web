import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getAllCustomers, getCustomerCategories } from "@/lib/api/customers";
import { getEligibilityMatrix, getInterestFormulas, getLoanProducts, getRepaymentSchedules } from "@/lib/api/loans";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";

export default async function NewLoanPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LOANS_CREATE)) {
    return <AccessDeniedState />;
  }

  // Branch scoping is the API's (§13), so the customer list arrives already
  // narrowed — this asks only for the KYC gate the form itself cares about.
  const [customers, products, schedules, formulas, categories] = await Promise.all([
    getAllCustomers({ kycStatus: ["completed"] }),
    getLoanProducts(),
    getRepaymentSchedules(),
    getInterestFormulas(),
    getCustomerCategories(),
  ]);

  // Which products each category may borrow, and the ceiling that can sit under
  // the product's own maximum. Fetched per category because there is no bulk
  // endpoint, and the form needs it before the officer's first keystroke.
  const eligibility = await getEligibilityMatrix(categories.map((c) => c.id));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/loans"><ArrowLeft className="size-4" />Back to Loans</Link>} />
      <div>
        <h1>New Loan Application</h1>
        <p className="text-sm text-muted-foreground">
          Eligibility, limits, and the repayment plan all come from the selected product&apos;s configuration.
        </p>
      </div>
      <LoanApplicationForm
        customers={customers}
        products={products.filter((p) => p.deletedAt === null)}
        schedules={schedules.filter((s) => s.deletedAt === null)}
        formulas={formulas}
        eligibility={eligibility}
      />
    </div>
  );
}
