import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { ACCOUNT_TYPE_LABELS, buildAccountLedger } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const account = CHART_OF_ACCOUNTS.find((a) => a.id === id && a.deletedAt === null);
  if (!account) notFound();

  const entryIndex = new Map(MOCK_JOURNAL_ENTRIES.map((e) => [e.id, e]));
  const rows = buildAccountLedger(account, MOCK_JOURNAL_ENTRY_LINES, (eid) => entryIndex.get(eid));
  const branch = account.branchId ? MOCK_BRANCHES.find((b) => b.id === account.branchId) : undefined;

  const debitTotal = rows.reduce((s, r) => s + r.debit, 0);
  const creditTotal = rows.reduce((s, r) => s + r.credit, 0);
  const closing = rows.length > 0 ? rows[rows.length - 1].runningBalance : 0;

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={`${account.code} ${account.name}`} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/ledger"><ArrowLeft className="size-4" />Back to Ledger</Link>} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-tabular text-lg font-semibold">{account.code}</h1>
              <span className="text-lg font-semibold">{account.name}</span>
              <Badge variant="outline">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
              <Badge variant="secondary">{account.isSystem ? "System" : "Dynamic"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {branch ? `Branch-scoped — ${branch.name}` : "System-wide"} · {rows.length} line{rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 sm:text-right">
            <Fact label="Debits" value={formatMoney(debitTotal)} />
            <Fact label="Credits" value={formatMoney(creditTotal)} />
            <Fact label="Balance" value={formatMoney(closing)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="No postings yet" description="Nothing has been posted to this account." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/ledger/entries/${r.entryId}`} className="font-tabular hover:underline">
                          {r.entryNumber}
                        </Link>
                        {r.isReversal && (
                          <Badge variant="outline" className="ml-2 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Reversal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{r.entryDate}</TableCell>
                      <TableCell className="max-w-80 truncate">{r.description}</TableCell>
                      <TableCell className="font-tabular text-right">{r.debit > 0 ? formatMoney(r.debit) : "—"}</TableCell>
                      <TableCell className="font-tabular text-right">{r.credit > 0 ? formatMoney(r.credit) : "—"}</TableCell>
                      <TableCell className="font-tabular text-right font-medium">{formatMoney(r.runningBalance)}</TableCell>
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-tabular text-sm font-semibold">{value}</p>
    </div>
  );
}
