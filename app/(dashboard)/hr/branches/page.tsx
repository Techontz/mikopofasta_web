import { Building2 } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard } from "@/components/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getAllStaff } from "@/lib/api/hr";
import { getBranches } from "@/lib/api/organization";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { BranchStaffTable, type BranchStaffRow } from "@/features/hr/branch-staff-table";

/**
 * HRM → Branch & Staff.
 *
 * Ported onto two APIs that already existed — `GET /api/v1/branches` and
 * `GET /api/v1/staff`. Nothing was added to the backend.
 *
 * Headcount and salary are derived here from the staff book rather than read
 * off the branch, so this page and All Active Staff cannot disagree about who
 * works where. The branch call fails soft: HR can still see the establishment
 * from the staff side if Organization is unreadable to this role.
 */
export default async function BranchStaffPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const [branches, staff] = await Promise.all([
    getBranches().catch(() => []),
    getAllStaff(),
  ]);

  const live = staff.filter((s) => s.deletedAt === null);

  const rows: BranchStaffRow[] = branches
    .filter((b) => b.deletedAt === null)
    .map((b) => {
      const here = live.filter((s) => s.branchId === b.id);
      const active = here.filter((s) => s.employmentStatus === "active");
      return {
        id: b.id,
        name: b.name,
        phone: b.phone ?? "—",
        regionName: b.regionName ?? "—",
        status: b.status,
        isHeadOffice: b.isHeadOffice,
        headcount: here.length,
        activeCount: active.length,
        // Only active staff draw a salary, so the cost follows them.
        monthlySalary: active.reduce((sum, s) => sum + s.baseSalary, 0),
      };
    })
    .sort((a, b) => b.headcount - a.headcount);

  return (
    <>
      <PageHeader
        icon={Building2}
        title="Branch & Staff"
        description="Every branch, who is posted to it, and what its establishment costs each month."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Branch & Staff" }]}
      />
      <SectionNav items={hrNavFor(user)} />
      <SettingsCard title={`Branch List (${rows.length})`} bodyClassName="pt-0 sm:pt-0">
        <BranchStaffTable branches={rows} />
      </SettingsCard>
    </>
  );
}
