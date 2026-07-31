"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Eye, Pencil, Trash2, Wallet } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { PenaltyInputSchema, type PaidPenalty, type Penalty, type PenaltyInput } from "@/types/operations";
import { OPS_BRANCHES } from "@/lib/mock-data/operations";
import { formatOpsDate } from "@/features/operations/shared";

/**
 * Penalty → Penalty List.
 *
 * Penalties charged against a loan. Editing corrects an amount that was
 * mis-keyed; it does not re-price the penalty, which is the loan engine's job.
 */
export function PenaltyListPanel({ penalties }: { penalties: Penalty[] }) {
  const [rows, setRows] = React.useState(penalties);
  const [editing, setEditing] = React.useState<Penalty | null>(null);

  function save(values: PenaltyInput, id: string) {
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, ...values } : p)));
    toast.success(`${values.customerName}'s penalty updated.`);
  }

  function remove(penalty: Penalty) {
    setRows((prev) => prev.filter((p) => p.id !== penalty.id));
    toast.success(`Penalty for ${penalty.customerName} deleted.`);
  }

  const columns: ColumnDef<Penalty>[] = [
    {
      id: "sn",
      header: "S/N",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.customerName}</span>,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "loanAmount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.loanAmount)}</Money>,
    },
    {
      accessorKey: "penaltyAmount",
      header: () => <span className="block text-right">Penalty Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.penaltyAmount)}</Money>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Pencil}
            label={`Edit penalty for ${row.original.customerName}`}
            tone="secondary"
            onClick={() => setEditing(row.original)}
          />
          <DeletePenaltyAction penalty={row.original} onConfirm={remove} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SettingsCard
        title={`Penalty List (${rows.length})`}
        description="Penalties charged against customer loans."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["customerName", "branch"]}
          searchPlaceholder="Search customer or branch…"
          emptyState={{
            icon: AlertTriangle,
            title: "No penalties charged",
            description: "A penalty appears here when the loan engine charges one.",
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, p) => s + p.loanAmount, 0))}</Money>
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, p) => s + p.penaltyAmount, 0))}</Money>
              </td>
              <td colSpan={2} />
            </>
          )}
        />
      </SettingsCard>

      <EditPenaltyDialog penalty={editing} onClose={() => setEditing(null)} onSave={save} />
    </>
  );
}

function EditPenaltyDialog({
  penalty,
  onClose,
  onSave,
}: {
  penalty: Penalty | null;
  onClose: () => void;
  onSave: (values: PenaltyInput, id: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PenaltyInput>({
    resolver: zodResolver(PenaltyInputSchema),
    defaultValues: { customerName: "", branch: "", loanAmount: 0, penaltyAmount: 0 },
  });

  React.useEffect(() => {
    if (penalty)
      reset({
        customerName: penalty.customerName,
        branch: penalty.branch,
        loanAmount: penalty.loanAmount,
        penaltyAmount: penalty.penaltyAmount,
      });
  }, [penalty, reset]);

  if (!penalty) return null;

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Edit penalty — ${penalty.customerName}`}
      description="Corrects a mis-keyed figure. It does not re-price the penalty."
      formId="penalty-edit-form"
      onSubmit={handleSubmit((values) => {
        onSave(values, penalty.id);
        onClose();
      })}
      submitLabel="Save changes"
      pending={isSubmitting}
    >
      <FieldGrid columns={2}>
        <Field label="Customer Name" htmlFor="pe-customer" required error={errors.customerName?.message}>
          <TextInput id="pe-customer" invalid={!!errors.customerName} {...register("customerName")} />
        </Field>
        <Field label="Branch" htmlFor="pe-branch" required error={errors.branch?.message}>
          <Select id="pe-branch" invalid={!!errors.branch} {...register("branch")}>
            <option value="">Select branch</option>
            {OPS_BRANCHES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>
      <FieldGrid columns={2}>
        <Field label="Loan Amount" htmlFor="pe-loan" required error={errors.loanAmount?.message}>
          <TextInput
            id="pe-loan"
            type="number"
            step="any"
            inputMode="decimal"
            prefix="TSh"
            invalid={!!errors.loanAmount}
            {...register("loanAmount", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Penalty Amount" htmlFor="pe-penalty" required error={errors.penaltyAmount?.message}>
          <TextInput
            id="pe-penalty"
            type="number"
            step="any"
            inputMode="decimal"
            prefix="TSh"
            invalid={!!errors.penaltyAmount}
            {...register("penaltyAmount", { valueAsNumber: true })}
          />
        </Field>
      </FieldGrid>
    </SettingsDialog>
  );
}

function DeletePenaltyAction({
  penalty,
  onConfirm,
}: {
  penalty: Penalty;
  onConfirm: (penalty: Penalty) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete penalty for ${penalty.customerName}`} tone="secondary" />}
      title={`Delete this penalty?`}
      consequence={`${formatMoney(penalty.penaltyAmount)} charged to ${penalty.customerName} will no longer be recorded. The loan itself is unaffected.`}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(penalty);
        setOpen(false);
      }}
    />
  );
}

/**
 * Penalty → Paid Penalty.
 *
 * Penalties that have been settled. A cash record, so View is the only action
 * that makes sense — a receipt is not edited after the fact.
 */
export function PaidPenaltyPanel({ payments }: { payments: PaidPenalty[] }) {
  const [viewing, setViewing] = React.useState<PaidPenalty | null>(null);

  const columns: ColumnDef<PaidPenalty>[] = [
    {
      id: "sn",
      header: "S/N",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.customerName}</span>,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "paidAmount",
      header: () => <span className="block text-right">Paid Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.paidAmount)}</Money>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <IconButton
            icon={Eye}
            label={`View ${row.original.customerName}'s payment`}
            tone="secondary"
            onClick={() => setViewing(row.original)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <SettingsCard
        title={`Paid Penalty List (${payments.length})`}
        description="Penalties that have been settled by the customer."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={payments}
          searchFields={["customerName", "branch"]}
          searchPlaceholder="Search customer or branch…"
          emptyState={{
            icon: Wallet,
            title: "No penalties paid yet",
            description: "A settled penalty appears here as soon as payment is received.",
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, p) => s + p.paidAmount, 0))}</Money>
              </td>
              <td colSpan={2} />
            </>
          )}
        />
      </SettingsCard>

      {viewing && (
        <SettingsDialog
          open
          onOpenChange={(next) => !next && setViewing(null)}
          title={viewing.customerName}
          description={`${viewing.branch} · ${formatOpsDate(viewing.date)}`}
          footer={
            <button type="button" className="st-btn st-btn-secondary" onClick={() => setViewing(null)}>
              Close
            </button>
          }
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              { label: "Customer", value: viewing.customerName },
              { label: "Branch", value: viewing.branch },
              { label: "Paid amount", value: formatMoney(viewing.paidAmount), mono: true },
              { label: "Date", value: formatOpsDate(viewing.date), mono: true },
            ].map((fact) => (
              <div key={fact.label}>
                <dt className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--st-ink-faint)]">
                  {fact.label}
                </dt>
                <dd className={`mt-0.5 text-[13.5px] text-[var(--st-ink)] ${fact.mono ? "font-tabular" : ""}`}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </SettingsDialog>
      )}
    </>
  );
}
