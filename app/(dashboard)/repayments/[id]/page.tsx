import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getPayment, getSuspenseItems } from "@/lib/api/payments";
import { getLoanSchedule } from "@/lib/api/loans";
import { ApiError } from "@/lib/api/errors";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getNameLookups } from "@/features/repayments/queries";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Outside this user's branch scope comes back 403, missing comes back 404 —
  // both mean "no such payment, for you".
  let payment;
  try {
    payment = await getPayment(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }

  const user = await getCurrentUser();
  if (!user) return <AccessDeniedState />;
  const canManage = hasPermission(user, PERMISSIONS.REPAYMENTS_MANAGE);

  const [names, schedule, suspenseQueue] = await Promise.all([
    getNameLookups(),
    // Installment numbers and due dates for the allocation rows. Needs
    // `loans.view`, which a Teller does not hold, so it fails soft to "—".
    payment.loanId ? getLoanSchedule(payment.loanId).catch(() => null) : Promise.resolve(null),
    canManage ? getSuspenseItems().catch(() => []) : Promise.resolve([]),
  ]);

  const scheduleById = new Map((schedule?.installments ?? []).map((s) => [s.id, s]));
  const suspense = suspenseQueue.filter((s) => s.paymentId === payment.id);
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const customerName = payment.customerId ? names.customers.get(payment.customerId) : undefined;
  const branchName = payment.branchId ? names.branches.get(payment.branchId) : undefined;

  const totals = payment.allocations.reduce(
    (acc, a) => ({
      penalty: round2(acc.penalty + a.penaltyAllocated),
      interest: round2(acc.interest + a.interestAllocated),
      principal: round2(acc.principal + a.principalAllocated),
    }),
    { penalty: 0, interest: 0, principal: 0 }
  );
  const allocatedTotal = round2(totals.penalty + totals.interest + totals.principal);
  const unallocated = round2(payment.amount - allocatedTotal);

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
              {payment.loanId ? (
                <Link href={`/loans/${payment.loanId}`} className="hover:underline">
                  {payment.loanNumber ?? "View loan"}
                </Link>
              ) : (
                "Not matched to a loan"
              )}
              {customerName && ` · ${customerName}`}
              {branchName && ` · ${branchName}`}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-tabular text-lg font-semibold">{formatMoney(payment.amount)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payment.allocations.length === 0 ? (
            <EmptyState
              title="Not yet allocated"
              description={
                payment.status === "unmatched"
                  ? "This receipt could not be matched to a loan and is parked in Suspense."
                  : "This payment has no allocation rows."
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
              {unallocated > 0.01 && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {formatMoney(unallocated)} of this payment exceeded the outstanding balance and was not allocated.
                </p>
              )}
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
                    {payment.allocations.map((a) => {
                      const installment = scheduleById.get(a.loanScheduleId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>#{installment?.installmentNumber ?? "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{installment?.dueDate ?? "—"}</TableCell>
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
                      {s.resolvedByName && ` · ${s.resolvedByName}`}
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
          <Fact label="Journal entry" value={payment.journalEntryNumber ?? (payment.journalEntryId ? `#${payment.journalEntryId}` : "—")} />
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
