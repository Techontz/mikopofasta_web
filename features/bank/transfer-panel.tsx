"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { transferBankBalance } from "@/features/bank/actions";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Send } from "lucide-react";
import { Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Button, Field, FieldGrid, Select, TextArea, TextInput } from "@/components/settings/form";
import { formatMoney, round2 } from "@/lib/domain/money";
import { TransferInputSchema, type BankTransfer, type TransferInput, type TransferKind } from "@/types/bank";
import { TRANSFER_REASONS } from "@/config/transfer-reasons";
import { TRANSFER_TONE, formatDate } from "@/features/bank/shared";

const EMPTY: TransferInput = {
  fromAccount: "",
  toAccount: "",
  amount: 0,
  reason: "",
  reference: "",
  description: "",
};

export interface TransferOption {
  value: string;
  label: string;
  /** Shown beside the option so the operator can see what they are drawing on. */
  balance?: number;
}

/**
 * The transfer screens: Transfer Balance / Branch Acc and Transfer Balance /
 * Salary advance & disbursement Acc.
 *
 * One component, because both are the same operation — move money from an
 * account this company holds to a destination, for a stated reason, and record
 * it. Only the labels and the destination list differ, which is what the props
 * carry. Building two would guarantee they drift.
 */
export function TransferPanel({
  kind,
  transfers,
  sources,
  destinations,
  destinationLabel,
  formTitle,
  formDescription,
  historyTitle,
  destinationColumnLabel,
}: {
  kind: TransferKind;
  transfers: BankTransfer[];
  sources: TransferOption[];
  destinations: TransferOption[];
  destinationLabel: string;
  formTitle: string;
  formDescription: string;
  historyTitle: string;
  destinationColumnLabel: string;
}) {
  const rows = transfers;
  const [pending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TransferInput>({ resolver: zodResolver(TransferInputSchema), defaultValues: EMPTY });

  /* useWatch, not watch(): the latter returns a fresh function the React
     Compiler cannot memoize, so it opts the whole component out. */
  const from = useWatch({ control, name: "fromAccount" });
  const amount = useWatch({ control, name: "amount" });
  const sourceBalance = sources.find((s) => s.value === from)?.balance;

  /*
   * A transfer applies immediately and comes back `completed` — the legacy
   * screens have no approval step, and both kinds are one person moving the
   * company's own money between the company's own accounts.
   *
   * Which destination field is sent depends on `kind`: a branch transfer names
   * a branch, a salary-advance one names another account. The backend refuses a
   * mismatch rather than guessing, so this sends exactly one.
   */
  function onSubmit(values: TransferInput) {
    startTransition(async () => {
      const result = await transferBankBalance({
        kind,
        fromAccountId: values.fromAccount,
        toAccountId: kind === "branch" ? undefined : values.toAccount,
        toBranchId: kind === "branch" ? values.toAccount : undefined,
        amount: values.amount,
        reason: values.reason,
        reference: values.reference.trim() || undefined,
        description: values.description || undefined,
      });

      if (result.ok) {
        toast.success(result.message);
        reset(EMPTY);
      } else {
        // Covers "the account cannot cover the amount plus the charge", which
        // only the ledger can answer.
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  }

  const totals = React.useMemo(
    () => ({
      amount: round2(rows.reduce((s, t) => s + t.amount, 0)),
      fees: round2(rows.reduce((s, t) => s + t.chargeFee, 0)),
    }),
    [rows]
  );

  const columns: ColumnDef<BankTransfer>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap font-medium text-[var(--st-ink)]">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "chargeFee",
      header: () => <span className="block text-right">Charge Fee</span>,
      cell: ({ row }) => (
        <Money muted={row.original.chargeFee === 0}>
          {row.original.chargeFee === 0 ? "—" : formatMoney(row.original.chargeFee)}
        </Money>
      ),
    },
    {
      accessorKey: "fromAccount",
      header: "From Account",
      cell: ({ row }) => <span className="text-[var(--st-ink-soft)]">{row.original.fromAccount}</span>,
    },
    {
      accessorKey: "toAccount",
      header: destinationColumnLabel,
      cell: ({ row }) => <span className="text-[var(--st-ink)]">{row.original.toAccount}</span>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-[var(--st-ink-soft)]">{row.original.reason}</span>,
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
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={TRANSFER_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    /*
     * No Action column.
     *
     * The fixture version offered Cancel, which made sense while a new transfer
     * sat `pending`. Real ones do not: a transfer applies immediately and comes
     * back `completed`, because the legacy screens have no approval step. Money
     * that has already moved is not un-moved by a status change — it is undone
     * by reversing the journal entry, which is the Ledger module's job and
     * leaves both entries on the record.
     *
     * A disabled button on every row would have been honest and useless.
     */
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title={formTitle}
        description={formDescription}
        footer={
          <>
            <Button type="button" tone="secondary" onClick={() => reset(EMPTY)}>
              Cancel
            </Button>
            <Button type="submit" form="transfer-form" tone="primary" icon={Send} loading={isSubmitting || pending}>
              Transfer
            </Button>
          </>
        }
      >
        <form id="transfer-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FieldGrid columns={3}>
            <Field
              label="Transfer From"
              htmlFor="tf-from"
              required
              error={errors.fromAccount?.message}
              help={
                sourceBalance !== undefined
                  ? `Available: ${formatMoney(sourceBalance)}`
                  : "The account the money leaves."
              }
            >
              <Select id="tf-from" invalid={!!errors.fromAccount} {...register("fromAccount")}>
                <option value="">Select account</option>
                {sources.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={destinationLabel} htmlFor="tf-to" required error={errors.toAccount?.message}>
              <Select id="tf-to" invalid={!!errors.toAccount} {...register("toAccount")}>
                <option value="">Select destination</option>
                {destinations.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Amount"
              htmlFor="tf-amount"
              required
              error={errors.amount?.message}
              /*
               * A soft warning, not a validation rule. The balance shown here is
               * a snapshot and the bank is the authority on what clears, so the
               * form flags the risk and still lets the operator proceed.
               */
              help={
                sourceBalance !== undefined && amount > sourceBalance
                  ? "This is more than the snapshot balance shown above."
                  : undefined
              }
            >
              <TextInput
                id="tf-amount"
                type="number"
                step="any"
                inputMode="decimal"
                prefix="TSh"
                invalid={!!errors.amount}
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>
          </FieldGrid>

          <FieldGrid columns={3}>
            <Field label="Reason" htmlFor="tf-reason" required error={errors.reason?.message}>
              <Select id="tf-reason" invalid={!!errors.reason} {...register("reason")}>
                <option value="">Select reason</option>
                {TRANSFER_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Reference"
              htmlFor="tf-reference"
              error={errors.reference?.message}
              help="Optional. Left blank, one is generated."
            >
              <TextInput id="tf-reference" invalid={!!errors.reference} {...register("reference")} />
            </Field>
            <Field label="Description" htmlFor="tf-description" error={errors.description?.message}>
              <TextArea id="tf-description" rows={3} invalid={!!errors.description} {...register("description")} />
            </Field>
          </FieldGrid>
        </form>
      </SettingsCard>

      <SettingsCard
        title={historyTitle}
        description={`${rows.length} transfer${rows.length === 1 ? "" : "s"} · ${formatMoney(totals.amount)} moved · ${formatMoney(totals.fees)} in fees`}
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["reference", "fromAccount", "toAccount", "reason", "requestedBy"]}
          searchPlaceholder="Search reference or account…"
          emptyState={{
            icon: ArrowRight,
            title: "No transfers yet",
            description: "Record the first transfer using the form above.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

