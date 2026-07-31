import { BadgeCheck } from "lucide-react";
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

export default async function SalaryAdvanceApprovedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  const { advances } = await getSalaryAdvances({ status: "approved", perPage: 100 });

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        title="Salary Advance Approved"
        description="Advances that have been approved and are committed to the customer."
        breadcrumb={[{ label: "Salary Advance", href: "/salary-advance/categories" }, { label: "Salary Advance Approved" }]}
      />
      <SectionNav items={salaryAdvanceNavFor(user)} />
      <AdvanceListPanel
        advances={advances}
        variant="approved"
        title="Salary Advance Approved"
        description="Approved and awaiting disbursement. The totals row follows whatever the search leaves."
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from Salary Advance Request."
      />
    </>
  );
}
