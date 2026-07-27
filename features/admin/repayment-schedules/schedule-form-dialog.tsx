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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RepaymentScheduleSchema, type RepaymentSchedule } from "@/types/loan-product";
import { createRepaymentSchedule, updateRepaymentSchedule } from "@/features/admin/repayment-schedules/actions";

const FormSchema = RepaymentScheduleSchema.pick({ name: true, code: true, frequencyDays: true });
type FormValues = z.infer<typeof FormSchema>;

export function ScheduleFormDialog({ schedule }: { schedule?: RepaymentSchedule }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(schedule);

  const defaults: FormValues = { name: schedule?.name ?? "", code: schedule?.code ?? "", frequencyDays: schedule?.frequencyDays ?? 7 };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateRepaymentSchedule(schedule!.id, values) : await createRepaymentSchedule(values);
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
              New Schedule
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Repayment Schedule" : "New Repayment Schedule"}</DialogTitle>
          <DialogDescription>Cadence a loan&apos;s installments follow — independent of the customer category and loan product.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sched-name">Name</Label>
            <Input id="sched-name" placeholder="e.g. Bi-weekly" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sched-code">Code</Label>
            <Input id="sched-code" placeholder="e.g. BIWEEKLY" {...register("code")} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sched-freq">Frequency (days)</Label>
            <Input id="sched-freq" type="number" {...register("frequencyDays", { valueAsNumber: true })} />
            {errors.frequencyDays && <p className="text-xs text-destructive">{errors.frequencyDays.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
