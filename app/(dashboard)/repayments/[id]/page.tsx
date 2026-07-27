import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { MOCK_PAYMENTS, MOCK_PAYMENT_ALLOCATIONS, MOCK_LOAN_SCHEDULES, MOCK_SUSPENSE_ITEMS } from "@/lib/mock-data/payments";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { customerFullName } from "@/types/customer";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { ConfirmPaymentButton } from "@/features/repayments/confirm-payment-button";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = MOCK_PAYMENTS.find((p) => p.id === id);
  if (!payment) notFound();

  const user = await getCurrentUser();
  if (!user) return <AccessDeniedState />;
  const seesAll = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  if (!seesAll && payment.branchId !== null && payment.branchId !== user.branchId) {
    return <AccessDeniedState />;
  }

  const loan = payment.loanId ? MOCK_LOANS.find((l) => l.id === payment.loanId) : undefined;
  const customer = payment.customerId ? MOCK_CUSTOMERS.find((c) => c.id === payment.customerId) : undefined;
  const branch = payment.branchId ? MOCK_BRANCHES.find((b) => b.id === payment.branchId) : undefined;
  const allocations = MOCK_PAYMENT_ALLOCATIONS.filter((a) => a.paymentId === payment.id);
  const suspense = MOCK_SUSPENSE_ITEMS.filter((s) => s.paymentId === payment.id);
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const totals = allocations.reduce(
    (acc, a) => ({
      penalty: round2(acc.penalty + a.penaltyAllocated),
      interest: round2(acc.interest + a.interestAllocated),
      principal: round2(acc.principal + a.principalAllocated),
    }),
    { penalty: 0, interest: 0, principal: 0 }
  );
  const allocatedTotal = round2(totals.penalty + totals.interest + totals.principal);

  const canConfirm = hasPermission(user, PERMISSIONS.REPAYMENTS_MANAGE) && payment.status === "pending_verification";

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={payment.paymentReference} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/repayments"><ArrowLeft className="size-4" />Back to Repayments</Link>} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{payment.paymentReference}</h1>
              <Badge variant="outline" className="capitalize">
                {payment.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {payment.channel.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {loan ? (
                <Link href={`/loans/${loan.id}`} className="hover:underline">
                  {loan.loanNumber}
                </Link>
              ) : (
                "Not matched to a loan"
              )}
              {customer && ` · ${customerFullName(customer)}`}
              {branch && ` · ${branch.name}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="sm:text-right">
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-tabular text-lg font-semibold">{formatMoney(payment.amount)}</p>
            </div>
            {canConfirm && <ConfirmPaymentButton paymentId={payment.id} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allocations.length === 0 ? (
            <EmptyState
              title="Not yet allocated"
              description={
                payment.status === "pending_verification"
                  ? "Cash payments post only once a deposit slip is reconciled."
                  : "This payment has no allocation rows yet."
              }
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Fact label="Penalty" value={formatMoney(totals.penalty)} />
                <Fact label="Interest" value={formatMoney(totals.interest)} />
                <Fact label="Principal" value={formatMoney(totals.principal)} />
                <Fact label="Allocated total" value={formatMoney(allocatedTotal)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Applied in the system-wide order: Penalty → Interest → Principal, oldest installment first.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Installment</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Principal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.map((a) => {
                      const schedule = MOCK_LOAN_SCHEDULES.find((s) => s.id === a.loanScheduleId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>#{schedule?.installmentNumber ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{schedule?.dueDate ?? "—"}</TableCell>
                          <TableCell className="font-tabular">{formatMoney(a.penaltyAllocated)}</TableCell>
                          <TableCell className="font-tabular">{formatMoney(a.interestAllocated)}</TableCell>
                          <TableCell className="font-tabular">{formatMoney(a.principalAllocated)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {suspense.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suspense</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suspense.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{s.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(s.amount)}
                      {s.resolvedBy && ` · ${userNames[s.resolvedBy] ?? s.resolvedBy}`}
                    </p>
                  </div>
                  <Badge variant={s.status === "allocated" ? "default" : "secondary"} className="capitalize">
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Fact label="Transaction ID" value={payment.transactionId ?? "—"} />
          <Fact label="Received" value={new Date(payment.receivedAt).toLocaleString()} />
          <Fact label="Confirmed" value={payment.confirmedAt ? new Date(payment.confirmedAt).toLocaleString() : "—"} />
          <Fact label="Teller" value={payment.tellerId ? (userNames[payment.tellerId] ?? "—") : "—"} />
          <Fact label="Recorded by" value={payment.createdBy ? (userNames[payment.createdBy] ?? "—") : "System"} />
          <Fact label="Branch" value={branch?.name ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
