import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { getAllStaff, getStaffAdvances, getStaffLoans } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { RequestAdvanceForm, AdvanceDecisionButtons } from "@/features/hr/advance-actions";

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

  /*
   * This route is deliberately reachable by Finance without `hr.view` (§14 —
   * disbursing an advance is Finance's, never HR's). The API does not follow
   * suit: `/staff/advances`, `/staff/loans` and `/staff` are all gated behind
   * `hr.view`, so those three calls answer Finance 403 even though
   * `payroll.finalize` is what authorises the disbursement itself.
   *
   * Each call therefore fails soft, and the banner below says plainly why the
   * queue is empty rather than leaving Finance on a blank page wondering where
   * the advances went. Nothing is hidden that the caller is entitled to see.
   */
  const [advances, loans, staff] = await Promise.all([
    getStaffAdvances().catch(() => null),
    getStaffLoans().catch(() => null),
    getAllStaff().catch(() => null),
  ]);

  // Null means "the API refused to tell us", which is not the same as "there
  // are none" — the banner draws that distinction; the lists below just render
  // what came back.
  const listUnavailable = advances === null;
  const advanceRows = advances ?? [];
  const loanRows = loans ?? [];

  const staffOptions = (staff ?? [])
    .filter((s) => s.deletedAt === null && s.employmentStatus === "active")
    .map((s) => ({ id: s.id, label: `${s.employeeNumber} — ${s.name ?? s.employeeNumber}` }));

  return (
    <div className="space-y-6">
      <div>
        <h1>Staff Loans &amp; Advances</h1>
        <p className="text-sm text-muted-foreground">
          HR approves an advance; only Finance disburses it. Recovery then happens automatically through payroll deductions.
        </p>
      </div>

      <SectionNav items={hrNavFor(user)} />

      {listUnavailable && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Your role can disburse an approved advance but cannot read the staff book, so the queue below is empty — the
          API gates it behind <span className="font-medium">hr.view</span>. Ask HR for the advance to be disbursed, or
          have <span className="font-medium">hr.view</span> added to this role.
        </div>
      )}

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
          <CardTitle className="text-base">Advances ({advanceRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {advanceRows.length === 0 ? (
            <EmptyState title="No advances on record" />
          ) : (
            <ul className="space-y-2">
              {advanceRows.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <Link href={`/hr/staff/${a.staffProfileId}`} className="font-medium hover:underline">
                      {(a.staffName ?? a.staffProfileId)}
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
          <CardTitle className="text-base">Staff Loans ({loanRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loanRows.length === 0 ? (
            <EmptyState title="No staff loans" />
          ) : (
            <ul className="space-y-2">
              {loanRows.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <Link href={`/hr/staff/${l.staffProfileId}`} className="font-medium hover:underline">
                      {(l.staffName ?? l.staffProfileId)}
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
