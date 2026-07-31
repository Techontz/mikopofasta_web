"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, TextInput } from "@/components/settings/form";
import { RepaymentScheduleSchema } from "@/types/loan-product";
import type { RepaymentScheduleRecord } from "@/lib/api/system-configuration";
import { createRepaymentSchedule, updateRepaymentSchedule } from "@/features/admin/repayment-schedules/actions";

const FormSchema = RepaymentScheduleSchema.pick({ name: true, code: true, frequencyDays: true });
type FormValues = z.infer<typeof FormSchema>;

export function ScheduleFormDialog({ schedule }: { schedule?: RepaymentScheduleRecord }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(schedule);

  /*
   * The frequency is what generated every instalment date on every loan using
   * this schedule. Changing it would leave those loans with a cadence their own
   * configuration no longer explains, and nothing regenerates them — so the API
   * refuses with a 409 and the field is read-only here.
   *
   * The name and code stay editable. They are labels, and correcting one
   * changes no arithmetic.
   */
  // readOnly rather than disabled, where it is applied below: a disabled input
  // submits nothing, and the save would then fail on a field nobody touched.
  const frequencyLocked = (schedule?.loanCount ?? 0) > 0;

  const defaults: FormValues = { name: schedule?.name ?? "", code: schedule?.code ?? "", frequencyDays: schedule?.frequencyDays ?? 7 };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateRepaymentSchedule(schedule!.id, values) : await createRepaymentSchedule(values);
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
        if (next) reset(defaults);
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${schedule!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Schedule
          </Button>
        )
      }
      title={isEdit ? "Edit Repayment Schedule" : "New Repayment Schedule"}
      description="The cadence a loan's installments follow — independent of the customer category and loan product."
      formId="schedule-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create schedule"}
      pending={pending}
    >
      <FieldGrid>
        <Field label="Name" htmlFor="sched-name" required error={errors.name?.message}>
          <TextInput id="sched-name" placeholder="e.g. Bi-weekly" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field
          label="Code"
          htmlFor="sched-code"
          required
          error={errors.code?.message}
          help="Used by the schedule generator; not shown to customers."
        >
          <TextInput id="sched-code" placeholder="e.g. BIWEEKLY" className="font-mono" invalid={!!errors.code} {...register("code")} />
        </Field>
      </FieldGrid>

      <Field
        label="Frequency"
        htmlFor="sched-freq"
        required
        error={errors.frequencyDays?.message}
        help={
          frequencyLocked
            ? `Locked — ${schedule!.loanCount} loan${schedule!.loanCount === 1 ? " is" : "s are"} running on this cadence.`
            : "Days between installments. 7 is weekly, 30 monthly."
        }
        className="sm:max-w-[220px]"
      >
        <TextInput
          id="sched-freq"
          type="number"
          min="1"
          inputMode="numeric"
          suffix="days"
          readOnly={frequencyLocked}
          invalid={!!errors.frequencyDays}
          {...register("frequencyDays", { valueAsNumber: true })}
        />
      </Field>
    </SettingsDialog>
  );
}
