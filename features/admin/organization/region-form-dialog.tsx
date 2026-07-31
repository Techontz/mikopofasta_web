"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, IconButton, TextInput } from "@/components/settings/form";
import { RegionSchema, type Region } from "@/types/branch";
import { createRegion, updateRegion } from "@/features/admin/organization/regions-actions";

const FormSchema = RegionSchema.pick({ name: true });
type FormValues = z.infer<typeof FormSchema>;

export function RegionFormDialog({ region }: { region?: Region }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(region);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { name: region?.name ?? "" } });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateRegion(region!.id, values) : await createRegion(values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        reset();
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
        if (next) reset({ name: region?.name ?? "" });
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${region!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Region
          </Button>
        )
      }
      title={isEdit ? "Edit Region" : "New Region"}
      description="Regions group branches geographically and feed the customer address hierarchy."
      formId="region-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create region"}
      pending={pending}
    >
      <Field label="Name" htmlFor="region-name" required error={errors.name?.message}>
        <TextInput id="region-name" placeholder="e.g. Mwanza" invalid={!!errors.name} {...register("name")} />
      </Field>
    </SettingsDialog>
  );
}
