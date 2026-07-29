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
import { recordUnmatchedPayment } from "@/features/repayments/actions";
import { PAYMENT_CHANNELS, type PaymentChannel } from "@/types/enums";

/**
 * Records money that arrived without a usable reference — `POST
 * /payments/unmatched`. The API receives it, posts it to Suspense and opens a
 * suspense item; nothing is dropped (§7).
 *
 * This used to simulate the provider callback. It cannot: `POST
 * /webhooks/payments` authenticates with an HMAC signature this app does not
 * hold and should never hold — a BFF able to forge one would defeat the point
 * of signing it. A *matched* provider payment now reaches the system only from
 * the provider; what a Finance user can do from here is book the receipt that
 * could not be matched.
 */
export function InboundPaymentDialog() {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [channel, setChannel] = React.useState<PaymentChannel>("mobile_money");
  const [txn, setTxn] = React.useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    // A fresh transaction id per open, so reopening the dialog does not trip
    // the API's duplicate-transaction rule.
    if (next) setTxn(`TXN${Date.now().toString().slice(-8)}`);
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      const result = await recordUnmatchedPayment({
        amount: Number(amount) || 0,
        channel,
        transactionId: txn || null,
        reason,
      });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setAmount("");
        setReason("");
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
            Record Unmatched Receipt
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Unmatched Receipt</DialogTitle>
          <DialogDescription>
            Money that arrived but can&apos;t be matched to a loan. It is still received and still ledgered — to Suspense — never dropped.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inb-reason">Why it couldn&apos;t be matched</Label>
            <Input
              id="inb-reason"
              placeholder="e.g. Reference not found: LN-2026-999999"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inb-amount">Amount (TZS)</Label>
            <Input id="inb-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => v && setChannel(v as PaymentChannel)}>
              <SelectTrigger aria-label="Channel" className="w-full">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="inb-txn">Provider transaction ID (optional)</Label>
            <Input id="inb-txn" value={txn} onChange={(e) => setTxn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !amount || !reason.trim()}>
            {pending ? "Recording…" : "Record Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
