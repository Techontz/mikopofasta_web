import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";
import { MOCK_STAFF_LOANS } from "@/lib/mock-data/staff-loans";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { RequestAdvanceForm, AdvanceDecisionButtons } from "@/features/hr/advance-actions";
import { staffName } from "@/features/hr/queries";

const STATUS_TONE: Record<string, string> = {
  requested: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  approved: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  disbursed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  recovered: "",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default async function StaffAdvancesPage() {
  const user = await getCurrentUser();
  if (!user || !hasAnyPermission(user, [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE])) return <AccessDeniedState />;

  const canManage = hasPermission(user, PERMISSIONS.HR_MANAGE);
  const canDisburse = hasPermission(user, PERMISSIONS.PAYROLL_FINALIZE);

  const staffOptions = MOCK_STAFF_PROFILES.filter((s) => s.deletedAt === null && s.employmentStatus === "active").map((s) => ({
    id: s.id,
    label: `${s.employeeNumber} — ${staffName(s.id)}`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1>Staff Loans &amp; Advances</h1>
        <p className="text-sm text-muted-foreground">
          HR approves an advance; only Finance disburses it. Recovery then happens automatically through payroll deductions.
        </p>
      </div>

      <SectionNav items={hrNavFor(user)} />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request an Advance</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestAdvanceForm staff={staffOptions} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advances ({MOCK_STAFF_ADVANCES.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_STAFF_ADVANCES.length === 0 ? (
            <EmptyState title="No advances on record" />
          ) : (
            <ul className="space-y-2">
              {MOCK_STAFF_ADVANCES.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <Link href={`/hr/staff/${a.staffProfileId}`} className="font-medium hover:underline">
                      {staffName(a.staffProfileId)}
                    </Link>
                    <p className="text-xs text-muted-foreground">Requested {new Date(a.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-tabular">{formatMoney(a.amount)}</span>
                    <Badge variant="outline" className={`capitalize ${STATUS_TONE[a.status] ?? ""}`}>
                      {a.status}
                    </Badge>
                    <AdvanceDecisionButtons advanceId={a.id} status={a.status} canApprove={canManage} canDisburse={canDisburse} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Loans ({MOCK_STAFF_LOANS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_STAFF_LOANS.length === 0 ? (
            <EmptyState title="No staff loans" />
          ) : (
            <ul className="space-y-2">
              {MOCK_STAFF_LOANS.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <Link href={`/hr/staff/${l.staffProfileId}`} className="font-medium hover:underline">
                      {staffName(l.staffProfileId)}
                    </Link>
                    <p className="text-xs text-muted-foreground">Disbursed {l.disbursedAt}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular">{formatMoney(l.amount)}</span>
                    <Badge variant="outline" className="capitalize">
                      {l.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
