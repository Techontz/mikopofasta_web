"use client";

import * as React from "react";
import { ArrowDown, Check, Info, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { SettingsCard } from "@/components/settings";
import { cn } from "@/lib/utils";
import { removeStage, saveStage } from "@/features/admin/approval-stages/actions";
import type { ApprovalStageRecord } from "@/lib/api/approval-stages";

/**
 * Administration → Loan Approval Chain.
 *
 * WHAT IT CONFIGURES. Who signs a loan off, in what order, and what each stage
 * does on the way through. Branch Manager → Zone → Head Office Credit is what
 * this institution happens to run; it is a row order, not a rule in the code,
 * and an institution with two tiers or five configures them here.
 *
 * LOANS IN FLIGHT ARE NOT AFFECTED. Each loan carries its own copy of the
 * chain, taken when it was raised, so editing this changes what the NEXT
 * application walks and never reroutes one already moving. That is what makes
 * it safe to edit during business hours, and it is worth saying on the screen
 * because it is the first thing an administrator will worry about.
 *
 * WHAT CANNOT BE INVENTED. `loanStatus` comes from the API's own list — each
 * value is one the `loans.status` column can hold, and a stage pointing at a
 * status the column cannot store would strand every loan that reached it.
 * `requiredPermission` is checked against the application's permission list,
 * so a typo cannot create a stage nobody is able to act on.
 */
export function ApprovalChainPanel({
  stages,
  availableStatuses,
  permissions,
}: {
  stages: ApprovalStageRecord[];
  availableStatuses: string[];
  /** The application's permission names — a stage must name a real one. */
  permissions: string[];
}) {
  const [editing, setEditing] = React.useState<ApprovalStageRecord | null>(null);
  const [creating, setCreating] = React.useState(false);

  const ordered = [...stages].sort((a, b) => a.sequence - b.sequence);
  const live = ordered.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <SettingsCard
        title="The chain"
        description="Every application walks these stages in order. A stage that is switched off is skipped."
      >
        <div className="space-y-4">
          {ordered.length === 0 ? (
            <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">No approval stages configured</p>
              <p className="mx-auto max-w-md text-xs text-muted-foreground">
                Until at least one stage exists, a submitted loan has nowhere to go. Add the tiers
                your institution approves through — a branch decision, then whatever oversight sits
                above it.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden />
                Add the first stage
              </Button>
            </div>
          ) : (
            <>
              {/* The chain as it actually runs, read top to bottom. */}
              <ol className="space-y-2">
                {ordered.map((stage, i) => (
                  <li key={stage.id}>
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3",
                        !stage.isActive && "opacity-60",
                      )}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
                        {stage.sequence}
                      </span>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {stage.name}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">
                            {stage.code}
                          </code>
                          {!stage.isActive && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </p>
                        {stage.description && (
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        )}
                        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                          <span>
                            Waits at <code className="font-mono">{stage.loanStatus}</code>
                          </span>
                          <span>
                            Decided by <code className="font-mono">{stage.requiredPermission}</code>
                          </span>
                          {stage.requiresBranchZone && <Flag>Only for branches in a zone</Flag>}
                          {stage.requiresMandateBefore && <Flag>E-mandate first</Flag>}
                          {stage.issuesPaymentReference && <Flag>Issues the payment reference</Flag>}
                        </p>
                      </div>

                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(stage)}>
                        <Pencil className="size-4" aria-hidden />
                        <span className="sr-only">Edit {stage.name}</span>
                      </Button>

                      <ConfirmDeleteDialog
                        title={`Remove ${stage.name}?`}
                        description="Refused once loans have been decided at this stage — the decision history points here. Deactivate it instead, which keeps the history readable and stops new loans reaching it."
                        successMessage={`${stage.name} removed.`}
                        trigger={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" aria-hidden />
                            <span className="sr-only">Remove {stage.name}</span>
                          </Button>
                        }
                        onConfirm={() => removeStage(stage.id)}
                      />
                    </div>

                    {i < ordered.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="size-3.5 text-muted-foreground/50" aria-hidden />
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    Loans already in flight are not affected. Each one carries the chain it was
                    raised under, so changes here apply to the next application.
                    {live.length === 0 && (
                      <span className="block font-medium text-destructive">
                        Every stage is switched off — a submitted loan would go straight to Finance.
                      </span>
                    )}
                  </span>
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
                  <Plus className="size-4" aria-hidden />
                  Add stage
                </Button>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      <StageDialog
        key={`${editing?.id ?? "new"}-${creating}`}
        open={creating || editing !== null}
        stage={editing}
        availableStatuses={availableStatuses}
        permissions={permissions}
        nextSequence={(ordered.at(-1)?.sequence ?? 0) + 10}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-1.5 py-0.5">{children}</span>;
}

function StageDialog({
  open,
  stage,
  availableStatuses,
  permissions,
  nextSequence,
  onClose,
}: {
  open: boolean;
  stage: ApprovalStageRecord | null;
  availableStatuses: string[];
  permissions: string[];
  nextSequence: number;
  onClose: () => void;
}) {
  /*
   * Initialised once from the stage. The parent keys this component on the
   * stage id, so React remounts it and the state resets — no render-phase
   * write, no ref read while rendering.
   */
  const [form, setForm] = React.useState({
    code: stage?.code ?? "",
    name: stage?.name ?? "",
    description: stage?.description ?? "",
    sequence: String(stage?.sequence ?? nextSequence),
    loanStatus: stage?.loanStatus ?? availableStatuses[0] ?? "",
    requiredPermission: stage?.requiredPermission ?? permissions[0] ?? "",
    requiresMandateBefore: stage?.requiresMandateBefore ?? false,
    requiresBranchZone: stage?.requiresBranchZone ?? false,
    issuesPaymentReference: stage?.issuesPaymentReference ?? false,
    isActive: stage?.isActive ?? true,
  });
  const [pending, setPending] = React.useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setPending(true);
    const result = await saveStage(stage?.id ?? null, {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() === "" ? null : form.description.trim(),
      sequence: Number(form.sequence),
      loanStatus: form.loanStatus,
      requiredPermission: form.requiredPermission,
      requiresMandateBefore: form.requiresMandateBefore,
      requiresBranchZone: form.requiresBranchZone,
      issuesPaymentReference: form.issuesPaymentReference,
      isActive: form.isActive,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.message ?? "Could not save the stage.");
      return;
    }

    toast.success(result.message);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage ? `Edit ${stage.name}` : "Add an approval stage"}</DialogTitle>
          <DialogDescription>
            A tier in the chain a loan walks after it is submitted. Order decides the sequence.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" hint={stage ? "Fixed after creation." : undefined}>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                disabled={stage !== null}
                className="font-mono uppercase"
                placeholder="BRANCH_MANAGER"
              />
            </Field>
            <Field label="Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional. What this tier is deciding."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Order" hint="Lower runs first. Must be unique.">
              <Input
                type="number"
                inputMode="numeric"
                value={form.sequence}
                onChange={(e) => set("sequence", e.target.value)}
              />
            </Field>
            <Field label="Waits at status" hint="From the statuses a loan can hold.">
              <select
                value={form.loanStatus}
                onChange={(e) => set("loanStatus", e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 font-mono text-xs"
              >
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Decided by" hint="The permission a user must hold to act at this stage.">
            <select
              value={form.requiredPermission}
              onChange={(e) => set("requiredPermission", e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 font-mono text-xs"
            >
              {permissions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-3 rounded-lg border p-3">
            <Toggle
              checked={form.requiresBranchZone}
              onChange={(v) => set("requiresBranchZone", v)}
              label="Only for branches in a zone"
              hint="A branch with no zone skips this stage entirely rather than stalling at it."
            />
            <Toggle
              checked={form.requiresMandateBefore}
              onChange={(v) => set("requiresMandateBefore", v)}
              label="E-mandate must be live first"
              hint="Loans on a product requiring a bank mandate complete the OTP flow before reaching here."
            />
            <Toggle
              checked={form.issuesPaymentReference}
              onChange={(v) => set("issuesPaymentReference", v)}
              label="Issues the customer payment reference"
              hint="The reference is minted when this stage approves."
            />
            <Toggle
              checked={form.isActive}
              onChange={(v) => set("isActive", v)}
              label="Active"
              hint="An inactive stage is skipped by new applications."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            <X className="size-4" aria-hidden />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || !form.code.trim() || !form.name.trim() || !form.requiredPermission}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {stage ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <div className="space-y-0.5">
        <p className="text-sm">{label}</p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
