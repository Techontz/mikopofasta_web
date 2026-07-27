import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_REVERSAL_REQUESTS } from "@/lib/mock-data/reversals";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { RequestReversalDialog } from "@/features/ledger/request-reversal-dialog";
import { entryState } from "@/features/ledger/queries";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === id);
  if (!entry) notFound();

  const lines = MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.journalEntryId === entry.id);
  const debits = round2(lines.reduce((s, l) => s + l.debitAmount, 0));
  const credits = round2(lines.reduce((s, l) => s + l.creditAmount, 0));
  const balanced = Math.abs(debits - credits) < 0.01;

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));
  const accountOf = (aid: string) => CHART_OF_ACCOUNTS.find((a) => a.id === aid);
  const branchOf = (bid: string | null) => (bid ? MOCK_BRANCHES.find((b) => b.id === bid)?.name : null);

  const state = entryState(entry);
  const reversedBy = MOCK_JOURNAL_ENTRIES.find((e) => e.reversedEntryId === entry.id);
  const original = entry.reversedEntryId ? MOCK_JOURNAL_ENTRIES.find((e) => e.id === entry.reversedEntryId) : undefined;
  const pendingRequest = MOCK_REVERSAL_REQUESTS.find((r) => r.journalEntryId === entry.id && r.status === "pending");

  const canRequest =
    hasPermission(user, PERMISSIONS.LEDGER_REVERSE_REQUEST) && state === "Posted" && !pendingRequest;

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={entry.entryNumber} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/ledger/entries"><ArrowLeft className="size-4" />Back to Journal Entries</Link>} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-tabular text-lg font-semibold">{entry.entryNumber}</h1>
              <Badge variant="outline" className="capitalize">
                {entry.sourceType.replace(/_/g, " ")}
              </Badge>
              {state === "Reversal" && (
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  Reversal entry
                </Badge>
              )}
              {state === "Reversed" && <Badge variant="destructive">Reversed</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              Posted {new Date(entry.postedAt).toLocaleString()} by {userNames[entry.createdBy] ?? entry.createdBy}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="grid grid-cols-2 gap-4 sm:text-right">
              <Fact label="Debits" value={formatMoney(debits)} />
              <Fact label="Credits" value={formatMoney(credits)} />
            </div>
            {canRequest && <RequestReversalDialog journalEntryId={entry.id} entryNumber={entry.entryNumber} />}
          </div>
        </CardContent>
      </Card>

      {balanced ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Entry is balanced — debits equal credits.
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Entry is unbalanced by {formatMoney(Math.abs(debits - credits))}.
        </div>
      )}

      {pendingRequest && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-medium">Reversal pending approval</span> — requested by{" "}
          {userNames[pendingRequest.requestedBy] ?? pendingRequest.requestedBy}: &ldquo;{pendingRequest.reason}&rdquo;
        </div>
      )}

      {reversedBy && (
        <div className="rounded-lg border px-4 py-3 text-sm">
          This entry was reversed by{" "}
          <Link href={`/ledger/entries/${reversedBy.id}`} className="font-medium hover:underline">
            {reversedBy.entryNumber}
          </Link>
          . The lines below are unchanged — reversal never edits the original.
        </div>
      )}

      {original && (
        <div className="rounded-lg border px-4 py-3 text-sm">
          This entry reverses{" "}
          <Link href={`/ledger/entries/${original.id}`} className="font-medium hover:underline">
            {original.entryNumber}
          </Link>
          .
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entry Lines ({lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => {
                  const account = accountOf(l.accountId);
                  const dims = [
                    branchOf(l.branchId) && `Branch: ${branchOf(l.branchId)}`,
                    l.customerId && `Customer: ${l.customerId}`,
                    l.loanId && `Loan: ${l.loanId}`,
                    l.staffProfileId && `Staff: ${l.staffProfileId}`,
                  ].filter(Boolean);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link href={`/ledger/accounts/${l.accountId}`} className="hover:underline">
                          <span className="font-tabular">{account?.code ?? "—"}</span> {account?.name ?? l.accountId}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dims.length > 0 ? dims.join(" · ") : "—"}</TableCell>
                      <TableCell className="font-tabular text-right">{l.debitAmount > 0 ? formatMoney(l.debitAmount) : "—"}</TableCell>
                      <TableCell className="font-tabular text-right">{l.creditAmount > 0 ? formatMoney(l.creditAmount) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-medium">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="font-tabular text-right">{formatMoney(debits)}</TableCell>
                  <TableCell className="font-tabular text-right">{formatMoney(credits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
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
