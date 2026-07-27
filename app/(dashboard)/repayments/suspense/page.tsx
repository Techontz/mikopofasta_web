import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_SUSPENSE_ITEMS, MOCK_PAYMENTS, MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { customerFullName } from "@/types/customer";
import { scheduleOutstanding } from "@/types/loan";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { SuspensePanel, type SuspenseRow, type LoanOption } from "@/features/repayments/suspense-panel";

export default async function SuspensePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPAYMENTS_MANAGE)) return <AccessDeniedState />;

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const rows: SuspenseRow[] = MOCK_SUSPENSE_ITEMS.map((item) => {
    const payment = MOCK_PAYMENTS.find((p) => p.id === item.paymentId);
    return {
      id: item.id,
      reason: item.reason,
      amount: item.amount,
      status: item.status,
      paymentReference: payment?.paymentReference ?? item.paymentId,
      resolvedByName: item.resolvedBy ? (userNames[item.resolvedBy] ?? item.resolvedBy) : null,
    };
  });

  const seesAll = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const loans: LoanOption[] = MOCK_LOANS.filter((l) => l.deletedAt === null && l.disbursementDate !== null && (seesAll || l.branchId === user.branchId))
    .map((loan) => {
      const outstanding = round2(
        MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loan.id).reduce((sum, s) => sum + scheduleOutstanding(s).total, 0)
      );
      const customer = MOCK_CUSTOMERS.find((c) => c.id === loan.customerId);
      return { id: loan.id, outstanding, label: `${loan.loanNumber} — ${customer ? customerFullName(customer) : "—"} (${formatMoney(outstanding)} due)` };
    })
    .filter((l) => l.outstanding > 0)
    .map(({ id, label }) => ({ id, label }));

  const open = rows.filter((r) => r.status !== "allocated");
  const resolved = rows.filter((r) => r.status === "allocated");
  const openTotal = round2(open.reduce((s, r) => s + r.amount, 0));

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
            Unresolved ({open.length}) · {formatMoney(openTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SuspensePanel items={open} loans={loans} />
        </CardContent>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolved ({resolved.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <SuspensePanel items={resolved} loans={loans} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
