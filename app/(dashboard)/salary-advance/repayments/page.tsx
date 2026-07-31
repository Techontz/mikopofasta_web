import { Repeat } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { getSalaryAdvances } from "@/lib/api/salary-advance";
import { AdvanceListPanel } from "@/features/salary-advance/advance-list-panel";

export default async function SalaryAdvanceRepaymentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  // Anything with money against it — still running, or settled.
  /*
   * Both stages, because this screen is about recovery: an advance still being
   * recovered and one that has finished are the same story at two points, and
   * showing only the first would hide every advance that completed.
   */
  const [active, repaid] = await Promise.all([
    getSalaryAdvances({ status: "active", perPage: 100 }),
    getSalaryAdvances({ status: "repaid", perPage: 100 }),
  ]);

  const repaying = [...active.advances, ...repaid.advances];

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
