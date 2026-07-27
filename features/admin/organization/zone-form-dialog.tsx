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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: zone?.name ?? "", zoneManagerId: zone?.zoneManagerId ?? null },
  });

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ name: zone?.name ?? "", zoneManagerId: zone?.zoneManagerId ?? null });
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
              New Zone
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Zone" : "New Zone"}</DialogTitle>
          <DialogDescription>Zones group branches for Zone Manager oversight and commission override.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="zone-name">Name</Label>
            <Input id="zone-name" placeholder="e.g. West Zone" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Zone Manager</Label>
            <Select
              value={watch("zoneManagerId") ?? UNASSIGNED}
              onValueChange={(v) => setValue("zoneManagerId", v === UNASSIGNED ? null : v)}
            >
              <SelectTrigger aria-label="Zone Manager" className="w-full">
                <SelectValue>{(v: string) => managers.find((m) => m.id === v)?.name ?? "Unassigned"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create zone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
