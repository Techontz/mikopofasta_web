import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, MinusCircle, PlusCircle, ReceiptText, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { Money, PageHeader, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoneyExact } from "@/lib/domain/money";
import { payrollTotals } from "@/types/bank";
import { MOCK_PAYROLL_ROWS } from "@/lib/mock-data/bank";
import { FactGrid, PAYROLL_TONE, formatDate, formatPeriod, type Fact } from "@/features/bank/shared";
import { PayslipActions } from "@/features/bank/payslip-actions";

export default async function PayrollDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const row = MOCK_PAYROLL_ROWS.find((r) => r.id === id);
  if (!row) notFound();

  const { allowancesTotal, deductionsTotal, gross, net } = payrollTotals(row);

  const employee: Fact[] = [
    { label: "Staff no", value: row.staffNo, mono: true },
    { label: "Department", value: row.department },
    { label: "Branch", value: row.branch },
    { label: "Phone", value: row.phone, mono: true },
    { label: "Bank", value: row.bankName },
    { label: "Account no", value: row.accountNumber, mono: true },
    { label: "Period", value: formatPeriod(row.period) },
    { label: "Paid on", value: formatDate(row.paidOn), mono: true },
  ];

  return (
    <>
      <BreadcrumbLabel label={row.employee} />

      <PageHeader
        icon={ReceiptText}
        title={row.employee}
        description={`${row.department} · ${row.branch} · ${formatPeriod(row.period)}`}
        breadcrumb={[
          { label: "Bank", href: "/treasury" },
          { label: "Payroll", href: "/treasury/payroll" },
          { label: row.employee },
        ]}
        actions={
          <>
            <StatusBadge tone={PAYROLL_TONE[row.status]} className="capitalize">
              {row.status}
            </StatusBadge>
            <PayslipActions label={`${row.employee} payslip`} />
            <Link href="/treasury/payroll" className="st-btn st-btn-secondary st-print-hide">
              <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
              Back to Payroll
            </Link>
          </>
        }
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Basic Salary" value={formatMoneyExact(row.salary)} icon={Banknote} />
        <StatCard label="Allowances" value={allowancesTotal === 0 ? "—" : `+${formatMoneyExact(allowancesTotal)}`} icon={PlusCircle} />
        <StatCard label="Deductions" value={deductionsTotal === 0 ? "—" : `−${formatMoneyExact(deductionsTotal)}`} icon={MinusCircle} />
        <StatCard label="Net Pay" value={formatMoneyExact(net)} icon={Wallet} tone="accent" hint="Gross less deductions" />
      </div>

      <SettingsCard title="Employee Information" description="As held on the staff record.">
        <FactGrid facts={employee} columns={4} />
      </SettingsCard>

      <SettingsCard
        title="Salary Breakdown"
        description="Every line that makes up this payslip, and how they arrive at the net."
        bodyClassName="p-0 sm:p-0"
      >
        <div className="overflow-x-auto">
          <table className="st-table w-full border-collapse">
            <thead>
              <tr>
                <th scope="col">Line</th>
                <th scope="col">Type</th>
                <th scope="col" className="!text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium text-[var(--st-ink)]">Basic salary</td>
                <td>
                  <StatusBadge tone="neutral" dot={false}>
                    Earning
                  </StatusBadge>
                </td>
                <td>
                  <Money>{formatMoneyExact(row.salary)}</Money>
                </td>
              </tr>

              {row.allowances.map((a) => (
                <tr key={`allow-${a.label}`}>
                  <td className="text-[var(--st-ink)]">{a.label}</td>
                  <td>
                    <StatusBadge tone="info" dot={false}>
                      Allowance
                    </StatusBadge>
                  </td>
                  <td>
                    <Money>+{formatMoneyExact(a.amount)}</Money>
                  </td>
                </tr>
              ))}

              <tr className="st-total-row">
                <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                  Gross pay
                </td>
                <td>
                  <Money strong>{formatMoneyExact(gross)}</Money>
                </td>
              </tr>

              {row.deductions.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-[var(--st-ink-faint)]">
                    No deductions this period
                  </td>
                  <td>
                    <Money muted>—</Money>
                  </td>
                </tr>
              ) : (
                row.deductions.map((d) => (
                  <tr key={`ded-${d.label}`}>
                    <td className="text-[var(--st-ink)]">{d.label}</td>
                    <td>
                      <StatusBadge tone="warning" dot={false}>
                        Deduction
                      </StatusBadge>
                    </td>
                    <td>
                      <Money>−{formatMoneyExact(d.amount)}</Money>
                    </td>
                  </tr>
                ))
              )}

              <tr className="st-total-row">
                <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                  Net pay
                </td>
                <td>
                  <Money strong>{formatMoneyExact(net)}</Money>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SettingsCard>

      <SettingsCard
        title={`Payment History (${row.payments.length})`}
        description="What has actually been paid to this employee, newest first."
        bodyClassName={row.payments.length === 0 ? undefined : "p-0 sm:p-0"}
      >
        {row.payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments yet"
            description="This payslip has not been paid, so there is nothing in the history."
            className="border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Paid On</th>
                  <th scope="col" className="!text-right">
                    Net Salary
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {row.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-[var(--st-ink)]">{formatPeriod(p.period)}</td>
                    <td className="font-tabular text-[var(--st-ink-soft)]">{p.reference}</td>
                    <td className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
                      {formatDate(p.paidOn)}
                    </td>
                    <td>
                      <Money strong>{formatMoneyExact(p.netSalary)}</Money>
                    </td>
                    <td>
                      <StatusBadge tone={PAYROLL_TONE[p.status]} className="capitalize">
                        {p.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                <tr className="st-total-row">
                  <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                    Total paid
                  </td>
                  <td>
                    <Money strong>
                      {formatMoneyExact(row.payments.reduce((s, p) => s + p.netSalary, 0))}
                    </Money>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>
    </>
  );
}
