"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  SalaryAdvanceCategoryInputSchema,
  type SalaryAdvanceCategory,
  type SalaryAdvanceCategoryInput,
} from "@/types/salary-advance";

const EMPTY: SalaryAdvanceCategoryInput = {
  name: "",
  interestRate: 0,
  fromAmount: 0,
  toAmount: 0,
  chargeFee: 0,
};

/**
 * Salary Advance → Salary Advance Category.
 *
 * The bands an advance is priced against: each carries an interest rate, the
 * amount range it applies to, and its charge fee. Add and Edit share one dialog
 * — the fields are identical, and two copies would drift.
 */
export function CategoriesPanel({ categories }: { categories: SalaryAdvanceCategory[] }) {
  const [rows, setRows] = React.useState(categories);
  const [editing, setEditing] = React.useState<SalaryAdvanceCategory | null>(null);
  const [adding, setAdding] = React.useState(false);

  function upsert(values: SalaryAdvanceCategoryInput, id?: string) {
    if (id) {
      setRows((prev) => prev.map((c) => (c.id === id ? { ...c, ...values } : c)));
      toast.success(`${values.name} updated.`);
    } else {
      setRows((prev) => [...prev, { id: `cat-${prev.length + 1}-${Date.parse("2026-07-28")}`, ...values }]);
      toast.success(`${values.name} added.`);
    }
  }

  function remove(category: SalaryAdvanceCategory) {
    setRows((prev) => prev.filter((c) => c.id !== category.id));
    toast.success(`${category.name} deleted.`);
  }

  const columns: ColumnDef<SalaryAdvanceCategory>[] = [
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
  category: SalaryAdvanceCategory | null;
  onClose: () => void;
  onSave: (values: SalaryAdvanceCategoryInput, id?: string) => void;
}) {
  const defaults: SalaryAdvanceCategoryInput = category
    ? {
        name: category.name,
        interestRate: category.interestRate,
        fromAmount: category.fromAmount,
        toAmount: category.toAmount,
        chargeFee: category.chargeFee,
      }
    : EMPTY;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SalaryAdvanceCategoryInput>({
    resolver: zodResolver(SalaryAdvanceCategoryInputSchema),
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
    </SettingsDialog>
  );
}

function DeleteCategoryAction({
  category,
  onConfirm,
}: {
  category: SalaryAdvanceCategory;
  onConfirm: (category: SalaryAdvanceCategory) => void;
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
