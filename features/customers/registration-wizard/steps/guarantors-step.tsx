"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

export function GuarantorsStep() {
  const { control, register, setValue, watch } = useFormContext<WizardValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "guarantors" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Add anyone vouching for this customer&apos;s loan repayment.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: "", phone: "", nidaNumber: null, relationship: "relative", address: null, occupation: null })}
        >
          <Plus className="size-4" />
          Add Guarantor
        </Button>
      </div>

      {fields.length === 0 && <EmptyState icon={Users} title="No guarantors added" description="Optional, but recommended for higher-risk categories." />}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...register(`guarantors.${index}.name`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register(`guarantors.${index}.phone`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select
                value={watch(`guarantors.${index}.relationship`)}
                onValueChange={(v) => v && setValue(`guarantors.${index}.relationship`, v as WizardValues["guarantors"][number]["relationship"])}
              >
                <SelectTrigger aria-label="Relationship" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GUARANTOR_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>NIDA Number (optional)</Label>
              <Input {...register(`guarantors.${index}.nidaNumber`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Occupation (optional)</Label>
              <Input {...register(`guarantors.${index}.occupation`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Address (optional)</Label>
              <Input {...register(`guarantors.${index}.address`)} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
