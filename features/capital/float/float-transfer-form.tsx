"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SettingsCard } from "@/components/settings";
import { Button, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import type { FloatKind } from "@/types/capital";
import { requestFloatTransfer } from "@/features/capital/actions";

export interface Option {
  id: string;
  name: string;
}

interface FormValues {
  amount: number;
  fromBranchId: string;
  toBranchId: string;
  fromAccountId: string;
  toAccountId: string;
}

/**
 * The transfer form shared by Float, Float Branch To Branch and Float Ac-Ac.
 *
 * Which fields render is decided by `kind`, in the order each legacy screen
 * lists them. Validation mirrors the API's StoreFloatTransferRequest — the
 * server applies the same rules again regardless.
 */
export function FloatTransferForm({
  kind,
  title,
  description,
  submitLabel,
  branches,
  accounts = [],
}: {
  kind: FloatKind;
  title: string;
  description: string;
  submitLabel: string;
  branches: Option[];
  accounts?: Option[];
}) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { amount: 0, fromBranchId: "", toBranchId: "", fromAccountId: "", toAccountId: "" },
  });

  function onSubmit(values: FormValues) {
    // The few cross-field rules the API also enforces, checked here so the
    // reader is told before a round trip rather than after.
    if (!values.amount || values.amount <= 0) {
      setError("amount", { message: "Enter an amount greater than zero." });
      return;
    }
    if (kind !== "account_to_account" && !values.toBranchId) {
      setError("toBranchId", { message: "Select a destination branch." });
      return;
    }
    if (kind === "branch_to_branch") {
      if (!values.fromBranchId) {
        setError("fromBranchId", { message: "Select a source branch." });
        return;
      }
      if (values.fromBranchId === values.toBranchId) {
        setError("toBranchId", { message: "Choose two different branches." });
        return;
      }
    }
    if (kind === "account_to_account") {
      if (!values.toBranchId) {
        setError("toBranchId", { message: "Select a branch." });
        return;
      }
      if (!values.fromAccountId || !values.toAccountId) {
        setError("toAccountId", { message: "Select both accounts." });
        return;
      }
      if (values.fromAccountId === values.toAccountId) {
        setError("toAccountId", { message: "Choose two different accounts." });
        return;
      }
    }

    startTransition(async () => {
      const result = await requestFloatTransfer({
        kind,
        amount: values.amount,
        fromBranchId: values.fromBranchId || null,
        toBranchId: values.toBranchId || null,
        fromAccountId: values.fromAccountId || null,
        toAccountId: values.toAccountId || null,
      });

      if (result.ok) {
        toast.success(result.message);
        reset({ amount: 0, fromBranchId: "", toBranchId: "", fromAccountId: "", toAccountId: "" });
      } else {
        toast.error(result.message);
      }
    });
  }

  const amountField = (
    <Field label="Amount" htmlFor="float-amount" required error={errors.amount?.message}>
      <TextInput
        id="float-amount"
        type="number"
        min="0"
        inputMode="decimal"
        suffix="TZS"
        placeholder="Amount"
        invalid={!!errors.amount}
        {...register("amount", { valueAsNumber: true })}
      />
    </Field>
  );

  const toBranchField = (label: string) => (
    <Field label={label} htmlFor="float-to-branch" required error={errors.toBranchId?.message}>
      <Select id="float-to-branch" invalid={!!errors.toBranchId} {...register("toBranchId")}>
        <option value="">---Select Branch---</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <SettingsCard
      title={title}
      description={description}
      footer={
        <Button type="submit" form="float-form" tone="primary" loading={pending}>
          {pending ? "Transferring…" : submitLabel}
        </Button>
      }
    >
      <form id="float-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        {/* Field order per screen is the legacy form's. */}
        {kind === "company_to_branch" && <FieldGrid>{amountField}{toBranchField("To Branch Name")}</FieldGrid>}

        {kind === "branch_to_branch" && (
          <FieldGrid columns={3}>
            <Field label="From Branch" htmlFor="float-from-branch" required error={errors.fromBranchId?.message}>
              <Select id="float-from-branch" invalid={!!errors.fromBranchId} {...register("fromBranchId")}>
                <option value="">---Select Branch---</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            {toBranchField("To Branch Name")}
            {amountField}
          </FieldGrid>
        )}

        {kind === "account_to_account" && (
          <FieldGrid columns={3}>
            {toBranchField("To Branch Name")}
            <Field label="From Account" htmlFor="float-from-account" required error={errors.fromAccountId?.message}>
              <Select id="float-from-account" invalid={!!errors.fromAccountId} {...register("fromAccountId")}>
                <option value="">select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="To Account" htmlFor="float-to-account" required error={errors.toAccountId?.message}>
              <Select id="float-to-account" invalid={!!errors.toAccountId} {...register("toAccountId")}>
                <option value="">select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            {amountField}
          </FieldGrid>
        )}
      </form>
    </SettingsCard>
  );
}
