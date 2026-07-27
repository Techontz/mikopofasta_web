import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS, tellerCashAccountId } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";

export default async function BankAccountsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
  const balanceOf = (accountId: string) => trial.rows.find((r) => r.accountId === accountId)?.balance ?? 0;

  const banks = MOCK_BANK_ACCOUNTS.filter((b) => b.deletedAt === null);
  const bankTotal = round2(banks.reduce((s, b) => s + balanceOf(b.chartAccountId), 0));

  // Every branch gets an auto-created Teller Cash account at creation (§12).
  const tills = MOCK_BRANCHES.filter((b) => b.deletedAt === null).map((b) => ({
    branch: b,
    accountId: tellerCashAccountId(b.id),
    balance: balanceOf(tellerCashAccountId(b.id)),
  }));
  const tillTotal = round2(tills.reduce((s, t) => s + t.balance, 0));

  return (
    <div className="space-y-6">
      <div>
        <h1>Bank Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Each bank account and each branch till owns exactly one ledger account — balances below are read straight from it.
        </p>
      </div>

      <SectionNav items={treasuryNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bank Accounts — {formatMoney(bankTotal)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account number</TableHead>
                  <TableHead>Account name</TableHead>
                  <TableHead>Ledger account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((b) => {
                  const account = CHART_OF_ACCOUNTS.find((a) => a.id === b.chartAccountId);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.bankName}</TableCell>
                      <TableCell className="font-tabular">{b.accountNumber}</TableCell>
                      <TableCell>{b.accountName}</TableCell>
                      <TableCell>
                        <Link href={`/ledger/accounts/${b.chartAccountId}`} className="hover:underline">
                          <span className="font-tabular">{account?.code ?? "—"}</span> {account?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={b.status === "active" ? "default" : "secondary"} className="capitalize">
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-tabular text-right font-medium">{formatMoney(balanceOf(b.chartAccountId))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branch Tills — {formatMoney(tillTotal)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Ledger account</TableHead>
                  <TableHead className="text-right">Cash on hand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tills.map((t) => {
                  const account = CHART_OF_ACCOUNTS.find((a) => a.id === t.accountId);
                  return (
                    <TableRow key={t.branch.id}>
                      <TableCell className="font-medium">
                        {t.branch.name}
                        {t.branch.isHeadOffice && (
                          <Badge variant="outline" className="ml-2">
                            HQ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {account ? (
                          <Link href={`/ledger/accounts/${t.accountId}`} className="hover:underline">
                            <span className="font-tabular">{account.code}</span> {account.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-tabular text-right font-medium">{formatMoney(t.balance)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
