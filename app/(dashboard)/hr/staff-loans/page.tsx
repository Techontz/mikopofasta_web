import { HandCoins } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard } from "@/components/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getStaffLoans } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { StaffLoansTable } from "@/features/hr/staff-loans-table";

/**
 * HRM → Staff Loan.
 *
 * Ported onto the API that already served it: `GET /api/v1/staff/loans`, via
 * the existing `getStaffLoans()`. No endpoint, model or permission was added —
 * the route is gated by `hr.view`, exactly as the API gates the call.
 */
export default async function StaffLoansPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const loans = await getStaffLoans();

  return (
    <>
      <PageHeader
        icon={HandCoins}
        title="Staff Loan"
        description="Loans the business has advanced to its own employees, and what each posted to the ledger."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Staff Loan" }]}
      />
      <SectionNav items={hrNavFor(user)} />
      <SettingsCard title={`Staff Loans (${loans.length})`} bodyClassName="pt-0 sm:pt-0">
        <StaffLoansTable loans={loans} />
      </SettingsCard>
    </>
  );
}
