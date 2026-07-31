import { Coins, HandCoins, PiggyBank, Wallet } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { Money, PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoneyExact } from "@/lib/domain/money";
import { getStaffFund, getStaffLoans, getStaffAdvances } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

/**
 * HRM → Staff Fund.
 *
 * §12: *"Internal revolving fund ya wafanyakazi"* — built from a percentage of
 * every salary, lent out as advances and loans, and repaid back into itself.
 *
 * The balance is `7000 Staff Fund` read from the ledger rather than summed from
 * contributions, because the ledger is what actually happened: a contribution
 * that posted and an advance that went out are both in it.
 */
export default async function StaffFundPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const [fund, loans, advances] = await Promise.all([
    getStaffFund(),
    getStaffLoans({ status: "active" }),
    getStaffAdvances("disbursed"),
  ]);

  return (
    <>
      <PageHeader
        icon={PiggyBank}
        title="Staff Fund"
        description="The employees' own revolving fund — what has gone in, what is lent out, and to whom."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Staff Fund" }]}
      />
      <SectionNav items={hrNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Fund Balance"
          value={formatMoneyExact(fund.balance)}
          icon={PiggyBank}
          tone="accent"
          hint="Ledger balance of 7000 Staff Fund"
        />
        <StatCard
          label="Contributed"
          value={formatMoneyExact(fund.contributions)}
          icon={Coins}
          hint={`${fund.memberCount} member${fund.memberCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Lent Out"
          value={formatMoneyExact(fund.lentOut)}
          icon={HandCoins}
          hint="Advances and loans still owed"
        />
        <StatCard
          label="Advances Outstanding"
          value={formatMoneyExact(fund.advancesOutstanding)}
          icon={Wallet}
          hint={`${formatMoneyExact(fund.loansOutstanding)} in staff loans`}
        />
      </div>

      <SettingsCard
        title={`Lent Out (${loans.length + advances.length})`}
        description="Every advance and loan the fund is currently carrying."
        bodyClassName="p-0 sm:p-0"
      >
        <div className="overflow-x-auto">
          <table className="st-table w-full border-collapse">
            <thead>
              <tr>
                <th scope="col">Staff</th>
                <th scope="col">Kind</th>
                <th scope="col">Reference</th>
                <th scope="col" className="!text-right">Amount</th>
                <th scope="col" className="!text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {loans.length + advances.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-[var(--st-ink-faint)]">
                    The fund has nothing lent out.
                  </td>
                </tr>
              )}

              {loans.map((loan) => (
                <tr key={`loan-${loan.id}`}>
                  <td className="font-medium text-[var(--st-ink)]">
                    {loan.staffName ?? loan.staffProfileId}
                  </td>
                  <td className="text-[var(--st-ink-soft)]">Staff loan</td>
                  <td className="font-tabular text-[var(--st-ink-soft)]">{loan.reference}</td>
                  <td>
                    <Money>{formatMoneyExact(loan.amount)}</Money>
                  </td>
                  <td>
                    <Money strong>{formatMoneyExact(loan.outstanding)}</Money>
                  </td>
                </tr>
              ))}

              {advances.map((advance) => (
                <tr key={`adv-${advance.id}`}>
                  <td className="font-medium text-[var(--st-ink)]">
                    {advance.staffName ?? advance.staffProfileId}
                  </td>
                  <td className="text-[var(--st-ink-soft)]">Salary advance</td>
                  <td className="font-tabular text-[var(--st-ink-soft)]">—</td>
                  <td>
                    <Money>{formatMoneyExact(advance.amount)}</Money>
                  </td>
                  <td>
                    {/*
                      Principal less what payroll has recovered. An advance also
                      carries interest and a charge fee, and those return to the
                      fund rather than to company income (§12) — the Staff
                      Advance report shows the full repayable.
                    */}
                    <Money strong>{formatMoneyExact(advance.amount)}</Money>
                  </td>
                </tr>
              ))}

              <tr className="st-total-row">
                <td colSpan={4} className="font-semibold text-[var(--st-ink)]">
                  Total lent out
                </td>
                <td>
                  <Money strong>{formatMoneyExact(fund.lentOut)}</Money>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </>
  );
}
