"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney, round2 } from "@/lib/domain/money";
import { reconcileDeposit } from "@/features/repayments/deposit-actions";

export interface DepositRow {
  id: string;
  amount: number;
  bankLabel: string;
  branchName: string;
  tellerName: string;
  slipReference: string | null;
  status: string;
  matchedCount: number;
  reconciledByName: string | null;
}

export interface PendingPaymentRow {
  id: string;
  paymentReference: string;
  loanNumber: string;
  amount: number;
  branchName: string;
  receivedAt: string;
}

export function ReconciliationPanel({ deposits, payments }: { deposits: DepositRow[]; payments: PendingPaymentRow[] }) {
  if (deposits.length === 0) {
    return <EmptyState icon={Landmark} title="No deposits awaiting reconciliation" description="Tellers log deposit slips from the Cash Entry screen." />;
  }
  return (
    <div className="space-y-4">
      {deposits.map((d) => (
        <DepositCard key={d.id} deposit={d} payments={payments} />
      ))}
    </div>
  );
}

function DepositCard({ deposit, payments }: { deposit: DepositRow; payments: PendingPaymentRow[] }) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const matchedTotal = round2(payments.filter((p) => selected.includes(p.id)).reduce((s, p) => s + p.amount, 0));
  const difference = round2(matchedTotal - deposit.amount);
  const balanced = Math.abs(difference) < 0.01 && selected.length > 0;

  function toggle(id: string, on: boolean) {
    setSelected((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function submit() {
    startTransition(async () => {
      const result = await reconcileDeposit(deposit.id, selected);
      if (result.ok) {
        toast.success(result.message);
        setSelected([]);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {formatMoney(deposit.amount)} → {deposit.bankLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {deposit.branchName} · {deposit.tellerName}
            {deposit.slipReference && ` · slip ${deposit.slipReference}`}
          </p>
        </div>
        <Badge variant={deposit.status === "confirmed" ? "default" : "secondary"} className="capitalize">
          {deposit.status}
        </Badge>
      </div>

      {deposit.status === "confirmed" ? (
        <p className="text-sm text-muted-foreground">
          Reconciled against {deposit.matchedCount} payment{deposit.matchedCount === 1 ? "" : "s"}
          {deposit.reconciledByName && ` by ${deposit.reconciledByName}`}.
        </p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending cash payments available to match against this deposit.</p>
      ) : (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Match against pending cash payments</Label>
            <ul className="space-y-1.5">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox id={`${deposit.id}-${p.id}`} checked={selected.includes(p.id)} onCheckedChange={(v) => toggle(p.id, v === true)} />
                  <Label htmlFor={`${deposit.id}-${p.id}`} className="flex flex-1 flex-wrap items-center justify-between gap-2 font-normal">
                    <span>
                      {p.paymentReference} · {p.loanNumber}
                    </span>
                    <span className="font-tabular">{formatMoney(p.amount)}</span>
                  </Label>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
            <span className={balanced ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              Selected {formatMoney(matchedTotal)} of {formatMoney(deposit.amount)}
              {selected.length > 0 && !balanced && ` · off by ${formatMoney(Math.abs(difference))}`}
            </span>
            <Button size="sm" disabled={pending || !balanced} onClick={submit}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Reconcile &amp; Post
            </Button>
          </div>
          {selected.length > 0 && !balanced && (
            <p className="text-xs text-muted-foreground">
              Totals must match exactly — mismatches are flagged for investigation, never auto-corrected.
            </p>
          )}
        </>
      )}
    </div>
  );
}
