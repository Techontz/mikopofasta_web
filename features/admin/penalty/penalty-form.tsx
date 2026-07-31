"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings";
import { Button, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import {
  CHARGE_VALUE_TYPES,
  CHARGE_VALUE_TYPE_LABELS,
  PenaltySettingFormSchema,
  type PenaltySettingInput,
} from "@/types/loan-charge";
import { savePenaltySetting } from "@/features/admin/penalty/actions";

/**
 * The form half of Settings → Penalty: calculation type and amount, saved by
 * Update, exactly as the legacy screen arranges it.
 *
 * As with the loan fee, the unit of `amount` depends on the type beside it, so
 * the field re-labels itself rather than leaving the reader to guess whether
 * "20" means twenty shillings or twenty percent.
 */
export function PenaltyForm() {
  const [pending, startTransition] = useTransition();

  const defaults: PenaltySettingInput = { calculationType: "percentage_value", amount: 0 };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PenaltySettingInput>({
    resolver: zodResolver(PenaltySettingFormSchema),
    defaultValues: defaults,
  });

  // useWatch rather than watch(): the latter hands back a new function every
  // render, which makes the React Compiler skip memoizing this component.
  const calculationType = useWatch({ control, name: "calculationType" });
  const isPercentage = calculationType === "percentage_value";

  function onSubmit(values: PenaltySettingInput) {
    startTransition(async () => {
      const result = await savePenaltySetting(values);
      if (result.ok) {
        toast.success(result.message);
        reset(defaults);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsCard
      title="Penalty Setting"
      description="The organisation-wide default. It does not re-price loans already on the book — each loan carries the penalty rate it was opened with."
      footer={
        <Button type="submit" form="penalty-form" tone="primary" loading={pending}>
          {pending ? "Saving…" : "Update"}
        </Button>
      }
    >
      <form id="penalty-form" onSubmit={handleSubmit(onSubmit)}>
        <FieldGrid>
          <Field
            label="Calculation type"
            htmlFor="penalty-type"
            error={errors.calculationType?.message}
            help="Whether the amount below is a flat charge or a share of the overdue balance."
          >
            <Select id="penalty-type" invalid={!!errors.calculationType} {...register("calculationType")}>
              {CHARGE_VALUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CHARGE_VALUE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Penalty amount"
            htmlFor="penalty-amount"
            required
            error={errors.amount?.message}
            help={isPercentage ? "A share of the overdue balance, 0–100." : "A flat amount in TZS."}
          >
            <TextInput
              id="penalty-amount"
              type="number"
              step={isPercentage ? "0.01" : "1"}
              min="0"
              inputMode="decimal"
              suffix={isPercentage ? "%" : "TZS"}
              invalid={!!errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
          </Field>
        </FieldGrid>
      </form>
    </SettingsCard>
  );
}
