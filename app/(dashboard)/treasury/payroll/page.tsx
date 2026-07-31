import { CircleDollarSign, Clock, ReceiptText, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoneyExact } from "@/lib/domain/money";
import { getPayslips } from "@/lib/api/hr";
import { PayrollPanel } from "@/features/bank/payroll-panel";
import { formatPeriod } from "@/features/bank/shared";

export default async function BankPayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * One period at a time. Absent, the API resolves the latest — the one this
   * screen opens on — so the tiles and the table underneath always answer the
   * same question.
   *
   * Totals come from the same response as the rows rather than being summed
   * again here, so a headline figure cannot drift from the list beneath it.
   */
  const { period } = await searchParams;
  const { payslips, period: shown, periods, totalNet } = await getPayslips({ period });

  const paid = payslips.filter((p) => p.status === "paid");
  const pending = payslips.filter((p) => p.status !== "paid");
  const sum = (rows: typeof payslips) => rows.reduce((s, r) => s + r.netSalary, 0);

  return (
    <>
      <PageHeader
        icon={ReceiptText}
        title="Payroll"
        description={
          shown
            ? `Staff salaries for ${formatPeriod(shown)}. Open a row for the full payslip and its payment history.`
            : "No payroll has been generated yet."
        }
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Payroll" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Employees"
          value={payslips.length}
          icon={Users}
          tone="accent"
          hint={shown ? formatPeriod(shown) : "—"}
        />
        <StatCard
          label="Total Payroll"
          value={formatMoneyExact(totalNet)}
          icon={CircleDollarSign}
          hint="Net across all staff"
        />
        <StatCard
          label="Paid"
          value={paid.length}
          icon={ReceiptText}
          hint={paid.length > 0 ? formatMoneyExact(sum(paid)) : "Nothing paid yet"}
        />
        <StatCard
          label="Pending"
          value={pending.length}
          icon={Clock}
          hint={pending.length > 0 ? formatMoneyExact(sum(pending)) : "Nothing outstanding"}
        />
      </div>

      <PayrollPanel payslips={payslips} period={shown} periods={periods} />
    </>
  );
}
