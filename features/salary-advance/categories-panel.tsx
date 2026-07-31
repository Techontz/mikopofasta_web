"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { removeAdvanceCategory, saveAdvanceCategory } from "@/features/salary-advance/actions";
import type { ActionResult } from "@/lib/domain/action-result";
import type { SalaryAdvanceCategoryRecord } from "@/lib/api/salary-advance";
import { z } from "zod";

/**
 * At least one period — an advance recovered over none is never recovered.
 * Capped at 60 so a typo cannot commit an employee to a five-year deduction;
 * the backend enforces the same bounds.
 */
const RecoveryPeriodsSchema = z.object({
  recoveryPeriods: z
    .number()
    .int("Whole payroll periods only.")
    .min(1, "An advance must be recovered over at least one payroll period.")
    .max(60, "Keep the recovery term under 60 payroll periods."),
});
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  SalaryAdvanceCategoryInputSchema,
  type SalaryAdvanceCategoryInput,
} from "@/types/salary-advance";

/**
 * The form's shape: the frontend schema's five fields plus the recovery term.
 *
 * `recoveryPeriods` is not on `SalaryAdvanceCategoryInputSchema` because the
 * fixture this screen ran on had no notion of a repayment schedule. It is what
 * turns a band into terms rather than a price list — the instalment taken from
 * each payslip is the total repayable spread across it — so the form collects
 * it and the zod schema validates the rest.
 */
type CategoryFormValues = SalaryAdvanceCategoryInput & { recoveryPeriods: number };

const EMPTY: CategoryFormValues = {
  name: "",
  interestRate: 0,
  fromAmount: 0,
  toAmount: 0,
  chargeFee: 0,
  recoveryPeriods: 1,
};

/**
 * Salary Advance → Salary Advance Category.
 *
 * The bands an advance is priced against: each carries an interest rate, the
 * amount range it applies to, and its charge fee. Add and Edit share one dialog
 * — the fields are identical, and two copies would drift.
 */
export function CategoriesPanel({ categories }: { categories: SalaryAdvanceCategoryRecord[] }) {
  const rows = categories;
  const [editing, setEditing] = React.useState<SalaryAdvanceCategoryRecord | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [, startTransition] = React.useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  /*
   * The server decides whether a band is acceptable — it is the only side that
   * can see whether this one overlaps another — so the row is not edited here.
   * The action revalidates and the list re-renders from what was actually
   * saved.
   */
  function upsert(values: CategoryFormValues, id?: string) {
    run(() => saveAdvanceCategory(values, id));
  }

  function remove(category: SalaryAdvanceCategoryRecord) {
    run(() => removeAdvanceCategory(category.id, category.name));
  }

  const columns: ColumnDef<SalaryAdvanceCategoryRecord>[] = [
    {
      id: "sn",
      header: "S/N",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "name",
      header: "Category Name",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.name}</span>,
    },
    {
      accessorKey: "interestRate",
      header: () => <span className="block text-right">Interest</span>,
      cell: ({ row }) => <Money>{row.original.interestRate}%</Money>,
    },
    {
      accessorKey: "fromAmount",
      header: () => <span className="block text-right">From Amount</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.fromAmount)}</Money>,
    },
    {
      accessorKey: "toAmount",
      header: () => <span className="block text-right">To Amount</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.toAmount)}</Money>,
    },
    {
      accessorKey: "chargeFee",
      header: () => <span className="block text-right">Charge Fee</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.chargeFee)}</Money>,
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Pencil}
            label={`Edit ${row.original.name}`}
            tone="secondary"
            onClick={() => setEditing(row.original)}
          />
          <DeleteCategoryAction category={row.original} onConfirm={remove} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SettingsCard
        title={`Salary Advance Categories (${rows.length})`}
        description="The bands an advance is priced against. A request picks one, and the rate and fee come from it."
        actions={
          <Button tone="primary" icon={Plus} onClick={() => setAdding(true)}>
            Add Category
          </Button>
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["name"]}
          searchPlaceholder="Search category…"
          emptyState={{
            icon: Layers,
            title: "No categories yet",
            description: "Add the first category so advances can be priced.",
            action: (
              <Button tone="primary" icon={Plus} onClick={() => setAdding(true)}>
                Add Category
              </Button>
            ),
          }}
          /*
           * The count sits under S/N and Category Name only. It must not
           * straddle Interest, From or To: a label spanning a numeric column
           * reads as that column's total, and none of the three has one —
           * summing interest rates (5% + 10% + 12%…) produces a number that
           * means nothing, and adding up the ends of amount bands is worse.
           * Charge Fee is the one column here that genuinely totals.
           */
          renderFooter={(shown) => (
            <>
              <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                {shown.length} categor{shown.length === 1 ? "y" : "ies"}
              </td>
              <td />
              <td />
              <td />
              <td>
                <Money strong>{formatMoney(shown.reduce((s, c) => s + c.chargeFee, 0))}</Money>
              </td>
              <td />
            </>
          )}
        />
      </SettingsCard>

      <CategoryDialog
        open={adding || editing !== null}
        category={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSave={upsert}
      />
    </>
  );
}

function CategoryDialog({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category: SalaryAdvanceCategoryRecord | null;
  onClose: () => void;
  onSave: (values: CategoryFormValues, id?: string) => void;
}) {
  const defaults: CategoryFormValues = category
    ? {
        name: category.name,
        interestRate: category.interestRate,
        fromAmount: category.fromAmount,
        toAmount: category.toAmount,
        chargeFee: category.chargeFee,
        recoveryPeriods: category.recoveryPeriods,
      }
    : EMPTY;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(SalaryAdvanceCategoryInputSchema.and(RecoveryPeriodsSchema)),
    defaultValues: defaults,
  });

  // Opening on a different row must repopulate the fields.
  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults derives from `category`
  }, [open, category?.id]);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={category ? `Edit ${category.name}` : "Add Category"}
      description="Interest is a percentage of the principal. The amount range decides which advances this category can price."
      formId="advance-category-form"
      onSubmit={handleSubmit((values) => {
        onSave(values, category?.id);
        onClose();
      })}
      submitLabel={category ? "Save changes" : "Add category"}
      pending={isSubmitting}
    >
      <Field label="Category Name" htmlFor="ac-name" required error={errors.name?.message}>
        <TextInput id="ac-name" placeholder="e.g. Standard Advance" invalid={!!errors.name} {...register("name")} />
      </Field>

      <FieldGrid columns={2}>
        <Field label="Interest" htmlFor="ac-interest" required error={errors.interestRate?.message}>
          <TextInput
            id="ac-interest"
            type="number"
            step="any"
            inputMode="decimal"
            suffix="%"
            invalid={!!errors.interestRate}
            {...register("interestRate", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Charge Fee" htmlFor="ac-fee" required error={errors.chargeFee?.message}>
          <TextInput
            id="ac-fee"
            type="number"
            step="any"
            inputMode="decimal"
            prefix="TSh"
            invalid={!!errors.chargeFee}
            {...register("chargeFee", { valueAsNumber: true })}
          />
        </Field>
      </FieldGrid>

      <FieldGrid columns={2}>
        <Field label="From Amount" htmlFor="ac-from" required error={errors.fromAmount?.message}>
          <TextInput
            id="ac-from"
            type="number"
            step="any"
            inputMode="decimal"
            prefix="TSh"
            invalid={!!errors.fromAmount}
            {...register("fromAmount", { valueAsNumber: true })}
          />
        </Field>
        <Field label="To Amount" htmlFor="ac-to" required error={errors.toAmount?.message}>
          <TextInput
            id="ac-to"
            type="number"
            step="any"
            inputMode="decimal"
            prefix="TSh"
            invalid={!!errors.toAmount}
            {...register("toAmount", { valueAsNumber: true })}
          />
        </Field>
      </FieldGrid>

      <Field
        label="Recovery Periods"
        htmlFor="ac-periods"
        required
        error={errors.recoveryPeriods?.message}
        help="How many payslips this advance is recovered over. The instalment is the total repayable divided across them."
      >
        <TextInput
          id="ac-periods"
          type="number"
          step="1"
          min="1"
          inputMode="numeric"
          invalid={!!errors.recoveryPeriods}
          {...register("recoveryPeriods", { valueAsNumber: true })}
        />
      </Field>
    </SettingsDialog>
  );
}

function DeleteCategoryAction({
  category,
  onConfirm,
}: {
  category: SalaryAdvanceCategoryRecord;
  onConfirm: (category: SalaryAdvanceCategoryRecord) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete ${category.name}`} tone="secondary" />}
      title={`Delete ${category.name}?`}
      consequence={`New requests will no longer be able to pick this band. Advances already priced against it keep the rate and fee they were given.`}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(category);
        setOpen(false);
      }}
    />
  );
}
