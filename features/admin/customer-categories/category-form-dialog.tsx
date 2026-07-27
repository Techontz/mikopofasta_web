"use client";

import * as React from "react";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CustomerCategorySchema, type CustomerCategory } from "@/types/customer";
import { CUSTOMER_CATEGORY_SECTORS, RISK_TIERS } from "@/types/enums";
import { createCustomerCategory, updateCustomerCategory, type CategoryInputValues } from "@/features/admin/customer-categories/actions";

const FormSchema = CustomerCategorySchema.pick({
  name: true,
  code: true,
  riskTier: true,
  sector: true,
  dynamicFormSchema: true,
  requiresExtraApproval: true,
}).extend({
  requiredDocumentsText: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const FIELD_TYPES = ["text", "number", "select", "date", "textarea"] as const;

function toFormValues(category?: CustomerCategory): FormValues {
  return {
    name: category?.name ?? "",
    code: category?.code ?? "",
    riskTier: category?.riskTier ?? "medium",
    sector: category?.sector ?? "business",
    dynamicFormSchema: category?.dynamicFormSchema ?? [],
    requiresExtraApproval: category?.requiresExtraApproval ?? false,
    requiredDocumentsText: category?.requiredDocuments.join(", ") ?? "",
  };
}

export function CategoryFormDialog({ category }: { category?: CustomerCategory }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(category);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: toFormValues(category) });

  const { fields, append, remove } = useFieldArray({ control, name: "dynamicFormSchema" });

  function onSubmit(values: FormValues) {
    const payload: CategoryInputValues = {
      name: values.name,
      code: values.code,
      riskTier: values.riskTier,
      sector: values.sector,
      dynamicFormSchema: values.dynamicFormSchema,
      requiresExtraApproval: values.requiresExtraApproval,
      requiredDocuments: values.requiredDocumentsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    startTransition(async () => {
      const result = isEdit ? await updateCustomerCategory(category!.id, payload) : await createCustomerCategory(payload);
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
        if (next) reset(toFormValues(category));
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
              New Category
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Customer Category" : "New Customer Category"}</DialogTitle>
          <DialogDescription>Category drives KYC requirements, risk tier, and which loan products a customer is eligible for.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pr-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" placeholder="e.g. Boda Boda" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-code">Code</Label>
                <Input id="cat-code" placeholder="e.g. BODA" {...register("code")} />
                {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Risk tier</Label>
                <Select value={watch("riskTier")} onValueChange={(v) => setValue("riskTier", v as FormValues["riskTier"])}>
                  <SelectTrigger aria-label="Risk tier" className="w-full">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_TIERS.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Select value={watch("sector")} onValueChange={(v) => v && setValue("sector", v as FormValues["sector"])}>
                  <SelectTrigger aria-label="Sector" className="w-full">
                    <SelectValue className="capitalize" />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_CATEGORY_SECTORS.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Determines whether the registration wizard shows an Employment or Business step.</p>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="cat-extra-approval"
                  checked={watch("requiresExtraApproval")}
                  onCheckedChange={(v) => setValue("requiresExtraApproval", v === true)}
                />
                <Label htmlFor="cat-extra-approval" className="font-normal">
                  Requires extra approval
                </Label>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-docs">Required documents (comma-separated)</Label>
                <Input id="cat-docs" placeholder="salary_slip, employer_letter" {...register("requiredDocumentsText")} />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label>Dynamic KYC form fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ key: "", label: "", type: "text", required: false })}
                >
                  <Plus className="size-4" />
                  Add field
                </Button>
              </div>
              {fields.length === 0 && <p className="text-sm text-muted-foreground">No dynamic fields yet — this category only collects the standard KYC data.</p>}
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 items-center gap-2 rounded-md border p-2">
                    <Input className="col-span-3" placeholder="Key" {...register(`dynamicFormSchema.${index}.key`)} />
                    <Input className="col-span-3" placeholder="Label" {...register(`dynamicFormSchema.${index}.label`)} />
                    <Select
                      value={watch(`dynamicFormSchema.${index}.type`)}
                      onValueChange={(v) => setValue(`dynamicFormSchema.${index}.type`, v as (typeof FIELD_TYPES)[number])}
                    >
                      <SelectTrigger aria-label="Field type" className="col-span-3 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="col-span-2 flex items-center gap-1.5">
                      <Checkbox
                        checked={watch(`dynamicFormSchema.${index}.required`)}
                        onCheckedChange={(v) => setValue(`dynamicFormSchema.${index}.required`, v === true)}
                      />
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" className="col-span-1 text-destructive" onClick={() => remove(index)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
