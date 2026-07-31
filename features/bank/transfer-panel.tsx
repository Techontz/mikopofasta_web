"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Ban, Send } from "lucide-react";
import { Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextArea, TextInput } from "@/components/settings/form";
import { formatMoney, round2 } from "@/lib/domain/money";
import { TransferInputSchema, type BankTransfer, type TransferInput, type TransferKind } from "@/types/bank";
import { TRANSFER_REASONS } from "@/lib/mock-data/bank";
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
  const [rows, setRows] = React.useState(transfers);

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

  function onSubmit(values: TransferInput) {
    setRows((prev) => [
      {
        id: `trf-new-${prev.length + 1}`,
        reference: values.reference.trim() || `TRF-${String(prev.length + 22).padStart(4, "0")}`,
        kind,
        fromAccount: sources.find((s) => s.value === values.fromAccount)?.label ?? values.fromAccount,
        toAccount: destinations.find((d) => d.value === values.toAccount)?.label ?? values.toAccount,
        amount: values.amount,
        // The fee is set by the bank, not by this form, so a new record carries
        // none until the bank confirms one.
        chargeFee: 0,
        reason: values.reason,
        description: values.description || null,
        date: rows[0]?.date ?? "2026-07-28",
        status: "pending",
        requestedBy: "You",
      },
      ...prev,
    ]);
    toast.success(`${formatMoney(values.amount)} queued for transfer.`);
    reset(EMPTY);
  }

  function cancel(transfer: BankTransfer) {
    setRows((prev) => prev.map((t) => (t.id === transfer.id ? { ...t, status: "cancelled" } : t)));
    toast.success(`${transfer.reference} cancelled.`);
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
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => <CancelTransferAction transfer={row.original} onConfirm={cancel} />,
    },
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
            <Button type="submit" form="transfer-form" tone="primary" icon={Send} loading={isSubmitting}>
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

function CancelTransferAction({
  transfer,
  onConfirm,
}: {
  transfer: BankTransfer;
  onConfirm: (transfer: BankTransfer) => void;
}) {
  const [open, setOpen] = React.useState(false);

  /* Only a transfer that has not settled can be pulled back. */
  if (transfer.status !== "pending") {
    return (
      <div className="flex justify-end">
        <IconButton
          icon={Ban}
          tone="secondary"
          disabled
          label={`${transfer.reference} is ${transfer.status} and cannot be cancelled`}
        />
      </div>
    );
  }

  return (
    <div className="st-row-action flex justify-end">
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<IconButton icon={Ban} label={`Cancel ${transfer.reference}`} tone="secondary" />}
        title={`Cancel ${transfer.reference}?`}
        consequence={`${formatMoney(transfer.amount)} will not leave ${transfer.fromAccount}. The record stays in the history marked cancelled, so the attempt is still auditable.`}
        confirmLabel="Cancel transfer"
        pendingLabel="Cancelling…"
        onConfirm={() => {
          onConfirm(transfer);
          setOpen(false);
        }}
      />
    </div>
  );
}
