import { CircleDollarSign, Clock, ReceiptText, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoneyExact, round2 } from "@/lib/domain/money";
import { payrollTotals } from "@/types/bank";
import { MOCK_PAYROLL_ROWS, PAYROLL_PERIODS } from "@/lib/mock-data/bank";
import { PayrollPanel } from "@/features/bank/payroll-panel";
import { formatPeriod } from "@/features/bank/shared";

export default async function BankPayrollPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * The tiles describe the current period — the one the table opens on — so the
   * headline figures and the list underneath answer the same question. Totals
   * come from payrollTotals rather than a stored net, so they cannot drift from
   * the rows they summarise.
   */
  const current = MOCK_PAYROLL_ROWS.filter((r) => r.period === PAYROLL_PERIODS[0]);
  const total = round2(current.reduce((s, r) => s + payrollTotals(r).net, 0));
  const paid = current.filter((r) => r.status === "paid");
  const pending = current.filter((r) => r.status === "pending");

  return (
    <>
      <PageHeader
        icon={ReceiptText}
        title="Payroll"
        description={`Staff salaries for ${formatPeriod(PAYROLL_PERIODS[0])}. Open a row for the full payslip and its payment history.`}
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Payroll" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Employees"
          value={current.length}
          icon={Users}
          tone="accent"
          hint={formatPeriod(PAYROLL_PERIODS[0])}
        />
        <StatCard label="Total Payroll" value={formatMoneyExact(total)} icon={CircleDollarSign} hint="Net across all staff" />
        <StatCard
          label="Paid"
          value={paid.length}
          icon={ReceiptText}
          hint={paid.length > 0 ? formatMoneyExact(round2(paid.reduce((s, r) => s + payrollTotals(r).net, 0))) : "Nothing paid yet"}
        />
        <StatCard
          label="Pending"
          value={pending.length}
          icon={Clock}
          hint={pending.length > 0 ? formatMoneyExact(round2(pending.reduce((s, r) => s + payrollTotals(r).net, 0))) : "Nothing outstanding"}
        />
      </div>

      <PayrollPanel rows={MOCK_PAYROLL_ROWS} />
    </>
  );
}
