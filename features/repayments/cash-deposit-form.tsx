"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCashDeposit } from "@/features/repayments/actions";

export interface BankOption {
  id: string;
  label: string;
}

export function CashDepositForm({ banks, pendingCashTotal }: { banks: BankOption[]; pendingCashTotal: number }) {
  const router = useRouter();
  const [amount, setAmount] = React.useState("");
  const [bankId, setBankId] = React.useState(banks[0]?.id ?? "");
  const [slip, setSlip] = React.useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createCashDeposit(Number(amount) || 0, bankId, slip);
      if (result.ok) {
        toast.success(result.message);
        setAmount("");
        setSlip("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log a Bank Deposit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You are holding <span className="font-medium">{pendingCashTotal.toLocaleString()} TZS</span> in unreconciled cash payments.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="dep-amount">Deposit amount (TZS)</Label>
            <Input id="dep-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bank account</Label>
            <Select value={bankId} onValueChange={(v) => v && setBankId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => banks.find((b) => b.id === v)?.label ?? "Select bank"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dep-slip">Deposit slip reference</Label>
            <Input id="dep-slip" value={slip} onChange={(e) => setSlip(e.target.value)} placeholder="slip-00123.jpg" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || Number(amount) <= 0 || !bankId}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Log Deposit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
