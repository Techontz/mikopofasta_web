"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings";
import { Button, Field, TextInput } from "@/components/settings/form";
import { ReserveSettingInputSchema, type ReserveSetting, type ReserveSettingInput } from "@/types/loan-charge";
import { saveReserveSetting } from "@/features/admin/reserve-setting/actions";

/**
 * Settings → Reserve Setting.
 *
 * A singleton, so this edits in place rather than appending: the field arrives
 * holding the current percentage and Update overwrites it. That is why there is
 * no list beneath, unlike Penalty.
 */
export function ReserveSettingForm({ setting }: { setting: ReserveSetting }) {
  const [pending, startTransition] = useTransition();

  const defaults: ReserveSettingInput = { percentage: setting.percentage };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ReserveSettingInput>({
    resolver: zodResolver(ReserveSettingInputSchema),
    defaultValues: defaults,
  });

  // The server is the source of truth: after a save the revalidated page sends
  // a fresh value down, and the form rebaselines onto it so `isDirty` is honest.
  React.useEffect(() => {
    reset({ percentage: setting.percentage });
  }, [setting.percentage, reset]);

  function onSubmit(values: ReserveSettingInput) {
    startTransition(async () => {
      const result = await saveReserveSetting(values);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <SettingsCard
      title="Reserve Setting"
      description="The share of the portfolio held back as reserve."
      footer={
        <Button type="submit" form="reserve-form" tone="primary" loading={pending} disabled={!isDirty}>
          {pending ? "Saving…" : "Update"}
        </Button>
      }
    >
      <form id="reserve-form" onSubmit={handleSubmit(onSubmit)}>
        <Field
          label="Reserve Percentage"
          htmlFor="reserve-percentage"
          required
          error={errors.percentage?.message}
          help="A share of the portfolio, 0–100. This is the policy figure; the reserve balance itself is held in ledger account 3000."
          className="sm:max-w-sm"
        >
          {/*
            No min/max attributes. Native constraint validation runs before
            requestSubmit() hands over, so a `max` here would block the form
            with a browser bubble and the inline message below could never
            appear. Zod owns the bounds, as it does on the fee and penalty
            forms, and the API enforces them again regardless.
          */}
          <TextInput
            id="reserve-percentage"
            type="number"
            step="0.01"
            inputMode="decimal"
            suffix="%"
            invalid={!!errors.percentage}
            {...register("percentage", { valueAsNumber: true })}
          />
        </Field>
      </form>
    </SettingsCard>
  );
}
