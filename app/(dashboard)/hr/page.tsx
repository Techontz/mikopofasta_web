import Link from "next/link";
import { AlertTriangle, Banknote, HandCoins, TrendingUp, UsersRound } from "lucide-react";
import { PageHeader, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getAllPayrollRuns, getAllStaff, getCommission, getStaffAdvances, getStaffLoans } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

/**
 * HRM → Overview.
 *
 * PRESENTATION ONLY. All five API calls, the active-staff filter, the salary
 * total, the open-advance statuses, the pool total and §11's blocked-pool rule
 * are exactly as they were. The tiles are StatCard, the panels SettingsCard and
 * the pills StatusBadge — the same components the Menu modules use.
 */
export default async function HrPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const [staff, runs, commission, advances, loans] = await Promise.all([
    getAllStaff(),
    getAllPayrollRuns(),
    getCommission(),
    getStaffAdvances(),
    getStaffLoans(),
  ]);

  const active = staff.filter((s) => s.deletedAt === null && s.employmentStatus === "active");
  const monthlySalary = round2(active.reduce((s, p) => s + p.baseSalary, 0));
  const openAdvances = advances.filter((a) => ["requested", "approved", "disbursed"].includes(a.status));
  const poolTotal = commission.totalPool;

  // §11's hard rule, as the API states it: a branch that made a loss pays no
  // commission until the loss is offset.
  const blockedPools = commission.pools.filter((p) => !p.distributable);

  return (
    <>
      <PageHeader
        icon={UsersRound}
        title="HR, Payroll & Commission"
        description="HR generates payroll; Finance finalizes and pays it. Commission follows branch performance, never individual sales."
        breadcrumb={[{ label: "HRM" }]}
      />

      <SectionNav items={hrNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Staff" value={String(active.length)} icon={UsersRound} tone="accent" />
        <StatCard label="Monthly Base Salary" value={formatMoney(monthlySalary)} icon={Banknote} />
        <StatCard label="Commission Pools" value={formatMoney(poolTotal)} icon={TrendingUp} />
        <StatCard label="Open Advances" value={String(openAdvances.length)} icon={HandCoins} />
      </div>

      {blockedPools.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-[var(--st-radius-sm)] border px-4 py-3 text-[13px]"
          style={{
            borderColor: "color-mix(in oklab, var(--st-warning, #fab219) 40%, transparent)",
            background: "color-mix(in oklab, var(--st-warning, #fab219) 12%, transparent)",
            color: "var(--st-ink)",
          }}
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            {blockedPools.length} branch pool{blockedPools.length === 1 ? "" : "s"} cannot pay
            commission — the branch loss must be offset first.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsCard title="Payroll Runs">
          <ul className="space-y-2">
            {runs.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <Link
                    href={`/hr/payroll/${run.period}`}
                    className="font-medium text-[var(--st-ink)] hover:underline"
                  >
                    {run.period}
                  </Link>
                  <p className="mt-0.5 text-[12px] text-[var(--st-ink-soft)]">
                    {run.lineCount} staff · {formatMoney(run.netTotal)} net
                  </p>
                </div>
                <StatusBadge tone="neutral" className="capitalize">
                  {run.status}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard title="Staff Loans & Advances">
          <ul className="space-y-2">
            {loans.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <p className="font-medium text-[var(--st-ink)]">{l.staffName ?? l.staffProfileId}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--st-ink-soft)]">
                    Staff loan · {l.disbursedAt}
                  </p>
                </div>
                <span className="font-tabular text-[var(--st-ink)]">{formatMoney(l.amount)}</span>
              </li>
            ))}
            {openAdvances.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <p className="font-medium text-[var(--st-ink)]">{a.staffName ?? a.staffProfileId}</p>
                  <p className="mt-0.5 text-[12px] capitalize text-[var(--st-ink-soft)]">
                    Advance · {a.status}
                  </p>
                </div>
                <span className="font-tabular text-[var(--st-ink)]">{formatMoney(a.amount)}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>
      </div>
    </>
  );
}
