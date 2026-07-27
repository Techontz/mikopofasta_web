import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_PAYMENTS, MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { customerFullName } from "@/types/customer";
import { scheduleOutstanding } from "@/types/loan";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { CashEntryForm, type RepayableLoan } from "@/features/repayments/cash-entry-form";
import { CashDepositForm } from "@/features/repayments/cash-deposit-form";

export default async function CashEntryPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPAYMENTS_CASH_ENTRY)) return <AccessDeniedState />;

  const seesAll = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const loans = MOCK_LOANS.filter(
    (l) => l.deletedAt === null && l.disbursementDate !== null && (seesAll || l.branchId === user.branchId)
  );

  const repayable: RepayableLoan[] = loans
    .map((loan) => {
      const schedules = MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loan.id).sort((a, b) => a.installmentNumber - b.installmentNumber);
      const outstanding = round2(schedules.reduce((sum, s) => sum + scheduleOutstanding(s).total, 0));
      const next = schedules.find((s) => scheduleOutstanding(s).total > 0);
      const customer = MOCK_CUSTOMERS.find((c) => c.id === loan.customerId);
      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        customerId: loan.customerId,
        customerName: customer ? customerFullName(customer) : "—",
        branchId: loan.branchId,
        outstanding,
        nextDueDate: next?.dueDate ?? null,
        nextDueAmount: next ? round2(scheduleOutstanding(next).total) : 0,
      };
    })
    .filter((l) => l.outstanding > 0);

  const myPending = MOCK_PAYMENTS.filter(
    (p) => p.status === "pending_verification" && p.channel === "cash" && (seesAll || p.branchId === user.branchId)
  );
  const pendingCashTotal = round2(myPending.reduce((s, p) => s + p.amount, 0));

  return (
    <div className="space-y-6">
      <div>
        <h1>Cash Entry</h1>
        <p className="text-sm text-muted-foreground">Record cash collected at the counter, then log the bank deposit for reconciliation.</p>
      </div>

      <RepaymentsNav items={repaymentsNavFor(user)} />

      <CashEntryForm loans={repayable} />

      <CashDepositForm
        banks={MOCK_BANK_ACCOUNTS.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, label: `${b.bankName} — ${b.accountNumber}` }))}
        pendingCashTotal={pendingCashTotal}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Awaiting Reconciliation ({myPending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myPending.length === 0 ? (
            <EmptyState title="No unreconciled cash" description="Every cash payment you've taken has been reconciled." />
          ) : (
            <ul className="space-y-2">
              {myPending.map((p) => {
                const loan = MOCK_LOANS.find((l) => l.id === p.loanId);
                return (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{p.paymentReference}</p>
                      <p className="text-xs text-muted-foreground">
                        {loan?.loanNumber ?? "—"} · {new Date(p.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-tabular">{formatMoney(p.amount)}</span>
                      <Badge variant="outline" className="whitespace-nowrap border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        Pending verification
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
