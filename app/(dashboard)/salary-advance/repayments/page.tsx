import { Repeat } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { MOCK_SALARY_ADVANCES } from "@/lib/mock-data/salary-advance";
import { AdvanceListPanel } from "@/features/salary-advance/advance-list-panel";

export default async function SalaryAdvanceRepaymentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  // Anything with money against it — still running, or settled.
  const repaying = MOCK_SALARY_ADVANCES.filter((a) => a.status === "active" || a.status === "repaid");

  return (
    <>
      <PageHeader
        icon={Repeat}
        title="Salary Advance Repayment"
        description="Advances being repaid, and those settled — what was lent, what has come back, and what is left."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Repayment" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <AdvanceListPanel
        advances={repaying}
        variant="repayment"
        title="Salary Advance Repayment"
        description="Every advance carrying a repayment, settled or not."
        emptyTitle="No repayments yet"
        emptyDescription="An advance appears here once it has been disbursed and is being repaid."
      />
    </>
  );
}
