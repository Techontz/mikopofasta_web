"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { recordInboundPayment } from "@/features/repayments/actions";
import { PAYMENT_CHANNELS, type PaymentChannel } from "@/types/enums";

/**
 * Stands in for the provider webhook (`POST /webhooks/payments`) so the
 * direct-intake channel is exercisable in the mock environment. A reference
 * that matches no loan is still received and parked in Suspense.
 */
export function InboundPaymentDialog() {
  const [open, setOpen] = React.useState(false);
  const [reference, setReference] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [phone, setPhone] = React.useState("0754000000");
  const [channel, setChannel] = React.useState<PaymentChannel>("mobile_money");
  const [txn, setTxn] = React.useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // Fresh transaction id per open so the duplicate-detection rule isn't
    // tripped just by reopening the dialog.
    if (next) setTxn(`TXN${Date.now().toString().slice(-8)}`);
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      const result = await recordInboundPayment({
        reference,
        amount: Number(amount) || 0,
        phone,
        channel,
        transactionId: txn,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setReference("");
        setAmount("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Radio className="size-4" />
            Simulate Inbound Payment
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Simulate Inbound Payment</DialogTitle>
          <DialogDescription>
            Mirrors a signed provider callback. An unknown reference is still received and ledgered to Suspense — never dropped.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inb-ref">Loan reference</Label>
            <Input id="inb-ref" placeholder="LN-2026-000011" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inb-amount">Amount (TZS)</Label>
            <Input id="inb-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => v && setChannel(v as PaymentChannel)}>
              <SelectTrigger className="w-full">
                <SelectValue className="capitalize">{(v: string) => v.replace(/_/g, " ")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inb-phone">Payer phone</Label>
            <Input id="inb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inb-txn">Transaction ID</Label>
            <Input id="inb-txn" value={txn} onChange={(e) => setTxn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !reference || !amount || !txn}>
            {pending ? "Sending…" : "Send Callback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
