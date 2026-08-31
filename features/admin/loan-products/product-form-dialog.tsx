"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { requiredText } from "@/lib/forms/required-text";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { LoanProductSchema, type LoanProduct, type InterestFormula, type RepaymentSchedule } from "@/types/loan-product";
import { createLoanProduct, updateLoanProduct, type ProductInputValues } from "@/features/admin/loan-products/actions";
import type { LoanProductWithConfig } from "@/lib/api/loans";
import type { ApprovalStageRecord } from "@/lib/api/approval-stages";
import type { CustomerCategory } from "@/types/customer";

/**
 * An empty numeric box is ABSENT, not zero.
 *
 * `valueAsNumber` turns "" into NaN, which then fails a min() rule the officer
 * never triggered — they simply left an optional field alone.
 */
/** `Business Loan` -> `BUSINESS_LOAN`. An internal key, never asked for. */
const deriveCode = (name: string): string =>
  (name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "PRODUCT").slice(0, 40);

const numberOrNull = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

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
}).extend({
  name: requiredText("Name"),
  code: requiredText("Code"),
  /* The API rejects a product with no schedule attached — "Select at least one
     repayment schedule" — so the form says it beside the checkboxes instead of
     after a round trip. */
  repaymentScheduleIds: z.array(z.string()).min(1, "Select at least one repayment schedule."),

  /* The Loan Category screen's own terms. Optional, because a product may
     legitimately state none of them — and every product created before these
     columns existed has none. */
  minRepayments: z.number().int().min(1).max(600).nullable(),
  maxRepayments: z.number().int().min(1).max(600).nullable(),
  allowsDeduction: z.boolean().nullable(),
  /* Derived from the penalty rate, not a column of its own — see internalDefaults. */
  allowsPenalty: z.boolean().nullable(),
  approvalStageId: z.string().nullable(),
  topupPercent: z.number().min(0).max(100).nullable(),
  takeHomePercent: z.number().min(0).max(100).nullable(),
  /* Which Customer Types may borrow it. An empty list means every type — the
     loan gate reads the eligibility rules, and no rules means no restriction. */
  customerTypeIds: z.array(z.string()),
})
  .refine((v) => v.minRepayments == null || v.maxRepayments == null || v.maxRepayments >= v.minRepayments, {
    message: "The maximum number of repayments cannot be below the minimum.",
    path: ["maxRepayments"],
  });
type FormValues = z.infer<typeof FormSchema>;

interface ProductFormDialogProps {
  product?: LoanProduct;
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
  /** Administrator-created Customer Types. Never a literal in this file. */
  customerTypes: CustomerCategory[];
  /** The configured approval chain — the source behind "Approve status". */
  approvalStages: ApprovalStageRecord[];
  productScheduleIds?: string[];
}

function defaultsFor(
  product: ProductFormDialogProps["product"],
  productScheduleIds: string[],
  formulas: InterestFormula[]
): FormValues {
  const full = product as LoanProductWithConfig | undefined;

  return {
    name: product?.name ?? "",
    code: product?.code ?? "",
    minRepayments: full?.minRepayments ?? null,
    maxRepayments: full?.maxRepayments ?? null,
    allowsDeduction: full?.allowsDeduction ?? null,
    /* A product carries a penalty when a rate is actually set on it. */
    allowsPenalty: product ? Number(product.penaltyRate) > 0 : null,
    approvalStageId: full?.approvalStageId ?? null,
    topupPercent: full?.topupPercent ?? null,
    takeHomePercent: full?.takeHomePercent ?? null,
    customerTypeIds: full?.customerTypeIds ?? [],
    /*
     * A NEW product starts on whichever formula the API flags as default —
     * Reducing EMI, per the client's Decision 2. Read from the data rather
     * than named here, so changing the default is a row update and the two
     * sides cannot disagree about what it is.
     *
     * An existing product keeps its own formula, always. Editing a product's
     * name must never silently reprice it.
     */
    interestFormulaId: product?.interestFormulaId ?? formulas.find((f) => f.isDefault)?.id ?? formulas[0]?.id ?? "",
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

export function ProductFormDialog({ product, formulas, schedules, customerTypes, approvalStages, productScheduleIds = [] }: ProductFormDialogProps) {
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
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaultsFor(product, productScheduleIds, formulas) });

  /**
   * What the modal does not ask for.
   *
   * The reference screen collects thirteen things; the product table holds more
   * than that, and every one of the rest is either DERIVED from what was
   * collected or LEFT AS IT WAS. None of it is guessed at:
   *
   *   code            from the name, the way a customer type's is — an internal
   *                   key nobody should have to invent.
   *   tenure in days  the cadence times the repayment count. A weekly product
   *                   repaid over 8 instalments runs 56 days; stating both the
   *                   cadence and the count already says so.
   *   penalty rate    zeroed when the officer answers NO. Answering YES keeps
   *                   the rate the product already carries, because the amount
   *                   is set at Administration → Penalty and this screen only
   *                   asks whether a penalty applies at all.
   *   everything else the value the product already had, or the column default
   *                   on a new one. An unasked question is never an answer of
   *                   "none".
   */
  function internalDefaults(values: FormValues): ProductInputValues {
    const cadenceDays = schedules.find((sc) => sc.id === values.repaymentScheduleIds[0])?.frequencyDays ?? 30;
    const lo = values.minRepayments ?? 1;
    const hi = values.maxRepayments ?? lo;

    /* `allowsPenalty` is a UI question, not a column — it resolves to the
       penalty rate below and is deliberately not part of the payload. */
    const rest = { ...values, allowsPenalty: undefined };
    delete (rest as { allowsPenalty?: unknown }).allowsPenalty;

    return {
      ...rest,
      code: product?.code ?? deriveCode(values.name),
      minTenureDays: Math.max(1, cadenceDays * lo),
      maxTenureDays: Math.max(1, cadenceDays * hi),
      penaltyType: product?.penaltyType ?? "percentage_of_overdue",
      penaltyRate: values.allowsPenalty === false ? 0 : (product?.penaltyRate ?? 0),
      penaltyGraceDays: product?.penaltyGraceDays ?? 0,
      penaltyCapAmount: product?.penaltyCapAmount ?? null,
      requiresMandate: product?.requiresMandate ?? false,
      status: product?.status ?? "active",
      allowsDeduction: values.allowsDeduction ?? false,
    };
  }

  function onSubmit(values: FormValues) {
    const payload = internalDefaults(values);

    startTransition(async () => {
      const result = isEdit ? await updateLoanProduct(product!.id, payload) : await createLoanProduct(payload);
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
  const allowsDeduction = useWatch({ control, name: "allowsDeduction" });
  const allowsPenalty = useWatch({ control, name: "allowsPenalty" });
  const approvalStageId = useWatch({ control, name: "approvalStageId" });
  const selectedCustomerTypes = useWatch({ control, name: "customerTypeIds" }) ?? [];

  /*
   * The screen's fixed words, and the rows behind them.
   *
   * Only two of the four implemented formulas are offered, because only two are
   * on the screen being reproduced. A product already using one of the others
   * keeps it: `formulaCodeOf` returns "" for anything unlisted, so the dropdown
   * shows the placeholder rather than silently rewriting the product's formula
   * to SIMPLE on the next save.
   */
  const formulaIdOf = (code: string): string => formulas.find((f) => f.code === code)?.id ?? "";
  const formulaCodeOf = (id: string): string => {
    const code = formulas.find((f) => f.id === id)?.code;
    return code === "SIMPLE" || code === "FLAT" ? code : "";
  };

  /** branch → BRANCH_MANAGER, hq → HEAD_OFFICE_CREDIT, zone manager → ZONE_MANAGER. */
  const STAGE_CODES: Record<string, string> = {
    branch: "BRANCH_MANAGER",
    hq: "HEAD_OFFICE_CREDIT",
    "zone manager": "ZONE_MANAGER",
  };

  const stageIdOf = (key: string): string | null =>
    key === "" ? null : (approvalStages.find((st) => st.code === STAGE_CODES[key])?.id ?? null);

  const stageKeyOf = (id: string | null): string => {
    if (id === null) return "";
    const code = approvalStages.find((st) => st.id === id)?.code;
    return Object.keys(STAGE_CODES).find((key) => STAGE_CODES[key] === code) ?? "";
  };

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultsFor(product, productScheduleIds, formulas));
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
      title={isEdit ? "Edit Loan Category" : "Create Loan Category"}
      description="The commercial terms of this loan product."
      formId="loan-product-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Save"
      pending={pending}
      size="lg"
    >
      {/*
        * EXACTLY the fields the Loan Category screen shows, and no others.
        *
        * The product table holds more than this — a code, a tenure in days, the
        * penalty rate and grace, fee rates, the mandate flag. None of them is
        * asked for here: an administrator creating a loan category states its
        * commercial terms, and the rest is either derived from those terms or
        * left as it was. See `internalDefaults` below for exactly what is
        * filled in and how.
        */}
      <FieldGrid>
        <Field label="Loan Product name" htmlFor="prod-name" required error={errors.name?.message}>
          <TextInput id="prod-name" placeholder="Loan Category product name" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="From" htmlFor="prod-min-amount" required error={errors.minAmount?.message}>
          <TextInput id="prod-min-amount" type="number" placeholder="eg.1000" {...register("minAmount", { valueAsNumber: true })} />
        </Field>
        <Field label="To" htmlFor="prod-max-amount" required error={errors.maxAmount?.message}>
          <TextInput id="prod-max-amount" type="number" placeholder="eg.10000" {...register("maxAmount", { valueAsNumber: true })} />
        </Field>
        <Field label="Loan Interest(%)" htmlFor="prod-rate" required error={errors.interestRate?.message}>
          <TextInput id="prod-rate" type="number" step="0.001" placeholder="Loan Interest(%)" {...register("interestRate", { valueAsNumber: true })} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Interest Formular" htmlFor="prod-formula" required error={errors.interestFormulaId?.message}>
          {/*
            * FIXED LABELS, resolved to real rows by CODE.
            *
            * The two the screen offers, worded exactly as it words them. The
            * value behind each is still the `interest_formulas` row the engine
            * amortises with — looked up by its code, so renaming a formula's
            * display name in the database cannot break this mapping and cannot
            * change what the officer reads here.
            */}
          <Select
            id="prod-formula"
            value={formulaCodeOf(interestFormulaId)}
            onChange={(e) => setValue("interestFormulaId", formulaIdOf(e.target.value), { shouldDirty: true })}
          >
            <option value="">---Select Interest Formular---</option>
            <option value="SIMPLE">SIMPLE FORMULAR</option>
            <option value="FLAT">FLAT RATE FORMULAR</option>
          </Select>
        </Field>

        <Field label="Select Loan Duration" htmlFor="prod-duration" required error={errors.repaymentScheduleIds?.message}>
          <Select
            id="prod-duration"
            value={selectedSchedules[0] ?? ""}
            /* One cadence, as the reference has. Stored as the product's
               allowed-schedule list, which is where the loan engine reads it. */
            onChange={(e) => setValue("repaymentScheduleIds", e.target.value ? [e.target.value] : [], { shouldDirty: true })}
          >
            <option value="">---Select Loan Duration---</option>
            {schedules.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Repayment Level" htmlFor="prod-min-reps" error={errors.minRepayments?.message}>
          <TextInput id="prod-min-reps" type="number" min={1} placeholder="From" {...register("minRepayments", { setValueAs: numberOrNull })} />
        </Field>
        <Field label="&nbsp;" htmlFor="prod-max-reps" error={errors.maxRepayments?.message}>
          <TextInput id="prod-max-reps" type="number" min={1} placeholder="To" {...register("maxRepayments", { setValueAs: numberOrNull })} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="You Allow Deduction?" htmlFor="prod-deduction">
          <Select
            id="prod-deduction"
            value={allowsDeduction === null ? "" : allowsDeduction ? "yes" : "no"}
            onChange={(e) => setValue("allowsDeduction", e.target.value === "" ? null : e.target.value === "yes", { shouldDirty: true })}
          >
            <option value="">Select</option>
            <option value="yes">YES</option>
            <option value="no">NO</option>
          </Select>
        </Field>

        <Field label="You Allow Penarty?" htmlFor="prod-penalty">
          {/* The reference screen's own spelling, kept deliberately: this is
              the word the officers using it recognise. */}
          <Select
            id="prod-penalty"
            value={allowsPenalty === null ? "" : allowsPenalty ? "yes" : "no"}
            onChange={(e) => setValue("allowsPenalty", e.target.value === "" ? null : e.target.value === "yes", { shouldDirty: true })}
          >
            <option value="">Select</option>
            <option value="yes">YES</option>
            <option value="no">NO</option>
          </Select>
        </Field>

        <Field label="Aprove status" htmlFor="prod-stage" error={errors.approvalStageId?.message}>
          {/*
            * FIXED LABELS, resolved to real stages by CODE.
            *
            * The three words the screen shows, mapped onto the approval chain
            * the loan workflow actually walks. Stored as `approval_stage_id`,
            * so nothing downstream learns a new vocabulary; the mapping is by
            * code rather than by name so an institution renaming a tier does
            * not change what this dropdown reads.
            */}
          <Select
            id="prod-stage"
            value={stageKeyOf(approvalStageId)}
            onChange={(e) => setValue("approvalStageId", stageIdOf(e.target.value), { shouldDirty: true })}
          >
            <option value="">Select</option>
            <option value="branch">branch</option>
            <option value="hq">hq</option>
            <option value="zone manager">zone manager</option>
          </Select>
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Topup percent(%)" htmlFor="prod-topup" error={errors.topupPercent?.message}>
          <TextInput id="prod-topup" type="number" step="0.01" placeholder="topup percent" {...register("topupPercent", { setValueAs: numberOrNull })} />
        </Field>
        <Field label="Take home Percent(%)" htmlFor="prod-takehome" error={errors.takeHomePercent?.message}>
          <TextInput id="prod-takehome" type="number" step="0.01" placeholder="Take home percent" {...register("takeHomePercent", { setValueAs: numberOrNull })} />
        </Field>

        <Field
          label="Customer Type"
          htmlFor="prod-customer-type"
          error={errors.customerTypeIds?.message}
          help={
            customerTypes.length === 0
              ? "No customer types are configured. Add them under Administration → Customer Types."
              : undefined
          }
        >
          {/* Who may borrow this product. The options come from the Customer
              Types module — never a literal in this file — so a type created at
              Administration → Customer Types is selectable here at once. */}
          <Select
            id="prod-customer-type"
            value={selectedCustomerTypes[0] ?? ""}
            onChange={(e) => setValue("customerTypeIds", e.target.value ? [e.target.value] : [], { shouldDirty: true })}
          >
            <option value="">Select</option>
            {customerTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

    </SettingsDialog>
  );
}
