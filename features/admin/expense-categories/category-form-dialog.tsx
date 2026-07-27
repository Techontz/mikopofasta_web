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
import { ExpenseCategorySchema, type ExpenseCategory } from "@/types/expense";
import { createExpenseCategory, updateExpenseCategory } from "@/features/admin/expense-categories/actions";

const FormSchema = ExpenseCategorySchema.pick({ name: true, scope: true });
type FormValues = z.infer<typeof FormSchema>;

export function ExpenseCategoryFormDialog({ category }: { category?: ExpenseCategory }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(category);
  const defaults: FormValues = { name: category?.name ?? "", scope: category?.scope ?? "branch" };

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
      const result = isEdit ? await updateExpenseCategory(category!.id, values) : await createExpenseCategory(values);
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
              New Category
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense Category" : "New Expense Category"}</DialogTitle>
          <DialogDescription>A dedicated ledger account is created automatically for every category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-cat-name">Name</Label>
            <Input id="exp-cat-name" placeholder="e.g. Fuel" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Select value={watch("scope")} onValueChange={(v) => setValue("scope", v as FormValues["scope"])}>
              <SelectTrigger aria-label="Scope" className="w-full">
                <SelectValue>{(v: string) => (v === "hq" ? "HQ" : "Branch")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branch">Branch</SelectItem>
                <SelectItem value="hq">HQ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
