"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    watch,
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

  const role = watch("role") as Role;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults);
      }}
    >
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="size-4" />
              New User
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "New User"}</DialogTitle>
          <DialogDescription>Role determines default permissions — see Roles & Permissions for the full matrix.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="user-name">Full name</Label>
              <Input id="user-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-phone">Phone number</Label>
              <Input id="user-phone" placeholder="0754000012" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            {!isEdit && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="user-password">Temporary password</Label>
                <Input id="user-password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setValue("role", v as Role)}>
                <SelectTrigger aria-label="Role" className="w-full">
                  <SelectValue>{(v: Role) => ROLE_LABELS[v]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Home branch</Label>
              <Select value={watch("branchId") ?? NONE} onValueChange={(v) => setValue("branchId", v === NONE ? null : v)}>
                <SelectTrigger aria-label="Home branch" className="w-full">
                  <SelectValue>{(v: string) => branches.find((b) => b.id === v)?.name ?? "None"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === "zone_manager" && (
              <div className="space-y-1.5">
                <Label>Zone oversight</Label>
                <Select value={watch("zoneId") ?? NONE} onValueChange={(v) => setValue("zoneId", v === NONE ? null : v)}>
                  <SelectTrigger aria-label="Zone oversight" className="w-full">
                    <SelectValue>{(v: string) => zones.find((z) => z.id === v)?.name ?? "None"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {role === "regional_manager" && (
              <div className="space-y-1.5">
                <Label>Region oversight</Label>
                <Select value={watch("regionId") ?? NONE} onValueChange={(v) => setValue("regionId", v === NONE ? null : v)}>
                  <SelectTrigger aria-label="Region oversight" className="w-full">
                    <SelectValue>{(v: string) => regions.find((r) => r.id === v)?.name ?? "None"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
