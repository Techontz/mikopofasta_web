import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES, MOCK_CAPITAL_CONTRIBUTIONS } from "@/lib/mock-data/journal-entries";
import { MOCK_DIVIDENDS } from "@/lib/mock-data/reversals";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { CapitalContributionForm, DividendForm } from "@/features/ledger/treasury-forms";

export default async function CapitalPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;
  const canManage = hasPermission(user, PERMISSIONS.TREASURY_MANAGE);

  /*
   * STILL ON MOCK DATA, deliberately. Capital injection and dividend
   * distribution have no API — the backend exposes no treasury routes at all,
   * though `treasury.manage` exists as a permission. This page posts to the
   * mock journal, which is a different book from the one /ledger reads.
   * See features/ledger/treasury-actions.ts.
   */
  const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
  const income = trial.rows.filter((r) => r.type === "income").reduce((s, r) => s + r.balance, 0);
  const expense = trial.rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);
  const distributable = round2(income - expense);

  const entryNumberOf = (id: string) => MOCK_JOURNAL_ENTRIES.find((e) => e.id === id)?.entryNumber ?? "—";
  const bankNameOf = (id: string) => MOCK_BANK_ACCOUNTS.find((b) => b.id === id)?.bankName ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h1>Capital &amp; Dividends</h1>
        <p className="text-sm text-muted-foreground">
          Capital injections and profit distribution. Every action posts to the ledger — nothing is recorded outside it.
        </p>
      </div>

      <SectionNav items={treasuryNavFor(user)} />

      {canManage && (
        <div className="space-y-4">
          <CapitalContributionForm
            banks={MOCK_BANK_ACCOUNTS.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, label: `${b.bankName} — ${b.accountNumber}` }))}
          />
          <DividendForm distributableProfit={distributable} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capital Contributions ({MOCK_CAPITAL_CONTRIBUTIONS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_CAPITAL_CONTRIBUTIONS.length === 0 ? (
            <EmptyState title="No capital recorded" description="Record the first contribution above." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Received into</TableHead>
                    <TableHead>Journal entry</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CAPITAL_CONTRIBUTIONS.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.contributorName}</TableCell>
                      <TableCell className="whitespace-nowrap">{c.contributedAt}</TableCell>
                      <TableCell>{bankNameOf(c.bankAccountId)}</TableCell>
                      <TableCell>
                        <Link href={`/ledger/entries/${c.journalEntryId}`} className="font-tabular hover:underline">
                          {entryNumberOf(c.journalEntryId)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-tabular text-right font-medium">{formatMoney(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dividend History ({MOCK_DIVIDENDS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_DIVIDENDS.length === 0 ? (
            <EmptyState title="No dividends distributed" description="Profit stays in the Profit Account until a dividend is declared." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Journal entry</TableHead>
                    <TableHead className="text-right">Total profit</TableHead>
                    <TableHead className="text-right">Reinvested (70%)</TableHead>
                    <TableHead className="text-right">Shareholders (30%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DIVIDENDS.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.period}</TableCell>
                      <TableCell>
                        <Link href={`/ledger/entries/${d.journalEntryId}`} className="font-tabular hover:underline">
                          {entryNumberOf(d.journalEntryId)}
                        </Link>
                      </TableCell>
                      <TableCell className="font-tabular text-right">{formatMoney(d.totalProfit)}</TableCell>
                      <TableCell className="font-tabular text-right">{formatMoney(d.reinvestmentAmount)}</TableCell>
                      <TableCell className="font-tabular text-right">{formatMoney(d.shareholderAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
