"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionButtons, Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import {
  CHARGE_VALUE_TYPES,
  CHARGE_VALUE_TYPE_LABELS,
  LoanFeeFormSchema,
  type LoanFeeInput,
  type LoanFeeRow,
} from "@/types/loan-charge";
import { clearLoanFee, saveLoanFee } from "@/features/admin/loan-fees/actions";
import { formatMoney } from "@/lib/domain/money";

/**
 * Prices one loan category — Settings → Loan Fee.
 *
 * The unit of `feeAmount` depends on `feeType`, so the field re-labels itself
 * as the type changes: a 5,000 shilling arrangement fee and a 5% one are very
 * different numbers to type into the same box.
 */
export function LoanFeeFormDialog({ row }: { row: LoanFeeRow }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const defaults: LoanFeeInput = {
    feeType: row.fee?.feeType ?? "money_value",
    feeAmount: row.fee?.feeAmount ?? 0,
    insuranceAmount: row.fee?.insuranceAmount ?? 0,
  };

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LoanFeeInput>({ resolver: zodResolver(LoanFeeFormSchema), defaultValues: defaults });

  // useWatch rather than watch(): the latter hands back a new function every
  // render, which makes the React Compiler skip memoizing this component.
  const feeType = useWatch({ control, name: "feeType" });
  const isPercentage = feeType === "percentage_value";

  function onSubmit(values: LoanFeeInput) {
    startTransition(async () => {
      const result = await saveLoanFee(row.loanProductId, values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function onClear() {
    startTransition(async () => {
      const result = await clearLoanFee(row.loanProductId);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger
        render={<IconButton icon={Pencil} label={`Edit fee for ${row.productName}`} tone="secondary" />}
      />
      <DialogContent className="st-scope">
        <DialogHeader>
          <DialogTitle>{row.productName}</DialogTitle>
          <DialogDescription>
            {formatMoney(row.minAmount)} – {formatMoney(row.maxAmount)} at {row.interestRate}% interest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Field
            label="Loan fee type"
            htmlFor="fee-type"
            error={errors.feeType?.message}
            help="Whether the fee below is a flat amount or a share of the loan."
          >
            <Select id="fee-type" invalid={!!errors.feeType} {...register("feeType")}>
              {CHARGE_VALUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CHARGE_VALUE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <FieldGrid>
            <Field
              label="Loan fee"
              htmlFor="fee-amount"
              required
              error={errors.feeAmount?.message}
              help={isPercentage ? "A share of the disbursed amount, 0–100." : "A flat amount in TZS."}
            >
              <TextInput
                id="fee-amount"
                type="number"
                step={isPercentage ? "0.01" : "1"}
                min="0"
                inputMode="decimal"
                suffix={isPercentage ? "%" : "TZS"}
                invalid={!!errors.feeAmount}
                {...register("feeAmount", { valueAsNumber: true })}
              />
            </Field>

            <Field
              label="Insurance"
              htmlFor="insurance-amount"
              error={errors.insuranceAmount?.message}
              help="A flat premium in TZS."
            >
              <TextInput
                id="insurance-amount"
                type="number"
                step="1"
                min="0"
                inputMode="decimal"
                suffix="TZS"
                invalid={!!errors.insuranceAmount}
                {...register("insuranceAmount", { valueAsNumber: true })}
              />
            </Field>
          </FieldGrid>

          <ActionButtons align={row.fee ? "between" : "end"}>
            {/* Only offered once there is something to clear. */}
            {row.fee && (
              <Button type="button" tone="ghost" onClick={onClear} disabled={pending}>
                Clear fee
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" tone="primary" loading={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </ActionButtons>
        </form>
      </DialogContent>
    </Dialog>
  );
}
