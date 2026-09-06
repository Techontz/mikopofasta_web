import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { Money, PageHeader, SettingsCard, StatusBadge, type StatusTone } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, ROLE_LABELS } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { getAllPayrollRuns, getStaffMember } from "@/lib/api/hr";
import { EmploymentStatusControl } from "@/features/hr/employment-status-control";
import { getZones } from "@/lib/api/organization";
import { ApiError } from "@/lib/api/errors";

/**
 * HRM → a staff record.
 *
 * PRESENTATION ONLY. The single `show` request that carries loans, advances and
 * performance in its meta; the payroll-line filtering; the soft-failing zone
 * lookup; the 404-on-403 rule; the derived initials — all untouched. Cards,
 * badges and figures are now the Menu module's.
 */

/** Employment status and rating → the app's own badge tones. */
const EMPLOYMENT_TONE: Record<string, StatusTone> = {
  active: "active",
  suspended: "warning",
  terminated: "danger",
};

const RATING_TONE: Record<string, StatusTone> = {
  A: "active",
  B: "info",
  C: "warning",
  D: "danger",
};

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;
  const canManage = hasPermission(user, PERMISSIONS.HR_MANAGE);

  // `show` carries this employee's loans, advances and performance in its
  // meta, so the profile is one request rather than four.
  let detail;
  try {
    detail = await getStaffMember(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }

  const { staff, loans, advances, performance } = detail;

  // Payroll history for this employee: the runs index eager-loads its lines,
  // so the employee's payslips are filtered out of them rather than fetched
  // per run. Zones are a separate lookup — the staff resource carries only the
  // id — and it fails soft.
  const [runs, zones] = await Promise.all([getAllPayrollRuns(), getZones().catch(() => [])]);
  const runById = new Map(runs.map((r) => [r.id, r]));
  const lines = runs.flatMap((r) => r.lines).filter((l) => l.staffProfileId === staff.id);

  const zone = staff.zoneId ? zones.find((z) => z.id === staff.zoneId) : undefined;
  const bank = staff.bankDetails;
  const name = staff.name ?? staff.employeeNumber;
  // The staff resource carries the employee's name but not the avatar initials
  // the user record computes, so they are derived from the name here.
  const initials =
    name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "—";

  return (
    <>
      <BreadcrumbLabel label={name} />
      <PageHeader
        icon={UserRound}
        title={name}
        description={staff.role ? (ROLE_LABELS[staff.role] ?? staff.role) : "—"}
        breadcrumb={[
          { label: "HRM", href: "/hr" },
          { label: "All active staff", href: "/hr/staff" },
          { label: staff.employeeNumber },
        ]}
        actions={
          <Link href="/hr/staff" className="st-btn st-btn-secondary">
            <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
            Back to Staff
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SettingsCard className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              aria-hidden
              className="flex size-16 items-center justify-center rounded-full text-[18px] font-semibold"
              style={{
                background: "var(--st-accent-soft)",
                color: "var(--st-accent)",
                border: "1px solid var(--st-accent-line)",
              }}
            >
              {initials}
            </span>
            <div>
              <p className="font-semibold text-[var(--st-ink)]">{name}</p>
              <p className="mt-0.5 text-[14px] text-[var(--st-ink-soft)]">
                {staff.role ? (ROLE_LABELS[staff.role] ?? staff.role) : "—"}
              </p>
            </div>
            <StatusBadge
              tone={EMPLOYMENT_TONE[staff.employmentStatus] ?? "neutral"}
              className="capitalize"
            >
              {staff.employmentStatus}
            </StatusBadge>
          </div>

          {/* Only hr.manage may change it — hr.view can read the badge above
              and nothing else, which is the same split the API enforces. */}
          {canManage && (
            <div
              className="mt-4 w-full border-t pt-4"
              style={{ borderColor: "var(--st-line)" }}
            >
              <EmploymentStatusControl staffId={staff.id} current={staff.employmentStatus} />
            </div>
          )}
        </SettingsCard>

        <SettingsCard title="Employment" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact label="Employee number">{staff.employeeNumber}</Fact>
            <Fact label="Hired">{staff.hiredAt}</Fact>
            <Fact label="Base salary">{formatMoney(staff.baseSalary)}</Fact>
            <Fact label="Commission eligible">{staff.commissionEligible ? "Yes" : "No"}</Fact>
            <Fact label="Branch">{staff.branchName ?? "—"}</Fact>
            <Fact label="Zone">{zone?.name ?? "—"}</Fact>
            <Fact label="Payment method">
              <span className="capitalize">{staff.paymentMethod}</span>
            </Fact>
            <Fact label="Bank">{bank ? `${bank.bankName} — ${bank.accountNumber}` : "—"}</Fact>
          </div>
        </SettingsCard>
      </div>

      <SettingsCard
        title={`Payslip History (${lines.length})`}
        bodyClassName={lines.length === 0 ? undefined : "pt-0 sm:pt-0"}
      >
        {lines.length === 0 ? (
          <EmptyState
            title="No payslips yet"
            description="Payslips appear once a payroll run including this employee is generated."
          />
        ) : (
          <div className="st-card overflow-x-auto">
            <table className="st-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Period</th>
                  <th className="text-right">Base</th>
                  <th className="text-right">Commission</th>
                  <th className="text-right">Allowances</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const run = runById.get(l.payrollRunId);
                  return (
                    <tr key={l.id}>
                      <td>
                        {run ? (
                          <Link
                            href={`/hr/payroll/${run.period}`}
                            className="font-medium text-[var(--st-ink)] hover:underline"
                          >
                            {run.period}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Money>{formatMoney(l.baseSalary)}</Money>
                      </td>
                      <td>
                        <Money muted={l.commissionAmount <= 0}>
                          {l.commissionAmount > 0 ? formatMoney(l.commissionAmount) : "—"}
                        </Money>
                      </td>
                      <td>
                        <Money>{formatMoney(l.allowancesTotal)}</Money>
                      </td>
                      <td>
                        <Money>−{formatMoney(l.deductionsTotal)}</Money>
                      </td>
                      <td>
                        <Money strong>{formatMoney(l.netSalary)}</Money>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard title="Loans & Advances">
          {loans.length === 0 && advances.length === 0 ? (
            <EmptyState title="None on record" />
          ) : (
            <ul className="space-y-2">
              {loans.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[14px]"
                  style={{ borderColor: "var(--st-line-strong)" }}
                >
                  <div>
                    <p className="font-medium text-[var(--st-ink)]">Staff loan</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--st-ink-soft)]">
                      Disbursed {l.disbursedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular text-[var(--st-ink)]">{formatMoney(l.amount)}</span>
                    <StatusBadge tone="neutral" className="capitalize">
                      {l.status}
                    </StatusBadge>
                  </div>
                </li>
              ))}
              {advances.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[14px]"
                  style={{ borderColor: "var(--st-line-strong)" }}
                >
                  <div>
                    <p className="font-medium text-[var(--st-ink)]">Salary advance</p>
                    <p className="mt-0.5 text-[12.5px] text-[var(--st-ink-soft)]">
                      Requested {new Date(a.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular text-[var(--st-ink)]">{formatMoney(a.amount)}</span>
                    <StatusBadge tone="neutral" className="capitalize">
                      {a.status}
                    </StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>

        <SettingsCard title="Performance">
          {performance.length === 0 ? (
            <EmptyState title="No performance records" />
          ) : (
            <ul className="space-y-2">
              {performance.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[var(--st-radius-sm)] border p-3 text-[14px]"
                  style={{ borderColor: "var(--st-line-strong)" }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[var(--st-ink)]">{p.period}</p>
                    <StatusBadge tone={p.rating ? (RATING_TONE[p.rating] ?? "neutral") : "neutral"}>
                      {p.rating ?? "—"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[12.5px] text-[var(--st-ink-soft)]">
                    {Object.entries(p.achieved)
                      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}/${p.targets[k] ?? "—"}`)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SettingsCard>
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--st-ink-faint)]">
        {label}
      </p>
      <p className="text-[14px] font-medium text-[var(--st-ink)]">{children}</p>
    </div>
  );
}
