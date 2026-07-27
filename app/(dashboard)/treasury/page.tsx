import { Banknote, Coins, Landmark, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRY_LINES, MOCK_CAPITAL_CONTRIBUTIONS } from "@/lib/mock-data/journal-entries";
import { MOCK_DIVIDENDS } from "@/lib/mock-data/reversals";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { SYSTEM_ACCOUNT_CODES } from "@/types/ledger";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";

export default async function TreasuryPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
  const byCode = (code: string) => trial.rows.find((r) => r.code === code)?.balance ?? 0;

  const bankBalance = round2(
    MOCK_BANK_ACCOUNTS.filter((b) => b.deletedAt === null).reduce(
      (s, b) => s + (trial.rows.find((r) => r.accountId === b.chartAccountId)?.balance ?? 0),
      0
    )
  );

  const income = trial.rows.filter((r) => r.type === "income").reduce((s, r) => s + r.balance, 0);
  const expense = trial.rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);

  const tiles = [
    { label: "Bank Balances", value: formatMoney(bankBalance), icon: Landmark },
    { label: "Capital", value: formatMoney(byCode(SYSTEM_ACCOUNT_CODES.CAPITAL)), icon: PiggyBank },
    { label: "Reserve", value: formatMoney(byCode(SYSTEM_ACCOUNT_CODES.RESERVE)), icon: Banknote },
    { label: "Distributable Profit", value: formatMoney(round2(income - expense)), icon: Coins },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>Treasury</h1>
        <p className="text-sm text-muted-foreground">Capital, bank positions, reserves, and profit distribution — all derived from the ledger.</p>
      </div>

      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capital Contributions ({MOCK_CAPITAL_CONTRIBUTIONS.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {MOCK_CAPITAL_CONTRIBUTIONS.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.contributorName}</p>
                    <p className="text-xs text-muted-foreground">{c.contributedAt}</p>
                  </div>
                  <span className="font-tabular">{formatMoney(c.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dividends ({MOCK_DIVIDENDS.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {MOCK_DIVIDENDS.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dividend has been distributed yet.</p>
            ) : (
              <ul className="space-y-2">
                {MOCK_DIVIDENDS.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{d.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(d.reinvestmentAmount)} reinvested · {formatMoney(d.shareholderAmount)} to shareholders
                      </p>
                    </div>
                    <span className="font-tabular">{formatMoney(d.totalProfit)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
