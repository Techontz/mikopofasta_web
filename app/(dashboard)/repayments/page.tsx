import { AlertTriangle, Banknote, CircleDollarSign, Clock, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_SUSPENSE_ITEMS } from "@/lib/mock-data/payments";
import { PaymentsTable } from "@/features/repayments/payments-table";
import { RepaymentsNav } from "@/features/repayments/repayments-nav";
import { repaymentsNavFor } from "@/features/repayments/repayments-nav-items";
import { InboundPaymentDialog } from "@/features/repayments/inbound-payment-dialog";
import { OverdueRunButton } from "@/features/repayments/overdue-run-button";
import { toPaymentRow, visiblePaymentsFor } from "@/features/repayments/queries";

export default async function RepaymentsPage() {
  const user = await getCurrentUser();
  const payments = visiblePaymentsFor(user);
  const rows = payments.map(toPaymentRow);

  const collected = round2(payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0));
  const pendingVerification = payments.filter((p) => p.status === "pending_verification");
  const unmatched = payments.filter((p) => p.status === "unmatched");
  const openSuspense = MOCK_SUSPENSE_ITEMS.filter((s) => s.status !== "allocated");

  const canManage = user ? hasPermission(user, PERMISSIONS.REPAYMENTS_MANAGE) : false;

  const tiles = [
    { label: "Total Collected", value: formatMoney(collected), icon: CircleDollarSign },
    { label: "Awaiting Verification", value: String(pendingVerification.length), icon: Clock },
    { label: "Unmatched", value: String(unmatched.length), icon: HelpCircle },
    { label: "Open Suspense Items", value: String(openSuspense.length), icon: Banknote },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1>Repayments &amp; Collections</h1>
          <p className="text-sm text-muted-foreground">
            Every channel — direct, cash, and suspense resolution — lands in the same allocation engine.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <OverdueRunButton />
            <InboundPaymentDialog />
          </div>
        )}
      </div>

      <RepaymentsNav items={repaymentsNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {openSuspense.length > 0 && canManage && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            {openSuspense.length} suspense item{openSuspense.length === 1 ? "" : "s"} still need allocating to a loan.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsTable payments={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
