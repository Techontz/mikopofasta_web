"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button, Field, Select } from "@/components/settings/form";
import { setStaffEmploymentStatus } from "@/features/hr/actions";
import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@/types/enums";

/**
 * Suspend, terminate or reinstate an employee.
 *
 * `setStaffEmploymentStatus` has been in `features/hr/actions.ts` all along,
 * wrapping `PUT /staff/{id}` and gated on `hr.manage`. Nothing in the interface
 * called it. So the API could suspend an employee, the server action could
 * suspend an employee, and there was no way for HR to suspend an employee —
 * which also meant the Inactive Staff list could only ever be populated by
 * someone editing the database.
 *
 * It goes on the staff record rather than in the staff list, for the same
 * reason freezing a customer does: this is a consequential change to one named
 * person, and it belongs where you can see who that person is.
 *
 * No confirmation dialog, deliberately — the change is a visible field on the
 * page, it is reversible by making it again, and it does not move money.
 */
const LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  terminated: "Terminated",
};

export function EmploymentStatusControl({
  staffId,
  current,
}: {
  staffId: string;
  current: EmploymentStatus;
}) {
  const [choice, setChoice] = React.useState<EmploymentStatus>(current);
  const [pending, startTransition] = useTransition();

  /*
   * `current` is the server's answer. When a save succeeds the page revalidates
   * and a new `current` arrives, so the dropdown follows it rather than holding
   * whatever was last picked — and if the save fails, the revert is automatic
   * for the same reason.
   */
  const [seen, setSeen] = React.useState(current);
  if (seen !== current) {
    setSeen(current);
    setChoice(current);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Employment status" htmlFor="employment-status">
        <Select
          id="employment-status"
          value={choice}
          disabled={pending}
          onChange={(e) => setChoice(e.target.value as EmploymentStatus)}
          className="w-44"
        >
          {EMPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        tone="primary"
        icon={Check}
        loading={pending}
        disabled={pending || choice === current}
        onClick={() =>
          startTransition(async () => {
            const result = await setStaffEmploymentStatus(staffId, choice);
            if (result.ok) toast.success(result.message);
            else toast.error(result.message);
          })
        }
      >
        Save
      </Button>
    </div>
  );
}
