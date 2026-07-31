"use client";

import * as React from "react";
import { useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { SectionDivider } from "@/components/settings";
import { Button, Field, FieldGrid, IconButton, Select, TextInput, Toggle } from "@/components/settings/form";
import { CustomerCategorySchema, type CustomerCategory } from "@/types/customer";
import { CUSTOMER_CATEGORY_SECTORS, RISK_TIERS } from "@/types/enums";
import { createCustomerCategory, updateCustomerCategory, type CategoryInputValues } from "@/features/admin/customer-categories/actions";

const FormSchema = CustomerCategorySchema.pick({
  name: true,
  code: true,
  riskTier: true,
  sector: true,
  dynamicFormSchema: true,
  requiresExtraApproval: true,
}).extend({
  requiredDocumentsText: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const FIELD_TYPES = ["text", "number", "select", "date", "textarea"] as const;

function toFormValues(category?: CustomerCategory): FormValues {
  return {
    name: category?.name ?? "",
    code: category?.code ?? "",
    riskTier: category?.riskTier ?? "medium",
    sector: category?.sector ?? "business",
    dynamicFormSchema: category?.dynamicFormSchema ?? [],
    requiresExtraApproval: category?.requiresExtraApproval ?? false,
    requiredDocumentsText: category?.requiredDocuments.join(", ") ?? "",
  };
}

export function CategoryFormDialog({ category }: { category?: CustomerCategory }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(category);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: toFormValues(category) });

  const { fields, append, remove } = useFieldArray({ control, name: "dynamicFormSchema" });

  function onSubmit(values: FormValues) {
    const payload: CategoryInputValues = {
      name: values.name,
      code: values.code,
      riskTier: values.riskTier,
      sector: values.sector,
      dynamicFormSchema: values.dynamicFormSchema,
      requiresExtraApproval: values.requiresExtraApproval,
      requiredDocuments: values.requiredDocumentsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    startTransition(async () => {
      const result = isEdit ? await updateCustomerCategory(category!.id, payload) : await createCustomerCategory(payload);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const riskTier = useWatch({ control, name: "riskTier" });
  const sector = useWatch({ control, name: "sector" });
  const requiresExtraApproval = useWatch({ control, name: "requiresExtraApproval" });
  const dynamicFields = useWatch({ control, name: "dynamicFormSchema" }) ?? [];

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(toFormValues(category));
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
      title={isEdit ? "Edit Customer Category" : "New Customer Category"}
      description="Category drives KYC requirements, risk tier, and which loan products a customer is eligible for."
      formId="customer-category-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create category"}
      pending={pending}
      size="lg"
    >
      <FieldGrid>
        <Field label="Name" htmlFor="cat-name" required error={errors.name?.message}>
          <TextInput id="cat-name" placeholder="e.g. Boda Boda" invalid={!!errors.name} {...register("name")} />
        </Field>
        <Field label="Code" htmlFor="cat-code" required error={errors.code?.message}>
          <TextInput id="cat-code" placeholder="e.g. BODA" className="font-mono" invalid={!!errors.code} {...register("code")} />
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Risk tier" htmlFor="cat-risk" error={errors.riskTier?.message}>
          <Select
            id="cat-risk"
            className="capitalize"
            value={riskTier}
            onChange={(e) => setValue("riskTier", e.target.value as FormValues["riskTier"], { shouldDirty: true })}
          >
            {RISK_TIERS.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Sector"
          htmlFor="cat-sector"
          error={errors.sector?.message}
          help="Determines whether the registration wizard shows an Employment or Business step."
        >
          <Select
            id="cat-sector"
            className="capitalize"
            value={sector}
            onChange={(e) => setValue("sector", e.target.value as FormValues["sector"], { shouldDirty: true })}
          >
            {CUSTOMER_CATEGORY_SECTORS.map((sec) => (
              <option key={sec} value={sec} className="capitalize">
                {sec}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      <Field
        label="Required documents"
        htmlFor="cat-docs"
        error={errors.requiredDocumentsText?.message}
        help="Comma-separated. Each becomes a required upload during KYC."
      >
        <TextInput id="cat-docs" placeholder="salary_slip, employer_letter" {...register("requiredDocumentsText")} />
      </Field>

      <Toggle
        id="cat-extra-approval"
        label="Requires extra approval"
        help="Customers in this category need a second approval before their loan proceeds."
        checked={requiresExtraApproval}
        onCheckedChange={(next) => setValue("requiresExtraApproval", next, { shouldDirty: true })}
      />

      <SectionDivider label="Dynamic KYC fields" />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="st-field-help max-w-md">
            Collected in addition to the standard KYC data, on the registration wizard.
          </p>
          <Button
            type="button"
            tone="secondary"
            icon={Plus}
            onClick={() => append({ key: "", label: "", type: "text", required: false })}
          >
            Add field
          </Button>
        </div>

        {fields.length === 0 ? (
          <div
            className="rounded-[10px] border border-dashed px-4 py-6 text-center st-field-help"
            style={{ borderColor: "var(--st-line)" }}
          >
            No dynamic fields yet — this category only collects the standard KYC data.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 items-center gap-2 rounded-[10px] border p-2.5"
                style={{ borderColor: "var(--st-line)", background: "var(--st-subtle)" }}
              >
                <TextInput
                  className="col-span-3"
                  placeholder="Key"
                  aria-label={`Field ${index + 1} key`}
                  {...register(`dynamicFormSchema.${index}.key`)}
                />
                <TextInput
                  className="col-span-3"
                  placeholder="Label"
                  aria-label={`Field ${index + 1} label`}
                  {...register(`dynamicFormSchema.${index}.label`)}
                />
                <div className="col-span-3">
                  <Select
                    aria-label={`Field ${index + 1} type`}
                    value={dynamicFields[index]?.type ?? "text"}
                    onChange={(e) =>
                      setValue(`dynamicFormSchema.${index}.type`, e.target.value as (typeof FIELD_TYPES)[number], {
                        shouldDirty: true,
                      })
                    }
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="col-span-2 flex items-center gap-1.5 text-[12.5px] text-[var(--st-ink-soft)]">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-[var(--st-accent)]"
                    checked={dynamicFields[index]?.required ?? false}
                    onChange={(e) =>
                      setValue(`dynamicFormSchema.${index}.required`, e.target.checked, { shouldDirty: true })
                    }
                  />
                  Required
                </label>
                <div className="col-span-1 flex justify-end">
                  <IconButton
                    icon={Trash2}
                    tone="ghost"
                    label={`Remove field ${index + 1}`}
                    onClick={() => remove(index)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SettingsDialog>
  );
}
