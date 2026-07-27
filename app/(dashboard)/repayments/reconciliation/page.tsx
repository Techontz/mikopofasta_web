import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { round2 } from "@/lib/domain/money";
import { MOCK_CASH_DEPOSITS, MOCK_PENALTY_RUNS } from "@/lib/mock-data/cash-deposits";
import { MOCK_PAYMENTS } from "@/lib/mock-data/payments";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { formatMoney } from "@/lib/domain/money";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { ReconciliationPanel, type DepositRow, type PendingPaymentRow } from "@/features/repayments/reconciliation-panel";

export default async function ReconciliationPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPAYMENTS_RECONCILE)) return <AccessDeniedState />;

  const seesAll = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));
  const branchName = (id: string | null) => MOCK_BRANCHES.find((b) => b.id === id)?.name ?? "—";

  const scopedDeposits = MOCK_CASH_DEPOSITS.filter((d) => seesAll || d.branchId === user.branchId);

  const deposits: DepositRow[] = scopedDeposits.map((d) => {
    const bank = MOCK_BANK_ACCOUNTS.find((b) => b.id === d.bankAccountId);
    return {
      id: d.id,
      amount: d.amount,
      bankLabel: bank ? `${bank.bankName} (${bank.accountNumber})` : "—",
      branchName: branchName(d.branchId),
      tellerName: userNames[d.tellerId] ?? d.tellerId,
      slipReference: d.depositSlipPath ? d.depositSlipPath.split("/").pop()! : null,
      status: d.status,
      matchedCount: d.matchedPaymentIds?.length ?? 0,
      reconciledByName: d.reconciledBy ? (userNames[d.reconciledBy] ?? d.reconciledBy) : null,
    };
  });

  const pendingPayments: PendingPaymentRow[] = MOCK_PAYMENTS.filter(
    (p) => p.status === "pending_verification" && p.channel === "cash" && (seesAll || p.branchId === user.branchId)
  ).map((p) => ({
    id: p.id,
    paymentReference: p.paymentReference,
    loanNumber: MOCK_LOANS.find((l) => l.id === p.loanId)?.loanNumber ?? "—",
    amount: p.amount,
    branchName: branchName(p.branchId),
    receivedAt: p.receivedAt,
  }));

  const pendingTotal = round2(pendingPayments.reduce((s, p) => s + p.amount, 0));
  const openDeposits = deposits.filter((d) => d.status !== "confirmed");

  return (
    <div className="space-y-6">
      <div>
        <h1>Bank Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Teller cash and bank-confirmed cash are different trust states — matching a slip is what posts the payment to the ledger.
        </p>
      </div>

      <RepaymentsNav items={repaymentsNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Deposits Awaiting Match" value={String(openDeposits.length)} />
        <Stat label="Payments Pending Verification" value={String(pendingPayments.length)} />
        <Stat label="Unreconciled Cash" value={formatMoney(pendingTotal)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <ReconciliationPanel deposits={deposits} payments={pendingPayments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Penalty Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[...MOCK_PENALTY_RUNS]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((run) => (
                <li key={run.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{run.runDate}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {run.triggeredBy} · {run.loansProcessed} loan(s)
                    </p>
                  </div>
                  <span className="font-tabular">{formatMoney(run.totalPenaltyApplied)}</span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-tabular text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
