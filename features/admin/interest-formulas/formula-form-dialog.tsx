"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InterestFormulaSchema, type InterestFormula } from "@/types/loan-product";
import { updateInterestFormula } from "@/features/admin/interest-formulas/actions";

const FormSchema = InterestFormulaSchema.pick({ name: true, description: true });
type FormValues = z.infer<typeof FormSchema>;

export function FormulaFormDialog({ formula }: { formula: InterestFormula }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { name: formula.name, description: formula.description } });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateInterestFormula(formula.id, values);
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
        if (next) reset({ name: formula.name, description: formula.description });
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm">Edit</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {formula.code} Formula</DialogTitle>
          <DialogDescription>
            The calculation method (code: <span className="font-mono">{formula.code}</span>) is fixed — it drives the loan schedule
            generator. Only the label and description are editable.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="formula-name">Display name</Label>
            <Input id="formula-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formula-desc">Description</Label>
            <Textarea id="formula-desc" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
