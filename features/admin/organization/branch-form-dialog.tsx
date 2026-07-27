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
    watch,
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

  const type = watch("type");

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
              New Branch
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "New Branch"}</DialogTitle>
          <DialogDescription>Every branch automatically gets its own Teller Cash ledger account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input id="branch-name" placeholder="e.g. Kakonko" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-phone">Phone</Label>
              <Input id="branch-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Branch type</Label>
              <Select value={type} onValueChange={(v) => setValue("type", v as FormValues["type"])}>
                <SelectTrigger aria-label="Branch type" className="w-full">
                  <SelectValue className="capitalize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="sub">Sub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select value={watch("regionId") ?? NONE} onValueChange={(v) => setValue("regionId", v === NONE ? null : v)}>
                <SelectTrigger aria-label="Region" className="w-full">
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
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Select value={watch("zoneId") ?? NONE} onValueChange={(v) => setValue("zoneId", v === NONE ? null : v)}>
                <SelectTrigger aria-label="Zone" className="w-full">
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
            {type === "sub" && (
              <div className="space-y-1.5">
                <Label>Parent branch</Label>
                <Select value={watch("parentBranchId") ?? NONE} onValueChange={(v) => setValue("parentBranchId", v === NONE ? null : v)}>
                  <SelectTrigger aria-label="Parent branch" className="w-full">
                    <SelectValue>{(v: string) => branches.find((b) => b.id === v)?.name ?? "None"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {branches
                      .filter((b) => b.id !== branch?.id && b.type === "main")
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                <SelectTrigger aria-label="Status" className="w-full">
                  <SelectValue className="capitalize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
