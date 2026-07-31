import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { getSalaryAdvanceRepayments } from "@/lib/api/salary-advance";
import { PaidListPanel } from "@/features/salary-advance/paid-list-panel";

export default async function SalaryAdvancePaidListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  /*
   * The instalments themselves, read from the payroll deductions that took
   * them — an advance is repaid by being deducted from a payslip, so the
   * deduction is the payment.
   */
  const { payments } = await getSalaryAdvanceRepayments({ perPage: 100 });

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Salary Advance Paid List"
        description="Individual repayments received against salary advances, newest first."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Paid List" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <PaidListPanel payments={payments} />
    </>
  );
}
