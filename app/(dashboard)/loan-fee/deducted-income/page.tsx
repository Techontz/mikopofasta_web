import { Coins } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { loanFeeNavFor } from "@/features/ledger/nav-items";
import { getDeductedIncome } from "@/lib/api/charges";
import { getBranches } from "@/lib/api/organization";
import { DeductedIncomePanel } from "@/features/operations/deducted-income-panel";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW])) {
    return <AccessDeniedState />;
  }

  const [income, branches] = await Promise.all([
    getDeductedIncome({ perPage: 100 }),
    getBranches(),
  ]);

  return (
    <>
      <PageHeader
        icon={Coins}
        title="Deducted Income"
        description="The fee withheld from each loan at disbursement, recorded as company income."
        breadcrumb={[{ label: "Loan Fee", href: "/loan-fee/deducted-income" }, { label: "Deducted Income" }]}
      />
      <SectionNav items={loanFeeNavFor(user)} />
      <DeductedIncomePanel
        rows={income.income}
        totals={{ income: income.totalIncome, approved: income.totalApproved }}
        branches={branches.map((b) => b.name)}
      />
    </>
  );
}
