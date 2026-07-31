"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { SectionDivider } from "@/components/settings";
import { Button, Field, FieldGrid, IconButton, Select, TextInput, Toggle } from "@/components/settings/form";
import { LoanProductSchema, type LoanProduct, type InterestFormula, type RepaymentSchedule } from "@/types/loan-product";
import { PENALTY_TYPES } from "@/types/enums";
import { createLoanProduct, updateLoanProduct } from "@/features/admin/loan-products/actions";

const FormSchema = LoanProductSchema.pick({
  name: true,
  code: true,
  interestFormulaId: true,
  interestRate: true,
  minAmount: true,
  maxAmount: true,
  minTenureDays: true,
  maxTenureDays: true,
  penaltyType: true,
  penaltyRate: true,
  penaltyGraceDays: true,
  penaltyCapAmount: true,
  requiresMandate: true,
  status: true,
}).extend({ repaymentScheduleIds: z.array(z.string()) });
type FormValues = z.infer<typeof FormSchema>;

interface ProductFormDialogProps {
  product?: LoanProduct;
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
  productScheduleIds?: string[];
}

function defaultsFor(product: ProductFormDialogProps["product"], productScheduleIds: string[]): FormValues {
  return {
    name: product?.name ?? "",
    code: product?.code ?? "",
    interestFormulaId: product?.interestFormulaId ?? "",
    interestRate: product?.interestRate ?? 10,
    minAmount: product?.minAmount ?? 100_000,
    maxAmount: product?.maxAmount ?? 1_000_000,
    minTenureDays: product?.minTenureDays ?? 30,
    maxTenureDays: product?.maxTenureDays ?? 180,
    penaltyType: product?.penaltyType ?? "percentage_of_overdue",
    penaltyRate: product?.penaltyRate ?? 5,
    penaltyGraceDays: product?.penaltyGraceDays ?? 3,
    penaltyCapAmount: product?.penaltyCapAmount ?? null,
    requiresMandate: product?.requiresMandate ?? false,
    status: product?.status ?? "active",
    repaymentScheduleIds: productScheduleIds,
  };
}

export function ProductFormDialog({ product, formulas, schedules, productScheduleIds = [] }: ProductFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaultsFor(product, productScheduleIds) });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateLoanProduct(product!.id, values) : await createLoanProduct(values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const selectedSchedules = useWatch({ control, name: "repaymentScheduleIds" }) ?? [];
  const interestFormulaId = useWatch({ control, name: "interestFormulaId" });
  const penaltyType = useWatch({ control, name: "penaltyType" });
  const penaltyCapAmount = useWatch({ control, name: "penaltyCapAmount" });
  const requiresMandate = useWatch({ control, name: "requiresMandate" });
  const status = useWatch({ control, name: "status" });

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultsFor(product, productScheduleIds));
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${product!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Product
          </Button>
        )
      }
      title={isEdit ? "Edit Loan Product" : "New Loan Product"}
      description="Every commercial term is configured here — nothing is hardcoded in the loan engine."
      formId="loan-product-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create product"}
      pending={pending}
      size="lg"
    >
      <FieldGrid>
        <Field label="Name" htmlFor="prod-name" required error={errors.name?.message}>
          <TextInput id="prod-name" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Code" htmlFor="prod-code" required error={errors.code?.message}>
          <TextInput id="prod-code" className="font-mono" invalid={!!errors.code} {...register("code")} />
        </Field>
      </FieldGrid>

      <SectionDivider label="Interest" />

      <FieldGrid>
        <Field label="Interest formula" htmlFor="prod-formula" error={errors.interestFormulaId?.message}>
          <Select
            id="prod-formula"
            value={interestFormulaId}
            onChange={(e) => setValue("interestFormulaId", e.target.value, { shouldDirty: true })}
          >
            {formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Interest rate" htmlFor="prod-rate" required error={errors.interestRate?.message}>
          <TextInput
            id="prod-rate"
            type="number"
            step="0.1"
            suffix="%"
            invalid={!!errors.interestRate}
            {...register("interestRate", { valueAsNumber: true })}
          />
        </Field>
      </FieldGrid>

      <SectionDivider label="Limits" />

      <FieldGrid>
        <Field label="Min amount" htmlFor="prod-min-amount" required error={errors.minAmount?.message}>
          <TextInput id="prod-min-amount" type="number" suffix="TZS" invalid={!!errors.minAmount} {...register("minAmount", { valueAsNumber: true })} />
        </Field>
        <Field label="Max amount" htmlFor="prod-max-amount" required error={errors.maxAmount?.message}>
          <TextInput id="prod-max-amount" type="number" suffix="TZS" invalid={!!errors.maxAmount} {...register("maxAmount", { valueAsNumber: true })} />
        </Field>
        <Field label="Min tenure" htmlFor="prod-min-tenure" required error={errors.minTenureDays?.message}>
          <TextInput id="prod-min-tenure" type="number" suffix="days" invalid={!!errors.minTenureDays} {...register("minTenureDays", { valueAsNumber: true })} />
        </Field>
        <Field label="Max tenure" htmlFor="prod-max-tenure" required error={errors.maxTenureDays?.message}>
          <TextInput id="prod-max-tenure" type="number" suffix="days" invalid={!!errors.maxTenureDays} {...register("maxTenureDays", { valueAsNumber: true })} />
        </Field>
      </FieldGrid>

      <SectionDivider label="Penalty" />

      <FieldGrid>
        <Field
          label="Penalty type"
          htmlFor="prod-penalty-type"
          error={errors.penaltyType?.message}
          help="Decides whether the rate below is read as a percentage or a flat amount."
        >
          <Select
            id="prod-penalty-type"
            className="capitalize"
            value={penaltyType}
            onChange={(e) => setValue("penaltyType", e.target.value as FormValues["penaltyType"], { shouldDirty: true })}
          >
            {PENALTY_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Penalty rate" htmlFor="prod-penalty-rate" error={errors.penaltyRate?.message}>
          <TextInput
            id="prod-penalty-rate"
            type="number"
            step="0.1"
            suffix={penaltyType === "flat_fee" ? "TZS" : "%"}
            invalid={!!errors.penaltyRate}
            {...register("penaltyRate", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Penalty grace" htmlFor="prod-grace" error={errors.penaltyGraceDays?.message}>
          <TextInput id="prod-grace" type="number" suffix="days" invalid={!!errors.penaltyGraceDays} {...register("penaltyGraceDays", { valueAsNumber: true })} />
        </Field>
        <Field label="Penalty cap" htmlFor="prod-cap" help="Optional ceiling on accrued penalty.">
          {/* Nullable: an empty box means no cap, not zero. */}
          <TextInput
            id="prod-cap"
            type="number"
            suffix="TZS"
            value={penaltyCapAmount ?? ""}
            onChange={(e) => setValue("penaltyCapAmount", e.target.value ? Number(e.target.value) : null, { shouldDirty: true })}
          />
        </Field>
      </FieldGrid>

      <SectionDivider label="Terms" />

      <Toggle
        id="prod-mandate"
        label="Requires E-Mandate"
        help="The borrower must authorise direct debit before disbursement."
        checked={requiresMandate}
        onCheckedChange={(next) => setValue("requiresMandate", next, { shouldDirty: true })}
      />

      <Field label="Status" htmlFor="prod-status" error={errors.status?.message} className="sm:max-w-[220px]">
        <Select
          id="prod-status"
          className="capitalize"
          value={status}
          onChange={(e) => setValue("status", e.target.value as FormValues["status"], { shouldDirty: true })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Field>

      <Field
        label="Allowed repayment schedules"
        error={errors.repaymentScheduleIds?.message}
        help="Which cadences a borrower may choose for this product."
      >
        <div className="flex flex-wrap gap-2 pt-1">
          {schedules.map((schedule) => {
            const checked = selectedSchedules.includes(schedule.id);
            return (
              <label
                key={schedule.id}
                className="flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px] transition-colors"
                style={{
                  borderColor: checked ? "var(--st-accent)" : "var(--st-line)",
                  background: checked ? "var(--st-accent-soft)" : "var(--st-card)",
                  color: checked ? "var(--st-accent)" : "var(--st-ink-soft)",
                }}
              >
                <input
                  type="checkbox"
                  id={`sched-${schedule.id}`}
                  className="size-3.5 accent-[var(--st-accent)]"
                  checked={checked}
                  onChange={(e) =>
                    setValue(
                      "repaymentScheduleIds",
                      e.target.checked
                        ? [...selectedSchedules, schedule.id]
                        : selectedSchedules.filter((id) => id !== schedule.id),
                      { shouldDirty: true }
                    )
                  }
                />
                {schedule.name}
              </label>
            );
          })}
        </div>
      </Field>
    </SettingsDialog>
  );
}
