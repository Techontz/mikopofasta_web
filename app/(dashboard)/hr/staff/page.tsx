import { UsersRound } from "lucide-react";
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
 * HRM → All active staff.
 *
 * Presentation only: the same `getAllStaff` call, the same soft-delete filter,
 * the same row mapping and the same permission gate. PageHeader and
 * SettingsCard replace the bare heading and the shadcn card, so this reads as
 * one module with the Menu tab.
 */
export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // HR is an HQ function, so this is not branch-scoped (§14) — every employee,
  // with name, role and branch already resolved by the API.
  const rows = (await getAllStaff()).filter((s) => s.deletedAt === null).map(toStaffRow);

  return (
    <>
      <PageHeader
        icon={UsersRound}
        title="Staff"
        description="Every employee, their salary basis, and commission eligibility."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "All active staff" }]}
      />
      <SectionNav items={hrNavFor(user)} />
      <SettingsCard title={`All Staff (${rows.length})`} bodyClassName="pt-0 sm:pt-0">
        <StaffTable staff={rows} />
      </SettingsCard>
    </>
  );
}
