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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoanProductSchema, type LoanProduct, type InterestFormula, type RepaymentSchedule } from "@/types/loan-product";
import { PENALTY_TYPES } from "@/types/enums";
import { createLoanProduct, updateLoanProduct } from "@/features/admin/loan-products/actions";

const FormSchema = LoanProductSchema.pick({
  name: true,
  code: true,
  interestFormulaId: true,
  interestRate: true,
  minAmount: true,
  maxAmount: true,
  minTenureDays: true,
  maxTenureDays: true,
  penaltyType: true,
  penaltyRate: true,
  penaltyGraceDays: true,
  penaltyCapAmount: true,
  requiresMandate: true,
  status: true,
}).extend({ repaymentScheduleIds: z.array(z.string()) });
type FormValues = z.infer<typeof FormSchema>;

interface ProductFormDialogProps {
  product?: LoanProduct;
  formulas: InterestFormula[];
  schedules: RepaymentSchedule[];
  productScheduleIds?: string[];
}

function defaultsFor(product: ProductFormDialogProps["product"], productScheduleIds: string[]): FormValues {
  return {
    name: product?.name ?? "",
    code: product?.code ?? "",
    interestFormulaId: product?.interestFormulaId ?? "",
    interestRate: product?.interestRate ?? 10,
    minAmount: product?.minAmount ?? 100_000,
    maxAmount: product?.maxAmount ?? 1_000_000,
    minTenureDays: product?.minTenureDays ?? 30,
    maxTenureDays: product?.maxTenureDays ?? 180,
    penaltyType: product?.penaltyType ?? "percentage_of_overdue",
    penaltyRate: product?.penaltyRate ?? 5,
    penaltyGraceDays: product?.penaltyGraceDays ?? 3,
    penaltyCapAmount: product?.penaltyCapAmount ?? null,
    requiresMandate: product?.requiresMandate ?? false,
    status: product?.status ?? "active",
    repaymentScheduleIds: productScheduleIds,
  };
}

export function ProductFormDialog({ product, formulas, schedules, productScheduleIds = [] }: ProductFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaultsFor(product, productScheduleIds) });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit ? await updateLoanProduct(product!.id, values) : await createLoanProduct(values);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  const selectedSchedules = watch("repaymentScheduleIds");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaultsFor(product, productScheduleIds));
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
              New Product
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Loan Product" : "New Loan Product"}</DialogTitle>
          <DialogDescription>Every commercial term is configured here — nothing is hardcoded in the loan engine.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pr-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-name">Name</Label>
                <Input id="prod-name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-code">Code</Label>
                <Input id="prod-code" {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Interest formula</Label>
                <Select value={watch("interestFormulaId")} onValueChange={(v) => v && setValue("interestFormulaId", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select formula">
                      {(v: string) => formulas.find((f) => f.id === v)?.name ?? "Select formula"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {formulas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.interestFormulaId && <p className="text-xs text-destructive">{errors.interestFormulaId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-rate">Interest rate (%)</Label>
                <Input id="prod-rate" type="number" step="0.1" {...register("interestRate", { valueAsNumber: true })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-min-amount">Min amount (TZS)</Label>
                <Input id="prod-min-amount" type="number" {...register("minAmount", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-max-amount">Max amount (TZS)</Label>
                <Input id="prod-max-amount" type="number" {...register("maxAmount", { valueAsNumber: true })} />
                {errors.maxAmount && <p className="text-xs text-destructive">{errors.maxAmount.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-min-tenure">Min tenure (days)</Label>
                <Input id="prod-min-tenure" type="number" {...register("minTenureDays", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-max-tenure">Max tenure (days)</Label>
                <Input id="prod-max-tenure" type="number" {...register("maxTenureDays", { valueAsNumber: true })} />
                {errors.maxTenureDays && <p className="text-xs text-destructive">{errors.maxTenureDays.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Penalty type</Label>
                <Select value={watch("penaltyType")} onValueChange={(v) => setValue("penaltyType", v as FormValues["penaltyType"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue className="capitalize">{(v: string) => v.replace(/_/g, " ")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PENALTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-penalty-rate">Penalty rate</Label>
                <Input id="prod-penalty-rate" type="number" step="0.1" {...register("penaltyRate", { valueAsNumber: true })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-grace">Penalty grace (days)</Label>
                <Input id="prod-grace" type="number" {...register("penaltyGraceDays", { valueAsNumber: true })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prod-cap">Penalty cap (TZS, optional)</Label>
                <Input
                  id="prod-cap"
                  type="number"
                  defaultValue={watch("penaltyCapAmount") ?? ""}
                  onChange={(e) => setValue("penaltyCapAmount", e.target.value ? Number(e.target.value) : null)}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox checked={watch("requiresMandate")} onCheckedChange={(v) => setValue("requiresMandate", v === true)} id="prod-mandate" />
                <Label htmlFor="prod-mandate" className="font-normal">Requires E-Mandate</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <Label>Allowed repayment schedules</Label>
              <div className="flex flex-wrap gap-3">
                {schedules.map((schedule) => {
                  const checked = selectedSchedules.includes(schedule.id);
                  return (
                    <div key={schedule.id} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setValue(
                            "repaymentScheduleIds",
                            v === true ? [...selectedSchedules, schedule.id] : selectedSchedules.filter((id) => id !== schedule.id)
                          )
                        }
                        id={`sched-${schedule.id}`}
                      />
                      <Label htmlFor={`sched-${schedule.id}`} className="font-normal">
                        {schedule.name}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {errors.repaymentScheduleIds && <p className="text-xs text-destructive">{errors.repaymentScheduleIds.message}</p>}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
