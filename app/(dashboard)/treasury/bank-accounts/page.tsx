import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { classifyAccount, getLedgerAccounts } from "@/lib/api/ledger";
import { getBranches } from "@/lib/api/organization";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";

export default async function BankAccountsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  /*
   * Cash positions, straight from the chart of accounts and its cached
   * balances. There is no bank-account registry endpoint, so the account list
   * *is* the registry: a dynamic account with no branch is a bank account, one
   * with a branch is that branch's till (§12 auto-creates it at branch
   * creation). See classifyAccount.
   *
   * What the ledger cannot give back is the bank-specific detail the old
   * mock-backed table showed — bank name, account number and account holder are
   * fields of a bank_accounts row, and there is no endpoint for them. The
   * ledger account's own code and name are shown instead.
   */
  const [accounts, branches] = await Promise.all([getLedgerAccounts(), getBranches().catch(() => [])]);

  const banks = accounts.filter((a) => classifyAccount(a) === "bank" && a.deletedAt === null);
  const bankTotal = round2(banks.reduce((s, a) => s + a.balance, 0));

  const branchNames = new Map(branches.map((b) => [b.id, b]));
  const tills = accounts
    .filter((a) => classifyAccount(a) === "branch_cash" && a.deletedAt === null)
    .map((a) => ({ account: a, branch: a.branchId ? branchNames.get(a.branchId) : undefined }));
  const tillTotal = round2(tills.reduce((s, t) => s + t.account.balance, 0));

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
                  <TableHead>Ledger account</TableHead>
                  <TableHead>Account name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Link href={`/ledger/accounts/${account.id}`} className="font-tabular hover:underline">
                        {account.code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{account.typeLabel}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : "secondary"} className="capitalize">
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-tabular text-right font-medium">{formatMoney(account.balance)}</TableCell>
                  </TableRow>
                ))}
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
                {tills.map((t) => (
                  <TableRow key={t.account.id}>
                    <TableCell className="font-medium">
                      {t.branch?.name ?? t.account.name}
                      {t.branch?.isHeadOffice && (
                        <Badge variant="outline" className="ml-2">
                          HQ
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/ledger/accounts/${t.account.id}`} className="hover:underline">
                        <span className="font-tabular">{t.account.code}</span> {t.account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-tabular text-right font-medium">{formatMoney(t.account.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
