"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, TextArea, TextInput } from "@/components/settings/form";
import { InterestFormulaSchema, type InterestFormula } from "@/types/loan-product";
import { updateInterestFormula } from "@/features/admin/interest-formulas/actions";

const FormSchema = InterestFormulaSchema.pick({ name: true, description: true });
type FormValues = z.infer<typeof FormSchema>;

export function FormulaFormDialog({ formula }: { formula: InterestFormula }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const defaults = { name: formula.name, description: formula.description };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateInterestFormula(formula.id, values);
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
        <Button tone="secondary" icon={Pencil}>
          Edit
        </Button>
      }
      title={`Edit ${formula.code} Formula`}
      description="The calculation method is fixed — it drives the loan schedule generator. Only the label and description are editable."
      formId="formula-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="Save changes"
      pending={pending}
    >
      <Field label="Display name" htmlFor="formula-name" required error={errors.name?.message}>
        <TextInput id="formula-name" invalid={!!errors.name} {...register("name")} />
      </Field>
      <Field
        label="Description"
        htmlFor="formula-desc"
        error={errors.description?.message}
        help="Shown wherever this method is offered on the loan product form."
      >
        <TextArea id="formula-desc" rows={3} invalid={!!errors.description} {...register("description")} />
      </Field>
    </SettingsDialog>
  );
}
