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
import { ZoneSchema, type Zone } from "@/types/branch";
import { createZone, updateZone } from "@/features/admin/organization/zones-actions";
import type { AuthenticatedUser } from "@/types/auth";

const FormSchema = ZoneSchema.pick({ name: true, zoneManagerId: true });
type FormValues = z.infer<typeof FormSchema>;
const UNASSIGNED = "__unassigned__";

export function ZoneFormDialog({ zone, managers }: { zone?: Zone; managers: Pick<AuthenticatedUser, "id" | "name">[] }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(zone);

  const defaults = { name: zone?.name ?? "", zoneManagerId: zone?.zoneManagerId ?? null };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateZone(zone!.id, values) : await createZone(values);
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
          <IconButton icon={Pencil} label={`Edit ${zone!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Zone
          </Button>
        )
      }
      title={isEdit ? "Edit Zone" : "New Zone"}
      description="Zones group branches for Zone Manager oversight and commission override."
      formId="zone-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create zone"}
      pending={pending}
    >
      <Field label="Name" htmlFor="zone-name" required error={errors.name?.message}>
        <TextInput id="zone-name" placeholder="e.g. West Zone" invalid={!!errors.name} {...register("name")} />
      </Field>

      <Field
        label="Zone Manager"
        htmlFor="zone-manager"
        error={errors.zoneManagerId?.message}
        help="Optional. A zone can be created before its manager is appointed."
      >
        {/*
          Controlled rather than registered: the field is nullable, and a
          registered native select would submit "" where the schema expects
          null. This keeps exactly the value the action received before.
        */}
        <Select
          id="zone-manager"
          value={watch("zoneManagerId") ?? UNASSIGNED}
          onChange={(e) =>
            setValue("zoneManagerId", e.target.value === UNASSIGNED ? null : e.target.value, { shouldDirty: true })
          }
        >
          <option value={UNASSIGNED}>Unassigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>
    </SettingsDialog>
  );
}
