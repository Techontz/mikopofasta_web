import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_LOAN_PRODUCTS, MOCK_CATEGORY_PRODUCT_ELIGIBILITY, MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES } from "@/lib/mock-data/loan-products";
import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { LoanApplicationForm } from "@/features/loans/loan-application-form";

export default async function NewLoanPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LOANS_CREATE)) {
    return <AccessDeniedState />;
  }

  const seesAllBranches = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const customers = MOCK_CUSTOMERS.filter(
    (c) =>
      c.deletedAt === null &&
      c.kycStatus === "completed" &&
      (seesAllBranches || c.branchId === user.branchId)
  );

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
        products={MOCK_LOAN_PRODUCTS.filter((p) => p.deletedAt === null)}
        schedules={MOCK_REPAYMENT_SCHEDULES.filter((s) => s.deletedAt === null)}
        formulas={MOCK_INTEREST_FORMULAS}
        eligibility={MOCK_CATEGORY_PRODUCT_ELIGIBILITY}
        productSchedules={MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES}
        openLoans={MOCK_LOANS.filter((l) => l.deletedAt === null)}
      />
    </div>
  );
}
