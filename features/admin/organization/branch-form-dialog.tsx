"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { requiredText } from "@/lib/forms/required-text";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { BranchSchema, type Branch } from "@/types/branch";
import type { Region, Zone } from "@/types/branch";
import { createBranch, updateBranch } from "@/features/admin/organization/branches-actions";

const FormSchema = BranchSchema.pick({
  name: true,
  regionId: true,
  zoneId: true,
  phone: true,
  type: true,
  parentBranchId: true,
  status: true,
}).extend({
  name: requiredText("Name"),
});
type FormValues = z.infer<typeof FormSchema>;
const NONE = "__none__";

interface BranchFormDialogProps {
  branch?: Branch;
  regions: Region[];
  zones: Zone[];
  branches: Branch[];
}

export function BranchFormDialog({ branch, regions, zones, branches }: BranchFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(branch);

  const defaults: FormValues = {
    name: branch?.name ?? "",
    regionId: branch?.regionId ?? null,
    zoneId: branch?.zoneId ?? null,
    phone: branch?.phone ?? "",
    type: branch?.type ?? "main",
    parentBranchId: branch?.parentBranchId ?? null,
    status: branch?.status ?? "active",
  };

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateBranch(branch!.id, values) : await createBranch(values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const type = useWatch({ control, name: "type" });
  const regionId = useWatch({ control, name: "regionId" });
  const zoneId = useWatch({ control, name: "zoneId" });
  const parentBranchId = useWatch({ control, name: "parentBranchId" });
  const status = useWatch({ control, name: "status" });

  /* Nullable selects stay controlled: a registered native select would submit
     "" where the action expects null. */
  const nullable = (name: "regionId" | "zoneId" | "parentBranchId") => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setValue(name, e.target.value === NONE ? null : e.target.value, { shouldDirty: true });

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${branch!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New Branch
          </Button>
        )
      }
      title={isEdit ? "Edit Branch" : "New Branch"}
      description="Every branch automatically gets its own Teller Cash ledger account."
      formId="branch-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create branch"}
      pending={pending}
      size="lg"
    >
      <Field label="Branch name" htmlFor="branch-name" required error={errors.name?.message}>
        <TextInput id="branch-name" placeholder="e.g. Kakonko" invalid={!!errors.name} {...register("name")} />
      </Field>

      <FieldGrid>
        <Field label="Phone" htmlFor="branch-phone" error={errors.phone?.message}>
          <TextInput id="branch-phone" type="tel" inputMode="tel" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="Branch type" htmlFor="branch-type" error={errors.type?.message}>
          <Select
            id="branch-type"
            className="capitalize"
            value={type}
            onChange={(e) => setValue("type", e.target.value as FormValues["type"], { shouldDirty: true })}
          >
            <option value="main">Main</option>
            <option value="sub">Sub</option>
          </Select>
        </Field>
      </FieldGrid>

      <FieldGrid>
        <Field label="Region" htmlFor="branch-region" error={errors.regionId?.message}>
          <Select id="branch-region" value={regionId ?? NONE} onChange={nullable("regionId")}>
            <option value={NONE}>None</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zone" htmlFor="branch-zone" error={errors.zoneId?.message}>
          <Select id="branch-zone" value={zoneId ?? NONE} onChange={nullable("zoneId")}>
            <option value={NONE}>None</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      <FieldGrid>
        {/* Only a sub-branch rolls up into a parent — same condition as before. */}
        {type === "sub" && (
          <Field
            label="Parent branch"
            htmlFor="branch-parent"
            error={errors.parentBranchId?.message}
            help="Only main branches can be a parent."
          >
            <Select id="branch-parent" value={parentBranchId ?? NONE} onChange={nullable("parentBranchId")}>
              <option value={NONE}>None</option>
              {branches
                .filter((b) => b.id !== branch?.id && b.type === "main")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        <Field label="Status" htmlFor="branch-status" error={errors.status?.message}>
          <Select
            id="branch-status"
            className="capitalize"
            value={status}
            onChange={(e) => setValue("status", e.target.value as FormValues["status"], { shouldDirty: true })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </FieldGrid>
    </SettingsDialog>
  );
}
