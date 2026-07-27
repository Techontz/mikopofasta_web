import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { StaffTable } from "@/features/hr/staff-table";
import { toStaffRow } from "@/features/hr/queries";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const rows = MOCK_STAFF_PROFILES.filter((s) => s.deletedAt === null).map(toStaffRow);

  return (
    <div className="space-y-6">
      <div>
        <h1>Staff</h1>
        <p className="text-sm text-muted-foreground">Every employee, their salary basis, and commission eligibility.</p>
      </div>
      <SectionNav items={hrNavFor(user)} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Staff ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTable staff={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
