"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { requiredText } from "@/lib/forms/required-text";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, TextInput } from "@/components/settings/form";
import type { CustomerCategory } from "@/types/customer";
import {
  createCustomerCategory,
  updateCustomerCategory,
  type CategoryInputValues,
} from "@/features/admin/customer-categories/actions";

/**
 * Create or rename one Customer Type.
 *
 * DELIBERATELY ONE FIELD. This form used to ask for a code, a description, a
 * display order, a risk tier, a sector, a document list, an extra-approval flag
 * and a set of dynamic KYC field definitions — nine answers to create one
 * classification, eight of which an administrator naming "Wajasiriamali" has no
 * opinion about yet.
 *
 * The code in particular is an INTERNAL key, and the server derives it from the
 * name (`Watumishi wa Umma` → `WATUMISHI_WA_UMMA`), resolving collisions itself.
 * Nobody should be asked to invent an identifier for something they have just
 * named.
 *
 * Everything else keeps its column and its default. What a customer type
 * eventually demands of a customer is configuration, and it is not collected
 * here — a rename sends the name alone, and the API leaves every other field
 * exactly as it was rather than reading an absent key as "empty".
 */
const FormSchema = z.object({ name: requiredText("Customer type name") });
type FormValues = z.infer<typeof FormSchema>;

export function CategoryFormDialog({ category }: { category?: CustomerCategory }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: category?.name ?? "" },
  });

  function onSubmit(values: FormValues) {
    /* The name, and only the name. Every other field is absent from the
       payload, which is what tells the API to leave it alone. */
    const payload: CategoryInputValues = { name: values.name.trim() };

    startTransition(async () => {
      const result = isEdit
        ? await updateCustomerCategory(category!.id, payload)
        : await createCustomerCategory(payload);

      toast[result.ok ? "success" : "error"](result.message);

      if (result.ok) {
        setOpen(false);
        reset({ name: isEdit ? values.name.trim() : "" });
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) reset({ name: category?.name ?? "" });
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${category!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Customer Type
          </Button>
        )
      }
      title={isEdit ? "Edit Customer Type" : "Add Customer Type"}
      description={
        isEdit
          ? "Rename this customer type. Nothing else about it changes."
          : "Create a customer type that can be used during customer registration."
      }
      formId="customer-type-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save Changes" : "Add Customer Type"}
      pending={pending}
      /* The default width. `lg` is for the multi-section configuration
         dialogs; this one has a single field and should not look like them. */
      size="md"
    >
      <FieldGrid>
        <Field label="Customer Type Name" htmlFor="type-name" required error={errors.name?.message}>
          <TextInput
            id="type-name"
            placeholder="e.g. Wajasiriamali"
            invalid={!!errors.name}
            {...register("name")}
          />
        </Field>
      </FieldGrid>
    </SettingsDialog>
  );
}
