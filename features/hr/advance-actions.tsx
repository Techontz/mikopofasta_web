"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Plus, Send, X } from "lucide-react";
import { Button, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import { decideStaffAdvance, disburseStaffAdvance, requestStaffAdvance } from "@/features/hr/actions";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * The advance request form and its decision buttons.
 *
 * PRESENTATION ONLY. Both server actions, the transition runner, the toasts,
 * the disabled rules and §11's approve/disburse permission split are exactly as
 * they were. What changed is the controls: the Menu module's Field, Select,
 * TextInput and Button replace the shadcn ones, so an HR form looks like an
 * Expenses form.
 *
 * The staff picker is now a native select rather than the shadcn combobox —
 * the same control every other form in the Menu modules uses, which is why the
 * `__none__` sentinel it needed is gone: an empty option value carries that
 * meaning natively.
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

export function RequestAdvanceForm({ staff }: { staff: { id: string; label: string }[] }) {
  const [staffId, setStaffId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const { pending, run } = useRunner();

  return (
    <FieldGrid columns={3}>
      <Field label="Staff member" htmlFor="adv-staff" className="sm:col-span-2">
        <Select id="adv-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Select staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Amount (TZS)" htmlFor="adv-amount">
        <div className="flex gap-2">
          <TextInput
            id="adv-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button
            tone="primary"
            icon={Plus}
            loading={pending}
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
            Request
          </Button>
        </div>
      </Field>
    </FieldGrid>
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
    if (!canApprove) {
      return <span className="text-[12px] text-[var(--st-ink-soft)]">Awaiting HR approval</span>;
    }
    return (
      <div className="flex gap-2">
        <Button
          tone="primary"
          icon={Check}
          loading={pending}
          disabled={pending}
          onClick={() => run(() => decideStaffAdvance(advanceId, true))}
        >
          Approve
        </Button>
        <Button
          tone="danger"
          icon={X}
          disabled={pending}
          onClick={() => run(() => decideStaffAdvance(advanceId, false))}
        >
          Reject
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    if (!canDisburse) {
      return <span className="text-[12px] text-[var(--st-ink-soft)]">Approved — Finance disburses</span>;
    }
    return (
      <Button
        tone="primary"
        icon={Send}
        loading={pending}
        disabled={pending}
        onClick={() => run(() => disburseStaffAdvance(advanceId))}
      >
        Disburse
      </Button>
    );
  }

  return null;
}
