"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Paperclip, Receipt, Trash2, Upload } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextArea, TextInput } from "@/components/settings/form";
import { formatMoney, round2 } from "@/lib/domain/money";
import { BankExpenseInputSchema, type BankExpense, type BankExpenseInput } from "@/types/bank";
import { fileBankExpense, withdrawBankExpense } from "@/features/bank/expense-actions";
import { formatDate } from "@/features/bank/shared";

const EMPTY: BankExpenseInput = {
  category: "",
  bankName: "",
  accountId: "",
  amount: 0,
  description: "",
};

/**
 * Bank → Register Bank Expenses.
 *
 * Records an expense paid out of a bank account. It is the same record as any
 * other expense request — same table, same approval — with the bank account
 * named on it, which is why this posts to the Expenses endpoints rather than to
 * a bank-specific one.
 *
 * The receipt is still held as a file name only. Nothing is uploaded, because
 * there is no endpoint to upload to, and a control that appears to attach a
 * document while discarding it is worse than one that shows what it captured.
 *
 * `categories` and `accounts` come from the API — the expense register and the
 * registered bank accounts — rather than from constants.
 */
export function ExpensesPanel({
  expenses,
  categories,
  accounts: allAccounts,
  bankNames,
}: {
  expenses: BankExpense[];
  categories: { id: string; name: string }[];
  accounts: { id: string; bankName: string; accountName: string; status: string }[];
  bankNames: string[];
}) {
  const rows = expenses;
  const [pending, startTransition] = React.useTransition();
  const [receipt, setReceipt] = React.useState<File | null>(null);
  /*
   * A file input's value cannot be set from React, so clearing it usually means
   * reaching for a ref and assigning `.value = ""`. That puts a ref read on the
   * submit path, which React's rules rightly flag. Bumping a key remounts the
   * input instead — same effect, no ref, and the reset stays declarative.
   */
  const [fileKey, setFileKey] = React.useState(0);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BankExpenseInput>({ resolver: zodResolver(BankExpenseInputSchema), defaultValues: EMPTY });

  /* useWatch, not watch(): the latter returns a fresh function the React
     Compiler cannot memoize, so it opts the whole component out. */
  const bank = useWatch({ control, name: "bankName" });
  // The account list narrows to the chosen bank: an account belongs to one bank,
  // and offering all of them invites a mismatched pair.
  const accounts = allAccounts.filter(
    (a) => a.status === "active" && (bank === "" || a.bankName === bank)
  );

  function clearForm() {
    reset(EMPTY);
    setReceipt(null);
    setFileKey((k) => k + 1);
  }

  /*
   * `category` holds the expense category's id, not its name: the backend files
   * the request against a category that owns a ledger account, and matching on
   * a display name would break the first time one is renamed.
   */
  function onSubmit(values: BankExpenseInput) {
    startTransition(async () => {
      const result = await fileBankExpense({
        expenseCategoryId: values.category,
        bankAccountId: values.accountId,
        amount: values.amount,
        description: values.description,
      });

      if (result.ok) {
        toast.success(result.message);
        clearForm();
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  }

  function remove(expense: BankExpense) {
    startTransition(async () => {
      const result = await withdrawBankExpense(expense.id, expense.category);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  const total = round2(rows.reduce((s, e) => s + e.amount, 0));

  const columns: ColumnDef<BankExpense>[] = [
    {
      id: "sno",
      header: "S/no.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "category",
      header: "Expenses",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.category}</span>,
    },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.bankName}</span>,
    },
    { accessorKey: "accountName", header: "Account" },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "receiptName",
      header: "Receipt",
      cell: ({ row }) =>
        row.original.receiptName ? (
          <span className="inline-flex max-w-[180px] items-center gap-1.5 text-[13px] text-[var(--st-ink-soft)]">
            <Paperclip className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{row.original.receiptName}</span>
          </span>
        ) : (
          <span className="text-[var(--st-ink-faint)]">—</span>
        ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    { accessorKey: "recordedBy", header: "Recorded By" },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => <RemoveExpenseAction expense={row.original} onConfirm={remove} />,
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Register Bank Expense"
        description="An expense already paid out of a bank account. Recording it here is what makes it show against that account."
        footer={
          <>
            <Button type="button" tone="secondary" onClick={clearForm}>
              Cancel
            </Button>
            <Button type="submit" form="bank-expense-form" tone="primary" loading={isSubmitting || pending}>
              Submit
            </Button>
          </>
        }
      >
        <form id="bank-expense-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FieldGrid columns={3}>
            <Field label="Expense Category" htmlFor="be-category" required error={errors.category?.message}>
              <Select id="be-category" invalid={!!errors.category} {...register("category")}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bank" htmlFor="be-bank" required error={errors.bankName?.message}>
              <Select id="be-bank" invalid={!!errors.bankName} {...register("bankName")}>
                <option value="">Select bank</option>
                {bankNames.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Account"
              htmlFor="be-account"
              required
              error={errors.accountId?.message}
              help={bank === "" ? "Choose a bank first." : `${accounts.length} account${accounts.length === 1 ? "" : "s"} at ${bank}.`}
            >
              <Select id="be-account" invalid={!!errors.accountId} {...register("accountId")}>
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label="Amount" htmlFor="be-amount" required error={errors.amount?.message}>
              <TextInput
                id="be-amount"
                type="number"
                step="any"
                inputMode="decimal"
                prefix="TSh"
                invalid={!!errors.amount}
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Receipt Upload"
              htmlFor="be-receipt"
              help={receipt ? receipt.name : "Optional. PDF or image."}
            >
              {/*
                A styled label over a hidden input. The native control cannot be
                restyled to match the other fields, and its default text ("Choose
                File") does not say what happens.
              */}
              <div className="flex items-center gap-2">
                <input
                  key={fileKey}
                  id="be-receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="be-receipt" className="st-btn st-btn-secondary cursor-pointer">
                  <Upload className="size-4" strokeWidth={1.9} aria-hidden />
                  {receipt ? "Replace file" : "Choose file"}
                </label>
                {receipt && (
                  <Button
                    type="button"
                    tone="ghost"
                    onClick={() => {
                      setReceipt(null);
                      setFileKey((k) => k + 1);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Description" htmlFor="be-description" error={errors.description?.message}>
              <TextArea id="be-description" rows={3} invalid={!!errors.description} {...register("description")} />
            </Field>
          </FieldGrid>
        </form>
      </SettingsCard>

      <SettingsCard
        title={`Expenses (${rows.length})`}
        description={`${formatMoney(total)} recorded across every account.`}
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["category", "bankName", "accountName", "recordedBy"]}
          searchPlaceholder="Search category or account…"
          emptyState={{
            icon: Receipt,
            title: "No expenses recorded yet",
            description: "Record the first bank expense using the form above.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

function RemoveExpenseAction({
  expense,
  onConfirm,
}: {
  expense: BankExpense;
  onConfirm: (expense: BankExpense) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="st-row-action flex justify-end">
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        trigger={
          <IconButton icon={Trash2} label={`Remove ${expense.category} expense`} tone="secondary" />
        }
        title={`Remove this ${expense.category} expense?`}
        consequence={`${formatMoney(expense.amount)} against ${expense.accountName} will no longer be recorded. The payment itself is unaffected — this removes the record of it.`}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        onConfirm={() => {
          onConfirm(expense);
          setOpen(false);
        }}
      />
    </div>
  );
}
