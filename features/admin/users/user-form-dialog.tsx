"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { ROLES, type Role } from "@/types/auth";
import { ROLE_LABELS } from "@/config/permissions";
import { createUser, updateUser } from "@/features/admin/users/users-actions";
import type { MockCredential } from "@/lib/mock-data/users";
import type { Branch, Zone, Region } from "@/types/branch";

const FormSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(9, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email").nullable(),
  password: z.string().optional(),
  role: z.enum(ROLES),
  branchId: z.string().nullable(),
  zoneId: z.string().nullable(),
  regionId: z.string().nullable(),
});
type FormValues = z.infer<typeof FormSchema>;
const NONE = "__none__";

interface UserFormDialogProps {
  user?: MockCredential;
  branches: Branch[];
  zones: Zone[];
  regions: Region[];
}

export function UserFormDialog({ user, branches, zones, regions }: UserFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(user);

  const defaults: FormValues = {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? null,
    password: "",
    role: user?.role ?? "loan_officer",
    branchId: user?.branchId ?? null,
    zoneId: user?.zoneId ?? null,
    regionId: user?.regionId ?? null,
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
      const result = isEdit
        ? await updateUser(user!.id, { ...values, email: values.email || null })
        : await createUser({ ...values, email: values.email || null, password: values.password || "" });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  // useWatch rather than watch(): the latter returns a new function each
  // render, which makes the React Compiler skip memoizing this component.
  const role = useWatch({ control, name: "role" }) as Role;
  const branchId = useWatch({ control, name: "branchId" });
  const zoneId = useWatch({ control, name: "zoneId" });
  const regionId = useWatch({ control, name: "regionId" });

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
      trigger={
        isEdit ? (
          <IconButton icon={Pencil} label={`Edit ${user!.name}`} tone="secondary" />
        ) : (
          <Button tone="primary" icon={Plus}>
            New User
          </Button>
        )
      }
      title={isEdit ? "Edit User" : "New User"}
      description="Role determines default permissions — see Roles & Permissions for the full matrix."
      formId="user-form"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={isEdit ? "Save changes" : "Create user"}
      pending={pending}
      size="lg"
    >
      <Field label="Full name" htmlFor="user-name" required error={errors.name?.message}>
        <TextInput id="user-name" autoComplete="name" invalid={!!errors.name} {...register("name")} />
      </Field>

      <FieldGrid>
        <Field label="Phone number" htmlFor="user-phone" required error={errors.phone?.message}>
          <TextInput id="user-phone" type="tel" inputMode="tel" placeholder="0754000012" invalid={!!errors.phone} {...register("phone")} />
        </Field>
        <Field label="Email" htmlFor="user-email" error={errors.email?.message}>
          <TextInput id="user-email" type="email" invalid={!!errors.email} {...register("email")} />
        </Field>
      </FieldGrid>

      {/* Only offered on create, exactly as before. */}
      {!isEdit && (
        <Field
          label="Temporary password"
          htmlFor="user-password"
          error={errors.password?.message}
          help="The user is asked to change this at first sign-in."
        >
          <TextInput id="user-password" type="password" autoComplete="new-password" invalid={!!errors.password} {...register("password")} />
        </Field>
      )}

      <FieldGrid>
        <Field label="Role" htmlFor="user-role" error={errors.role?.message}>
          <Select
            id="user-role"
            value={role}
            onChange={(e) => setValue("role", e.target.value as Role, { shouldDirty: true })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>

        {/*
          Nullable, so these stay controlled rather than registered: a native
          select would submit "" where the action expects null.
        */}
        <Field label="Home branch" htmlFor="user-branch" error={errors.branchId?.message}>
          <Select
            id="user-branch"
            value={branchId ?? NONE}
            onChange={(e) => setValue("branchId", e.target.value === NONE ? null : e.target.value, { shouldDirty: true })}
          >
            <option value={NONE}>None</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGrid>

      {/* Scope fields appear only for the two roles that carry one (§13). */}
      {role === "zone_manager" && (
        <Field label="Zone oversight" htmlFor="user-zone" error={errors.zoneId?.message} className="sm:max-w-sm">
          <Select
            id="user-zone"
            value={zoneId ?? NONE}
            onChange={(e) => setValue("zoneId", e.target.value === NONE ? null : e.target.value, { shouldDirty: true })}
          >
            <option value={NONE}>None</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {role === "regional_manager" && (
        <Field label="Region oversight" htmlFor="user-region" error={errors.regionId?.message} className="sm:max-w-sm">
          <Select
            id="user-region"
            value={regionId ?? NONE}
            onChange={(e) => setValue("regionId", e.target.value === NONE ? null : e.target.value, { shouldDirty: true })}
          >
            <option value={NONE}>None</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </SettingsDialog>
  );
}
