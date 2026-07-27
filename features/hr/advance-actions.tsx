"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, Plus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { decideStaffAdvance, disburseStaffAdvance, requestStaffAdvance } from "@/features/hr/actions";
import type { ActionResult } from "@/lib/domain/action-result";

const NONE = "__none__";

function useRunner() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  return { pending, run };
}

export function RequestAdvanceForm({ staff }: { staff: { id: string; label: string }[] }) {
  const [staffId, setStaffId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const { pending, run } = useRunner();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Staff member</Label>
        <Select value={staffId || NONE} onValueChange={(v) => setStaffId(v === NONE ? "" : (v ?? ""))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select staff">{(v: string) => staff.find((s) => s.id === v)?.label ?? "Select staff"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} className="text-muted-foreground">
              Select staff
            </SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="adv-amount">Amount (TZS)</Label>
        <div className="flex gap-2">
          <Input id="adv-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button
            size="sm"
            disabled={pending || !staffId || Number(amount) <= 0}
            onClick={() =>
              run(async () => {
                const r = await requestStaffAdvance(staffId, Number(amount) || 0);
                if (r.ok) {
                  setStaffId("");
                  setAmount("");
                }
                return r;
              })
            }
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Request
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * HR approves; only Finance disburses (§11 is explicit that disbursement is
 * never HR's to execute), so the two buttons are gated separately.
 */
export function AdvanceDecisionButtons({
  advanceId,
  status,
  canApprove,
  canDisburse,
}: {
  advanceId: string;
  status: string;
  canApprove: boolean;
  canDisburse: boolean;
}) {
  const { pending, run } = useRunner();

  if (status === "requested") {
    if (!canApprove) return <span className="text-xs text-muted-foreground">Awaiting HR approval</span>;
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => decideStaffAdvance(advanceId, true))}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Approve
        </Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => run(() => decideStaffAdvance(advanceId, false))}>
          <X className="size-4" />
          Reject
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    if (!canDisburse) return <span className="text-xs text-muted-foreground">Approved — Finance disburses</span>;
    return (
      <Button size="sm" disabled={pending} onClick={() => run(() => disburseStaffAdvance(advanceId))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Disburse
      </Button>
    );
  }

  return null;
}
