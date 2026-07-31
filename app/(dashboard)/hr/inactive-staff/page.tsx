import { UserX } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard } from "@/components/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getAllStaff } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { StaffTable } from "@/features/hr/staff-table";
import { toStaffRow } from "@/features/hr/queries";

/**
 * HRM → Inactive Staff.
 *
 * The legacy system calls this screen "All Rejected staff". It is NOT called
 * that here, deliberately: `employmentStatus` in this system is
 * active | suspended | terminated, and there is no `rejected`. Labelling a list
 * of suspended and terminated employees "Rejected" would put a word on the
 * screen that the data does not support — a terminated employee worked here for
 * years; a rejected one never did.
 *
 * If the business needs a true rejected state — a staff registration that was
 * turned down — that is a status on the backend, and this page should be
 * renamed and re-filtered once it exists. Until then this shows what the data
 * actually holds, on the same API and the same table as All Active Staff.
 */
export default async function InactiveStaffPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // Same call and same row mapping as All Active Staff — only the filter
  // differs, so a person cannot appear on both lists or neither.
  const rows = (await getAllStaff())
    .filter((s) => s.deletedAt === null && s.employmentStatus !== "active")
    .map(toStaffRow);

  return (
    <>
      <PageHeader
        icon={UserX}
        title="Inactive Staff"
        description="Employees who are suspended or no longer employed. This system has no 'rejected' status, so none is implied here."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Inactive Staff" }]}
      />
      <SectionNav items={hrNavFor(user)} />
      <SettingsCard title={`Inactive Staff (${rows.length})`} bodyClassName="pt-0 sm:pt-0">
        <StaffTable staff={rows} />
      </SettingsCard>
    </>
  );
}
