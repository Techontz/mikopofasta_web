import { Activity } from "lucide-react";
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

export default async function ActiveSalaryAdvancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={Activity}
        title="Active Salary Advance"
        description="Advances currently outstanding. The Alert column flags anything past its due date, and by how long."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Active Salary Advance" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <AdvanceListPanel
        advances={MOCK_SALARY_ADVANCES.filter((a) => a.status === "active")}
        variant="active"
        title="Active Salary Advance"
        description="Outstanding advances, with what has been paid and what remains."
        emptyTitle="No active advances"
        emptyDescription="An advance becomes active once it has been disbursed."
      />
    </>
  );
}
