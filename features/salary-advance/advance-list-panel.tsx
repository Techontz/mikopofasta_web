"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, HandCoins, Pencil, Trash2 } from "lucide-react";
import { Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, IconButton, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { advanceTotals, sumAdvances, type SalaryAdvance } from "@/types/salary-advance";
import {
  ADVANCE_SEARCH_FIELDS,
  ADVANCE_STATUS_LABEL,
  ADVANCE_TONE,
  alertColumn,
  branchColumn,
  chargeFeeColumn,
  customerColumn,
  dateColumn,
  formatAdvanceDate,
  interestColumn,
  loanAmountColumn,
  paidAmountColumn,
  phoneColumn,
  principalPlusInterestColumn,
  remainingColumn,
  statusColumn,
} from "@/features/salary-advance/shared";

export type AdvanceListVariant = "approved" | "active" | "repayment";

/**
 * Salary Advance → Approved, Active and Repayment.
 *
 * The same advance at three points in its life, so one component with three
 * column sets rather than three tables that would drift. Each variant declares
 * its columns and the matching totals row — the two have to agree on width, so
 * they are declared together.
 *
 * Nothing here computes money: principal + interest and the remaining balance
 * come from advanceTotals, and the totals row from sumAdvances, so a column and
 * its total can never disagree.
 */
export function AdvanceListPanel({
  advances,
  variant,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: {
  advances: SalaryAdvance[];
  variant: AdvanceListVariant;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [rows, setRows] = React.useState(advances);
  const [viewing, setViewing] = React.useState<SalaryAdvance | null>(null);
  const [editing, setEditing] = React.useState<SalaryAdvance | null>(null);

  function remove(advance: SalaryAdvance) {
    setRows((prev) => prev.filter((a) => a.id !== advance.id));
    toast.success(`${advance.reference} deleted.`);
  }

  function savePaid(advance: SalaryAdvance, paidAmount: number) {
    setRows((prev) => prev.map((a) => (a.id === advance.id ? { ...a, paidAmount } : a)));
    toast.success(`${advance.reference} updated.`);
  }

  const actions: ColumnDef<SalaryAdvance> = {
    id: "actions",
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => (
      <div className="st-row-action flex justify-end gap-1.5">
        <IconButton
          icon={Eye}
          label={`View ${row.original.reference}`}
          tone="secondary"
          onClick={() => setViewing(row.original)}
        />
        {variant === "active" && (
          <IconButton
            icon={Pencil}
            label={`Edit ${row.original.reference}`}
            tone="secondary"
            onClick={() => setEditing(row.original)}
          />
        )}
        <DeleteAction advance={row.original} onConfirm={remove} />
      </div>
    ),
  };

  /*
   * Columns and the totals row are declared side by side per variant: the
   * footer's colSpans have to add up to the column count, and splitting them
   * apart is how that silently breaks.
   */
  const { columns, footer } = React.useMemo(() => {
    const money = (t: ReturnType<typeof sumAdvances>) => (
      <>
        <td>
          <Money strong>{formatMoney(t.loanAmount)}</Money>
        </td>
        <td>
          <Money strong>{formatMoney(t.interest)}</Money>
        </td>
        <td>
          <Money strong>{formatMoney(t.principalPlusInterest)}</Money>
        </td>
        <td>
          <Money strong>{formatMoney(t.paidAmount)}</Money>
        </td>
        <td>
          <Money strong>{formatMoney(t.remaining)}</Money>
        </td>
      </>
    );

    if (variant === "approved") {
      // 12 columns: 3 identity + 5 money + status + fee + date + actions.
      return {
        columns: [
          customerColumn, phoneColumn, branchColumn,
          loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
          statusColumn, chargeFeeColumn, dateColumn, actions,
        ] as ColumnDef<SalaryAdvance>[],
        footer: (shown: SalaryAdvance[]) => {
          const t = sumAdvances(shown);
          return (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              {money(t)}
              <td />
              <td>
                <Money strong>{formatMoney(t.chargeFee)}</Money>
              </td>
              <td colSpan={2} />
            </>
          );
        },
      };
    }

    if (variant === "active") {
      // 12 columns: 2 identity + 5 money + status + fee + date + alert + actions.
      return {
        columns: [
          customerColumn, branchColumn,
          loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
          statusColumn, chargeFeeColumn, dateColumn, alertColumn, actions,
        ] as ColumnDef<SalaryAdvance>[],
        footer: (shown: SalaryAdvance[]) => {
          const t = sumAdvances(shown);
          return (
            <>
              <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              {money(t)}
              <td />
              <td>
                <Money strong>{formatMoney(t.chargeFee)}</Money>
              </td>
              <td colSpan={3} />
            </>
          );
        },
      };
    }

    // repayment — 10 columns: 2 identity + 5 money + status + date + actions.
    return {
      columns: [
        customerColumn, branchColumn,
        loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
        statusColumn, dateColumn, actions,
      ] as ColumnDef<SalaryAdvance>[],
      footer: (shown: SalaryAdvance[]) => {
        const t = sumAdvances(shown);
        return (
          <>
            <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
              Total ({shown.length})
            </td>
            {money(t)}
            <td colSpan={3} />
          </>
        );
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actions` closes over setters only
  }, [variant]);

  return (
    <>
      <SettingsCard title={`${title} (${rows.length})`} description={description} bodyClassName="pt-0 sm:pt-0">
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={ADVANCE_SEARCH_FIELDS}
          searchPlaceholder="Search customer, reference or branch…"
          emptyState={{ icon: HandCoins, title: emptyTitle, description: emptyDescription }}
          renderFooter={footer}
        />
      </SettingsCard>

      <ViewAdvanceDialog advance={viewing} onClose={() => setViewing(null)} />
      <EditPaidDialog advance={editing} onClose={() => setEditing(null)} onSave={savePaid} />
    </>
  );
}

function DeleteAction({
  advance,
  onConfirm,
}: {
  advance: SalaryAdvance;
  onConfirm: (advance: SalaryAdvance) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { remaining } = advanceTotals(advance);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete ${advance.reference}`} tone="secondary" />}
      title={`Delete ${advance.reference}?`}
      consequence={
        remaining > 0
          ? `${advance.customerName} still owes ${formatMoney(remaining)} on this advance. Deleting removes the record of the debt, not the debt itself.`
          : `This advance is settled. The record of it will be removed from the list.`
      }
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(advance);
        setOpen(false);
      }}
    />
  );
}

function ViewAdvanceDialog({
  advance,
  onClose,
}: {
  advance: SalaryAdvance | null;
  onClose: () => void;
}) {
  if (!advance) return null;
  const { principalPlusInterest, remaining } = advanceTotals(advance);
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: "Reference", value: advance.reference, mono: true },
    { label: "Customer", value: advance.customerName },
    { label: "Phone", value: advance.phone, mono: true },
    { label: "Branch", value: advance.branch },
    { label: "Category", value: advance.categoryName },
    { label: "Date", value: formatAdvanceDate(advance.date), mono: true },
    { label: "Loan amount", value: formatMoney(advance.loanAmount), mono: true },
    { label: "Interest", value: formatMoney(advance.interest), mono: true },
    { label: "Principal + interest", value: formatMoney(principalPlusInterest), mono: true },
    { label: "Paid amount", value: formatMoney(advance.paidAmount), mono: true },
    { label: "Remaining amount", value: formatMoney(remaining), mono: true },
    { label: "Charge fee", value: formatMoney(advance.chargeFee), mono: true },
  ];

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={advance.customerName}
      description={`${advance.reference} · ${advance.categoryName}`}
      size="lg"
      footer={
        <Button type="button" tone="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ADVANCE_TONE[advance.status]}>{ADVANCE_STATUS_LABEL[advance.status]}</StatusBadge>
        {advance.overdueDays > 0 && (
          <StatusBadge tone={advance.overdueDays >= 14 ? "danger" : "warning"}>
            {advance.overdueDays} day{advance.overdueDays === 1 ? "" : "s"} late
          </StatusBadge>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {facts.map((fact) => (
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
  );
}

/**
 * Edit, on an active advance.
 *
 * Only the paid amount is editable — it is the figure an officer corrects when
 * a receipt is reconciled. The principal, interest and fee were set when the
 * advance was priced and are not re-priced here, and the remaining balance
 * stays derived, so a correction cannot put a row out of step with itself.
 */
function EditPaidDialog({
  advance,
  onClose,
  onSave,
}: {
  advance: SalaryAdvance | null;
  onClose: () => void;
  onSave: (advance: SalaryAdvance, paidAmount: number) => void;
}) {
  const ceiling = advance ? advance.loanAmount + advance.interest : 0;
  const schema = React.useMemo(
    () =>
      z.object({
        paidAmount: z
          .number()
          .nonnegative("A paid amount cannot be negative.")
          .max(ceiling, `Cannot exceed the ${formatMoney(ceiling)} repayable.`),
      }),
    [ceiling]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ paidAmount: number }>({
    resolver: zodResolver(schema),
    defaultValues: { paidAmount: advance?.paidAmount ?? 0 },
  });

  React.useEffect(() => {
    if (advance) reset({ paidAmount: advance.paidAmount });
  }, [advance, reset]);

  if (!advance) return null;

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Edit ${advance.reference}`}
      description={`${advance.customerName} · repayable ${formatMoney(ceiling)}`}
      formId="advance-edit-form"
      onSubmit={handleSubmit((values) => {
        onSave(advance, values.paidAmount);
        onClose();
      })}
      submitLabel="Save changes"
      pending={isSubmitting}
    >
      <Field
        label="Paid Amount"
        htmlFor="ae-paid"
        required
        error={errors.paidAmount?.message}
        help="The remaining balance is recalculated from this; it is never stored separately."
      >
        <TextInput
          id="ae-paid"
          type="number"
          step="any"
          inputMode="decimal"
          prefix="TSh"
          invalid={!!errors.paidAmount}
          {...register("paidAmount", { valueAsNumber: true })}
        />
      </Field>
    </SettingsDialog>
  );
}
