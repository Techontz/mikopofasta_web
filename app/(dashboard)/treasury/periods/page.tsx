import { CalendarCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney } from "@/lib/domain/money";
import { getAccountingPeriods } from "@/lib/api/accounting";
import { getReserveSetting } from "@/lib/api/loan-charges";
import { PeriodCloseDialog } from "@/features/accounting/period-close-panel";
import { PeriodHistoryTable } from "@/features/accounting/period-history-table";
import { formatPeriod } from "@/features/accounting/format";

/**
 * Month-end close — Decision Register D1.
 *
 * Sits inside Bank rather than in a module of its own: closing the books is
 * treasury work, and the reserve it appropriates is read two tabs away.
 */
export default async function AccountingPeriodsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const canClose = hasPermission(user, PERMISSIONS.ACCOUNTING_PERIOD_CLOSE);

  /*
   * The reserve rate is read here rather than inside the dialog so the page
   * states the rate a close would apply even to a reader who never opens it.
   * Both degrade to a usable screen if the other request fails.
   */
  const [periods, reserveSetting] = await Promise.all([
    getAccountingPeriods().catch(() => []),
    getReserveSetting().catch(() => ({ percentage: 0 })),
  ]);

  const latest = periods[0] ?? null;
  const totalReserve = periods.reduce((sum, p) => sum + p.reserveAppropriated, 0);
  const totalProfit = periods.reduce((sum, p) => sum + p.realisedProfit, 0);

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        title="Accounting Periods"
        description="Each month's profit is recognised once, at the close, and its reserve appropriated from what the period earned."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Accounting Periods" }]}
        actions={canClose ? <PeriodCloseDialog reservePercentage={reserveSetting.percentage} /> : undefined}
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Last closed period"
          value={latest ? formatPeriod(latest.period) : "None yet"}
          icon={CalendarCheck}
          tone="accent"
        />
        <StatCard label="Periods closed" value={String(periods.length)} icon={CalendarCheck} />
        <StatCard label="Profit recognised" value={formatMoney(totalProfit)} icon={CalendarCheck} />
        <StatCard label="Reserve appropriated" value={formatMoney(totalReserve)} icon={CalendarCheck} />
      </div>

      <SettingsCard
        title="Period History"
        description={
          canClose
            ? "Every close, newest first, with the figures it was closed on. There is no reopen — a mistake is corrected with a reversal in a later period."
            : "Every close, newest first. Closing a period needs the accounting.period_close permission."
        }
        bodyClassName="p-0 sm:p-0"
      >
        <PeriodHistoryTable periods={periods} />
      </SettingsCard>
    </>
  );
}
