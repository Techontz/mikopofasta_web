import { HandCoins } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { salaryAdvanceNavFor } from "@/features/ledger/nav-items";
import { getSalaryAdvanceCategories, getSalaryAdvances } from "@/lib/api/salary-advance";
import { getStaff } from "@/lib/api/hr";
import { RequestPanel } from "@/features/salary-advance/request-panel";

export default async function SalaryAdvanceRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  const [{ advances }, categories, staff] = await Promise.all([
    getSalaryAdvances({ status: "requested", perPage: 100 }),
    getSalaryAdvanceCategories(),
    getStaff({ employmentStatus: ["active"] }),
  ]);

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
        advances={advances}
        categories={categories}
        staff={staff.staff.map((member) => ({
          id: member.id,
          name: member.name ?? member.employeeNumber,
          branch: member.branchName ?? "",
        }))}
      />
    </>
  );
}
