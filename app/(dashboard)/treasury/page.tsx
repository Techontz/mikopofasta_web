import Link from "next/link";
import { Banknote, Coins, Landmark, PiggyBank, Users } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { classifyAccount, getLedgerAccounts, getTrialBalance } from "@/lib/api/ledger";
import { getCapitalContributions } from "@/lib/api/capital";
import { SYSTEM_ACCOUNT_CODES } from "@/types/ledger";
import { Money, PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";

/** Pinned so the server and the client agree (React #418). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function TreasuryPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * Every figure on this page is derived from the ledger, which is what the
   * original page claimed and now actually does. There is no treasury endpoint
   * — no bank-account registry — so a bank account is identified the way the
   * data model defines one: a dynamic (non-system) account with no branch, as
   * opposed to a branch till, which has one. See classifyAccount.
   *
   * Capital contributions used to be a mock list here. They are a real API now
   * (the Capital module owns them), so this reads the same endpoint that screen
   * does rather than a fixture that could disagree with it.
   */
  const [trial, accounts, capital] = await Promise.all([
    getTrialBalance(),
    getLedgerAccounts(),
    getCapitalContributions().catch(() => null),
  ]);
  const byCode = (code: string) => trial.rows.find((r) => r.code === code)?.balance ?? 0;

  const bankBalance = round2(
    accounts.filter((a) => classifyAccount(a) === "bank").reduce((s, a) => s + a.balance, 0)
  );

  const income = trial.rows.filter((r) => r.type === "income").reduce((s, r) => s + r.balance, 0);
  const expense = trial.rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);

  const tiles = [
    { label: "Bank balances", value: formatMoney(bankBalance), icon: Landmark, tone: "accent" as const },
    { label: "Capital", value: formatMoney(byCode(SYSTEM_ACCOUNT_CODES.CAPITAL)), icon: PiggyBank },
    { label: "Reserve", value: formatMoney(byCode(SYSTEM_ACCOUNT_CODES.RESERVE)), icon: Banknote },
    { label: "Distributable profit", value: formatMoney(round2(income - expense)), icon: Coins },
  ];

  // Newest first, and only a handful — the Capital module owns the full list.
  const recent = (capital?.contributions ?? []).slice(0, 6);

  return (
    <>
      <PageHeader
        icon={Landmark}
        title="Bank"
        description="Cash positions, capital and reserves — every figure derived from the ledger rather than held separately."
        breadcrumb={[{ label: "Bank" }]}
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <StatCard key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} tone={tile.tone} />
        ))}
      </div>

      <SettingsCard
        title="Recent Capital Contributions"
        description="The latest equity paid in. The Capital module holds the full register."
        actions={
          <Link href="/capital/contributions" className="st-btn st-btn-secondary">
            View all
          </Link>
        }
        bodyClassName="p-0 sm:p-0"
      >
        {recent.length === 0 ? (
          <div className="px-5 pb-6 sm:px-6">
            <EmptyState
              icon={Users}
              title={capital === null ? "Capital contributions unavailable" : "No capital contributed yet"}
              description={
                capital === null
                  ? "This role cannot read the capital register, or the request failed. The figures above are unaffected — they come from the ledger."
                  : "Record the first contribution from Capital → Add Capitals."
              }
              className="border-none"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col">Shareholder</th>
                  <th scope="col">Method</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="!text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-[var(--st-ink)]">{c.shareholderName}</td>
                    <td className="text-[var(--st-ink-soft)]">{c.payMethodLabel}</td>
                    <td className="font-tabular text-[var(--st-ink-soft)]">
                      {c.receiptNo ?? c.chequeNo ?? <span className="text-[var(--st-ink-faint)]">—</span>}
                    </td>
                    <td className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
                      {c.createdAt ? DATE.format(new Date(c.createdAt)) : "—"}
                    </td>
                    <td>
                      <Money strong>{formatMoney(c.amount)}</Money>
                    </td>
                  </tr>
                ))}
                {capital && (
                  <tr className="st-total-row">
                    <td colSpan={4} className="font-semibold text-[var(--st-ink)]">
                      Total company capital
                    </td>
                    <td>
                      <Money strong>{formatMoney(capital.totals.companyCapital)}</Money>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      {/*
        Dividends previously rendered a mock list here. There is no dividend
        endpoint, and invented figures on a treasury screen are worse than an
        absent panel — an operator cannot tell a fixture from a balance. The
        slot is kept and stated honestly instead.
      */}
      <SettingsCard title="Dividends" description="Profit distribution — 70% reinvested, 30% to shareholders.">
        <EmptyState
          icon={Coins}
          title="Not available yet"
          description="No dividend endpoint exists on the API, so there is nothing to read. Distributable profit is shown in the tile above, straight from the trial balance."
          className="border-none"
        />
      </SettingsCard>
    </>
  );
}
