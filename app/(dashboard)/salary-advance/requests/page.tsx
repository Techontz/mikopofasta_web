import { HandCoins } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { MOCK_ADVANCE_CATEGORIES, MOCK_SALARY_ADVANCES } from "@/lib/mock-data/salary-advance";
import { RequestPanel } from "@/features/salary-advance/request-panel";

export default async function SalaryAdvanceRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  return (
    <>
      <PageHeader
        icon={HandCoins}
        title="Salary Advance Request"
        description="Raise an advance for a customer, then work the queue of advances waiting on a decision."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Request" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <RequestPanel
        advances={MOCK_SALARY_ADVANCES.filter((a) => a.status === "requested")}
        categories={MOCK_ADVANCE_CATEGORIES}
      />
    </>
  );
}
