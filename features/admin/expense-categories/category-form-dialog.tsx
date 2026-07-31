"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, IconButton, Select, TextInput } from "@/components/settings/form";
import { ExpenseCategorySchema } from "@/types/expense";
import type { ExpenseRegisterEntry } from "@/lib/api/expenses";
import { createExpenseCategory, updateExpenseCategory } from "@/features/admin/expense-categories/actions";

const FormSchema = ExpenseCategorySchema.pick({ name: true, scope: true });
type FormValues = z.infer<typeof FormSchema>;

export function ExpenseCategoryFormDialog({ category }: { category?: ExpenseRegisterEntry }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(category);
  const defaults: FormValues = { name: category?.name ?? "", scope: category?.scope ?? "branch" };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateExpenseCategory(category!.id, values) : await createExpenseCategory(values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${category!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Category
          </Button>
        )
      }
      title={isEdit ? "Edit Expense Category" : "New Expense Category"}
      description="A dedicated 6xxx ledger account is created automatically for every category, and every expense filed under it posts there."
      formId="expense-category-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create category"}
      pending={pending}
    >
      <Field label="Name" htmlFor="exp-cat-name" required error={errors.name?.message}>
        <TextInput id="exp-cat-name" placeholder="e.g. Fuel" invalid={!!errors.name} {...register("name")} />
      </Field>

      <Field
        label="Scope"
        htmlFor="exp-cat-scope"
        error={errors.scope?.message}
        help={isEdit ? "Fixed when the category was created." : "Whether the cost belongs to a branch or to head office."}
      >
        {/*
          Disabled on edit. The register a category belongs to is fixed at
          creation — moving it would silently re-file every request already
          under it and change historical Branch P&L — but it is still shown,
          because a reader editing a name needs to know which register they
          are in.
        */}
        <Select id="exp-cat-scope" invalid={!!errors.scope} disabled={isEdit} {...register("scope")}>
          <option value="branch">Branch</option>
          <option value="headquarters">Headquarters</option>
        </Select>
      </Field>
    </SettingsDialog>
  );
}
