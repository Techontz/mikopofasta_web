import { Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { MOCK_ADVANCE_PAYMENTS } from "@/lib/mock-data/salary-advance";
import { PaidListPanel } from "@/features/salary-advance/paid-list-panel";

export default async function SalaryAdvancePaidListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Wallet}
        title="Salary Advance Paid List"
        description="Individual repayments received against salary advances, newest first."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Paid List" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <PaidListPanel payments={MOCK_ADVANCE_PAYMENTS} />
    </>
  );
}
