import Link from "next/link";
import { Coins, PiggyBank, Plus, Users } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getTrialBalance } from "@/lib/api/ledger";
import { getCapitalContributions } from "@/lib/api/capital";
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

export default async function CapitalPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;
  const canManage = hasPermission(user, PERMISSIONS.TREASURY_MANAGE);

  /*
   * This page used to run entirely on fixtures, and — worse — carried two forms
   * that posted into the *mock* journal, a different book from the one /ledger
   * reads. A screen that looks like it records capital and actually records
   * nothing is the one thing a financial UI must not do, so both are gone:
   *
   *   - Capital contributions are a real endpoint now (the Capital module owns
   *     them), so the list below reads the same API that Capital → Add Capitals
   *     writes to, and recording is a link to that screen rather than a second,
   *     divergent form.
   *   - Dividend distribution has no endpoint at all. The panel stays, stating
   *     that plainly, instead of a form that would silently drop the entry.
   *
   * Distributable profit is real: it comes from the trial balance.
   */
  const [trial, capital] = await Promise.all([
    getTrialBalance(),
    getCapitalContributions().catch(() => null),
  ]);

  const income = trial.rows.filter((r) => r.type === "income").reduce((s, r) => s + r.balance, 0);
  const expense = trial.rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);
  const distributable = round2(income - expense);

  const contributions = capital?.contributions ?? [];

  return (
    <>
      <PageHeader
        icon={PiggyBank}
        title="Capital &amp; Dividends"
        description="Equity paid into the company, and the profit available to distribute. Both figures come from the ledger."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Capital & Dividends" }]}
        actions={
          canManage ? (
            <Link href="/capital/contributions" className="st-btn st-btn-primary">
              <Plus className="size-4" strokeWidth={1.9} aria-hidden />
              Record capital
            </Link>
          ) : undefined
        }
      />

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Shareholder capital"
          value={capital ? formatMoney(capital.totals.shareholderCapital) : "—"}
          icon={Users}
          hint={capital ? `${contributions.length} contribution${contributions.length === 1 ? "" : "s"}` : "Unavailable for this role"}
        />
        <StatCard
          label="Total company capital"
          value={capital ? formatMoney(capital.totals.companyCapital) : "—"}
          icon={PiggyBank}
          tone="accent"
        />
        <StatCard
          label="Distributable profit"
          value={formatMoney(distributable)}
          icon={Coins}
          hint="Income less expense, from the trial balance"
        />
      </div>

      <SettingsCard
        title={`Capital Contributions (${contributions.length})`}
        description="The equity register, read from the same endpoint Capital → Add Capitals writes to."
        bodyClassName="p-0 sm:p-0"
      >
        {contributions.length === 0 ? (
          <div className="px-5 pb-6 sm:px-6">
            <EmptyState
              icon={PiggyBank}
              title={capital === null ? "Capital register unavailable" : "No capital recorded"}
              description={
                capital === null
                  ? "This role cannot read the capital register, or the request failed. Distributable profit above is unaffected — it comes from the ledger."
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
                  <th scope="col" className="!text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => (
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
                <tr className="st-total-row">
                  <td colSpan={4} className="font-semibold text-[var(--st-ink)]">
                    Total company capital
                  </td>
                  <td>
                    <Money strong>{formatMoney(capital?.totals.companyCapital ?? 0)}</Money>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        title="Dividend History"
        description="Profit distribution — 70% reinvested, 30% to shareholders."
      >
        <EmptyState
          icon={Coins}
          title="Not available yet"
          description="No dividend endpoint exists on the API, so there is nothing to read and nothing that could be recorded here. Profit stays in the Profit Account until one is declared; the distributable figure above is live."
          className="border-none"
        />
      </SettingsCard>
    </>
  );
}
