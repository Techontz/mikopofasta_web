import Link from "next/link";
import { AlertTriangle, HandCoins } from "lucide-react";
import { PageHeader, SettingsCard, StatusBadge, type StatusTone } from "@/components/settings";
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

/**
 * HRM → Salary Advanced.
 *
 * PRESENTATION ONLY. Every call still fails soft, the permission split between
 * HR (approve) and Finance (disburse) is untouched, the banner still explains
 * the 403 rather than showing Finance a blank queue, and both decision buttons
 * keep their exact props.
 */

/** Advance status → the app's badge tone, replacing hand-written class strings. */
const STATUS_TONE: Record<string, StatusTone> = {
  requested: "warning",
  approved: "info",
  disbursed: "active",
  recovered: "neutral",
  rejected: "danger",
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
    <>
      <PageHeader
        icon={HandCoins}
        title="Staff Loans & Advances"
        description="HR approves an advance; only Finance disburses it. Recovery then happens automatically through payroll deductions."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Salary Advanced" }]}
      />

      <SectionNav items={hrNavFor(user)} />

      {listUnavailable && (
        <div
          className="flex items-start gap-2 rounded-[var(--st-radius-sm)] border px-4 py-3 text-[13px]"
          style={{
            borderColor: "color-mix(in oklab, var(--st-warning, #fab219) 40%, transparent)",
            background: "color-mix(in oklab, var(--st-warning, #fab219) 12%, transparent)",
            color: "var(--st-ink)",
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Your role can disburse an approved advance but cannot read the staff book, so the queue
            below is empty — the API gates it behind{" "}
            <span className="font-medium">hr.view</span>. Ask HR for the advance to be disbursed, or
            have <span className="font-medium">hr.view</span> added to this role.
          </span>
        </div>
      )}

      {canManage && (
        <SettingsCard title="Request an Advance">
          <RequestAdvanceForm staff={staffOptions} />
        </SettingsCard>
      )}

      <SettingsCard title={`Advances (${advanceRows.length})`}>
        {advanceRows.length === 0 ? (
          <EmptyState title="No advances on record" />
        ) : (
          <ul className="space-y-2">
            {advanceRows.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <Link
                    href={`/hr/staff/${a.staffProfileId}`}
                    className="font-medium text-[var(--st-ink)] hover:underline"
                  >
                    {a.staffName ?? a.staffProfileId}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-[var(--st-ink-soft)]">
                    Requested {new Date(a.requestedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-tabular text-[var(--st-ink)]">{formatMoney(a.amount)}</span>
                  <StatusBadge tone={STATUS_TONE[a.status] ?? "neutral"} className="capitalize">
                    {a.status}
                  </StatusBadge>
                  <AdvanceDecisionButtons
                    advanceId={a.id}
                    status={a.status}
                    canApprove={canManage}
                    canDisburse={canDisburse}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard title={`Staff Loans (${loanRows.length})`}>
        {loanRows.length === 0 ? (
          <EmptyState title="No staff loans" />
        ) : (
          <ul className="space-y-2">
            {loanRows.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <Link
                    href={`/hr/staff/${l.staffProfileId}`}
                    className="font-medium text-[var(--st-ink)] hover:underline"
                  >
                    {l.staffName ?? l.staffProfileId}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-[var(--st-ink-soft)]">Disbursed {l.disbursedAt}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-tabular text-[var(--st-ink)]">{formatMoney(l.amount)}</span>
                  <StatusBadge tone="neutral" className="capitalize">
                    {l.status}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </>
  );
}
