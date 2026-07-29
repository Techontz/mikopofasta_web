import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getAllLoans, getOutstandingByLoan } from "@/lib/api/loans";
import { getAllPayments } from "@/lib/api/payments";
import { getNameLookups } from "@/features/repayments/queries";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { CashEntryForm, type RepayableLoan } from "@/features/repayments/cash-entry-form";
import { CashDepositForm } from "@/features/repayments/cash-deposit-form";

export default async function CashEntryPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPAYMENTS_CASH_ENTRY)) return <AccessDeniedState />;

  /*
   * The repayable-loan picker needs `GET /loans`, which requires `loans.view`
   * — and a Teller, the role this page exists for, does not hold it. The API
   * offers no loan lookup a Teller *can* call either, so for them the list
   * comes back empty and the page says why, rather than erroring on a
   * permission the screen was never granted.
   */
  const canListLoans = hasPermission(user, PERMISSIONS.LOANS_VIEW);

  const [openBook, payments, names] = await Promise.all([
    canListLoans ? getAllLoans({ stage: "open_book" }).catch(() => []) : Promise.resolve([]),
    getAllPayments({ status: ["pending_verification"], channel: ["cash"] }),
    getNameLookups(),
  ]);

  const outstanding = await getOutstandingByLoan(openBook);

  const repayable: RepayableLoan[] = openBook
    .map((loan) => ({
      id: loan.id,
      loanNumber: loan.loanNumber,
      customerId: loan.customerId,
      customerName: loan.customerName ?? "—",
      branchId: loan.branchId,
      outstanding: outstanding.byLoan.get(loan.id) ?? 0,
      // The next-due installment is not on the list resource; the picker shows
      // the balance, which is what a teller counts cash against.
      nextDueDate: null,
      nextDueAmount: 0,
    }))
    .filter((l) => l.outstanding > 0);

  const pendingCashTotal = round2(payments.reduce((s, p) => s + p.amount, 0));

  return (
    <div className="space-y-6">
      <div>
        <h1>Cash Entry</h1>
        <p className="text-sm text-muted-foreground">Record cash collected at the counter, then log the bank deposit for reconciliation.</p>
      </div>

      <RepaymentsNav items={repaymentsNavFor(user)} />

      {!canListLoans && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          Your role can record cash but cannot list loans, and the API offers no loan lookup for it — ask a
          supervisor with loan access to record this payment.
        </div>
      )}

      <CashEntryForm loans={repayable} />

      <CashDepositForm
        banks={MOCK_BANK_ACCOUNTS.filter((b) => b.deletedAt === null).map((b) => ({ id: b.id, label: `${b.bankName} — ${b.accountNumber}` }))}
        pendingCashTotal={pendingCashTotal}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cash Awaiting Reconciliation ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title="No unreconciled cash" description="Every cash payment taken has been reconciled." />
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{p.paymentReference}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.loanNumber ?? "—"}
                      {p.customerId && names.customers.get(p.customerId) ? ` · ${names.customers.get(p.customerId)}` : ""} ·{" "}
                      {new Date(p.receivedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular">{formatMoney(p.amount)}</span>
                    <Badge variant="outline" className="whitespace-nowrap border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Pending verification
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
