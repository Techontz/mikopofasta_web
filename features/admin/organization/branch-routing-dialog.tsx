"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Route } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Field, IconButton, Select } from "@/components/settings/form";
import { StatusBadge } from "@/components/settings";
import { updateBranchApprovalRoute } from "@/features/admin/organization/branches-actions";
import type { BranchRouteStage } from "@/lib/api/organization";
import type { Branch } from "@/types/branch";

/**
 * Which approval tiers this branch's applications must clear — client decision D4.
 *
 *     A branch WITH a zone:    Branch Manager → Zone → Head Office Credit
 *     A branch WITHOUT a zone: Branch Manager → Head Office Credit
 *
 * Each stage offers three answers rather than a checkbox, because a checkbox
 * cannot say "follow the branch". "Default" means the routing tracks whatever
 * the branch's zone happens to be, now and after any later reassignment;
 * "Always"/"Never" pin it regardless. Collapsing those to on/off would silently
 * freeze routing at whatever the zone was on the day somebody opened the form.
 *
 * Only stages that can vary are offered. A stage with no zone rule applies
 * everywhere, and presenting a control that changes nothing invites somebody to
 * use it.
 */
export function BranchRoutingDialog({ branch, stages }: { branch: Branch; stages: BranchRouteStage[] }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const [choices, setChoices] = React.useState<Record<string, string>>(() => toChoices(stages));

  const configurable = stages.filter((s) => s.requiresBranchZone);

  function submit() {
    startTransition(async () => {
      const result = await updateBranchApprovalRoute(
        branch.id,
        Object.entries(choices).map(([stageId, choice]) => ({
          stageId,
          required: choice === "default" ? null : choice === "always",
        }))
      );

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setChoices(toChoices(stages));
      }}
      trigger={<IconButton icon={Route} label={`Approval routing for ${branch.name}`} tone="secondary" />}
      title="Approval Routing"
      description={`Which tiers must approve a loan raised at ${branch.name}.`}
      formId="branch-routing-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      submitLabel="Save routing"
      pending={pending}
      size="lg"
    >
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.stageId} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{stage.name}</p>
              <p className="text-xs text-muted-foreground">
                {stage.requiresBranchZone
                  ? branch.zoneId
                    ? "This branch belongs to a zone."
                    : "This branch has no zone."
                  : "Applies to every branch."}
              </p>
            </div>
            <StatusBadge tone={stage.included ? "active" : "inactive"} className="shrink-0">
              {stage.included ? "In the chain" : "Skipped"}
            </StatusBadge>
          </div>
        ))}
      </div>

      {configurable.map((stage) => (
        <Field
          key={stage.stageId}
          label={stage.name}
          htmlFor={`route-${stage.stageId}`}
          help="Default follows the branch's zone. Always or Never overrides it."
        >
          <Select
            id={`route-${stage.stageId}`}
            value={choices[stage.stageId] ?? "default"}
            onChange={(e) => setChoices((prev) => ({ ...prev, [stage.stageId]: e.target.value }))}
          >
            <option value="default">Default — follow the branch&apos;s zone</option>
            <option value="always">Always require this tier</option>
            <option value="never">Never require this tier</option>
          </Select>
        </Field>
      ))}

      <p className="text-xs text-muted-foreground">
        Loans already in progress keep the route they were given when they were raised. Only new
        applications follow a change made here.
      </p>
    </SettingsDialog>
  );
}

function toChoices(stages: BranchRouteStage[]): Record<string, string> {
  return Object.fromEntries(
    stages.map((s) => [s.stageId, s.override === null ? "default" : s.override ? "always" : "never"])
  );
}
