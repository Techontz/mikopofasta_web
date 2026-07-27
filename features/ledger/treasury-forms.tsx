"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Coins, Loader2, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/domain/money";
import { distributeDividend, recordCapitalContribution } from "@/features/ledger/actions";

export interface BankOption {
  id: string;
  label: string;
}

export function CapitalContributionForm({ banks }: { banks: BankOption[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [bankId, setBankId] = React.useState(banks[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await recordCapitalContribution(name, Number(amount) || 0, bankId);
      if (result.ok) {
        toast.success(result.message);
        setName("");
        setAmount("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record Capital Injection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Posts Dr Bank / Cr Capital Account.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cap-name">Contributor</Label>
            <Input id="cap-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Founding Shareholders" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cap-amount">Amount (TZS)</Label>
            <Input id="cap-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Received into</Label>
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
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !name.trim() || Number(amount) <= 0 || !bankId}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <PiggyBank className="size-4" />}
            Record Contribution
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DividendForm({ distributableProfit }: { distributableProfit: number }) {
  const router = useRouter();
  const [period, setPeriod] = React.useState(new Date().toISOString().slice(0, 7));
  const [pending, startTransition] = useTransition();

  const reinvest = Math.round(distributableProfit * 0.7);
  const shareholders = distributableProfit - reinvest;

  function submit() {
    startTransition(async () => {
      const result = await distributeDividend(period);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribute Dividend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Splits profit 70% to reinvestment (Principal) and 30% to shareholders (Dividend Account), posted against the Profit Account.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="div-period">Period</Label>
            <Input id="div-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-07" />
          </div>
          <Fact label="Distributable profit" value={formatMoney(distributableProfit)} />
          <Fact label="Reinvestment (70%)" value={formatMoney(reinvest)} />
          <Fact label="Shareholders (30%)" value={formatMoney(shareholders)} />
        </div>
        {distributableProfit <= 0 && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            No distributable profit — income does not currently exceed expenses, so no dividend can be declared.
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || distributableProfit <= 0 || !/^\d{4}-\d{2}$/.test(period)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
            Distribute
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
      <p className="font-tabular text-sm font-semibold">{value}</p>
    </div>
  );
}
