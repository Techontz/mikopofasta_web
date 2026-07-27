"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Play, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { finalizePayroll, generatePayroll, payPayroll } from "@/features/hr/actions";
import type { ActionResult } from "@/lib/domain/action-result";

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

/** HR only — produces a draft run; nothing posts to the ledger yet (§11). */
export function GeneratePayrollForm() {
  const [period, setPeriod] = React.useState(new Date().toISOString().slice(0, 7));
  const { pending, run } = useRunner();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="payroll-period">Period</Label>
        <Input id="payroll-period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-07" className="w-36" />
      </div>
      <Button size="sm" disabled={pending || !/^\d{4}-\d{2}$/.test(period)} onClick={() => run(() => generatePayroll(period))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        Generate Draft
      </Button>
    </div>
  );
}

export function PayrollRunActions({
  runId,
  status,
  canGenerate,
  canFinalize,
}: {
  runId: string;
  status: string;
  canGenerate: boolean;
  canFinalize: boolean;
}) {
  const { pending, run } = useRunner();

  if (status === "draft") {
    if (!canFinalize) {
      return (
        <p className="text-sm text-muted-foreground">
          Draft — awaiting Finance to finalize. {canGenerate && "HR can generate but never finalize."}
        </p>
      );
    }
    return (
      <Button size="sm" disabled={pending} onClick={() => run(() => finalizePayroll(runId))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        Finalize &amp; Post to Ledger
      </Button>
    );
  }

  if (status === "finalized") {
    if (!canFinalize) return <p className="text-sm text-muted-foreground">Finalized — awaiting Finance to execute payment.</p>;
    return (
      <Button size="sm" disabled={pending} onClick={() => run(() => payPayroll(runId))}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Execute Payment
      </Button>
    );
  }

  return <p className="text-sm text-muted-foreground">Paid — salaries have been transferred and posted.</p>;
}
