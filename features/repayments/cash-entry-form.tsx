"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/domain/money";
import { recordCashPayment } from "@/features/repayments/actions";

const NONE = "__none__";

export interface RepayableLoan {
  id: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  branchId: string;
  outstanding: number;
  nextDueDate: string | null;
  nextDueAmount: number;
}

export function CashEntryForm({ loans }: { loans: RepayableLoan[] }) {
  const router = useRouter();
  const [loanId, setLoanId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [pending, startTransition] = useTransition();

  const loan = loans.find((l) => l.id === loanId);
  const amountNumber = Number(amount) || 0;
  const exceeds = loan ? amountNumber > loan.outstanding : false;

  function submit() {
    if (!loan) return;
    startTransition(async () => {
      const result = await recordCashPayment({
        customerId: loan.customerId,
        loanId: loan.id,
        amount: amountNumber,
        branchId: loan.branchId,
        tellerId: "",
      });
      if (result.ok) {
        toast.success(result.message);
        setAmount("");
        setLoanId("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record a Cash Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Loan</Label>
            <Select value={loanId || NONE} onValueChange={(v) => setLoanId(v === NONE ? "" : (v ?? ""))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a disbursed loan">
                  {(v: string) => {
                    const l = loans.find((x) => x.id === v);
                    return l ? `${l.loanNumber} — ${l.customerName}` : "Select a disbursed loan";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  Select a disbursed loan
                </SelectItem>
                {loans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.loanNumber} — {l.customerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loans.length === 0 && <p className="text-xs text-muted-foreground">No disbursed loans with an outstanding balance in your branch.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cash-amount">Amount received (TZS)</Label>
            <Input id="cash-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!loan} />
            {exceeds && <p className="text-xs text-amber-600 dark:text-amber-500">Exceeds the outstanding balance — the excess will go to Suspense.</p>}
          </div>

          {loan && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3">
              <Fact label="Outstanding" value={formatMoney(loan.outstanding)} />
              <Fact label="Next installment" value={loan.nextDueDate ? `${formatMoney(loan.nextDueAmount)} on ${loan.nextDueDate}` : "—"} />
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Cash is held as <span className="font-medium">pending verification</span> until Finance reconciles a deposit slip against it — only then does it post to the ledger.
        </p>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !loan || amountNumber <= 0}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
            Record Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-tabular text-sm font-medium">{value}</p>
    </div>
  );
}
