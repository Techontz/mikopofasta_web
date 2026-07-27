"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { GUARANTOR_RELATIONSHIPS } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

export function NextOfKinStep() {
  const { control, register, setValue, watch } = useFormContext<WizardValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "nextOfKin" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Who should be contacted in case of emergency?</p>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", relationship: "spouse", phone: "", address: null })}>
          <Plus className="size-4" />
          Add Next of Kin
        </Button>
      </div>

      {fields.length === 0 && <EmptyState icon={UserRound} title="No next of kin added" description="Add at least one emergency contact if possible." />}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input {...register(`nextOfKin.${index}.name`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register(`nextOfKin.${index}.phone`)} />
            </div>
            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select
                value={watch(`nextOfKin.${index}.relationship`)}
                onValueChange={(v) => v && setValue(`nextOfKin.${index}.relationship`, v as WizardValues["nextOfKin"][number]["relationship"])}
              >
                <SelectTrigger className="w-full">
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
              <Label>Address (optional)</Label>
              <Input {...register(`nextOfKin.${index}.address`)} />
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
