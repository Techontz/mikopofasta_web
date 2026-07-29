import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getSuspenseItems } from "@/lib/api/payments";
import { getAllLoans, getOutstandingByLoan } from "@/lib/api/loans";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { SuspensePanel, type SuspenseRow, type LoanOption } from "@/features/repayments/suspense-panel";

export default async function SuspensePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPAYMENTS_MANAGE)) return <AccessDeniedState />;

  // `GET /payments/suspense` returns the open queue only — unallocated and
  // investigating. Resolved items are not in it, which is why there is no
  // longer a "Resolved" section: the API has nothing to put there.
  const [items, openBook] = await Promise.all([getSuspenseItems(), getAllLoans({ stage: "open_book" })]);

  const outstanding = await getOutstandingByLoan(openBook);

  const rows: SuspenseRow[] = items.map((item) => ({
    id: item.id,
    reason: item.reason,
    amount: item.amount,
    status: item.status,
    paymentReference: item.paymentReference ?? item.paymentId,
    resolvedByName: item.resolvedByName,
  }));

  const loans: LoanOption[] = openBook
    .map((loan) => ({
      id: loan.id,
      outstanding: outstanding.byLoan.get(loan.id) ?? 0,
      customerName: loan.customerName ?? "—",
      loanNumber: loan.loanNumber,
    }))
    .filter((l) => l.outstanding > 0)
    .map(({ id, loanNumber, customerName, outstanding: due }) => ({
      id,
      label: `${loanNumber} — ${customerName} (${formatMoney(due)} due)`,
    }));

  const openTotal = round2(rows.reduce((s, r) => s + r.amount, 0));

  return (
    <div className="space-y-6">
      <div>
        <h1>Suspense</h1>
        <p className="text-sm text-muted-foreground">
          Money that arrived but couldn&apos;t be matched. Nothing sits un-ledgered — resolving posts a second entry, never editing the original.
        </p>
      </div>

      <RepaymentsNav items={repaymentsNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Unresolved ({rows.length}) · {formatMoney(openTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SuspensePanel items={rows} loans={loans} />
        </CardContent>
      </Card>
    </div>
  );
}
