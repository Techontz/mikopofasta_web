"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Play, Send } from "lucide-react";
import { Button, Field, TextInput } from "@/components/settings/form";
import { finalizePayroll, generatePayroll, payPayroll } from "@/features/hr/actions";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * The payroll run's controls.
 *
 * PRESENTATION ONLY. All three server actions, the period validation, the
 * transition runner, the toasts and §11's generate/finalize/pay permission
 * split are exactly as they were — only the controls are now the Menu module's.
 */

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
      <Field label="Period" htmlFor="payroll-period">
        <TextInput
          id="payroll-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="2026-07"
          className="w-36"
        />
      </Field>
      <Button
        tone="primary"
        icon={Play}
        loading={pending}
        disabled={pending || !/^\d{4}-\d{2}$/.test(period)}
        onClick={() => run(() => generatePayroll(period))}
      >
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
        <p className="text-[13px] text-[var(--st-ink-soft)]">
          Draft — awaiting Finance to finalize. {canGenerate && "HR can generate but never finalize."}
        </p>
      );
    }
    return (
      <Button
        tone="primary"
        icon={CheckCircle2}
        loading={pending}
        disabled={pending}
        onClick={() => run(() => finalizePayroll(runId))}
      >
        Finalize &amp; Post to Ledger
      </Button>
    );
  }

  if (status === "finalized") {
    if (!canFinalize) {
      return (
        <p className="text-[13px] text-[var(--st-ink-soft)]">
          Finalized — awaiting Finance to execute payment.
        </p>
      );
    }
    return (
      <Button
        tone="primary"
        icon={Send}
        loading={pending}
        disabled={pending}
        onClick={() => run(() => payPayroll(runId))}
      >
        Execute Payment
      </Button>
    );
  }

  return (
    <p className="text-[13px] text-[var(--st-ink-soft)]">
      Paid — salaries have been transferred and posted.
    </p>
  );
}
