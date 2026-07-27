"use client";

import { useFormContext } from "react-hook-form";
import { Briefcase, Building2, FileQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { CustomerCategory } from "@/types/customer";

const NONE = "__none__";

const SECTOR_LABEL: Record<CustomerCategory["sector"], string> = {
  employment: "Employment Details",
  business: "Business Information",
  other: "Additional Information",
};

const SECTOR_ICON: Record<CustomerCategory["sector"], typeof Briefcase> = {
  employment: Briefcase,
  business: Building2,
  other: FileQuestion,
};

export function CategoryDataStep({ category }: { category: CustomerCategory | undefined }) {
  const { setValue, watch } = useFormContext<WizardValues>();
  const dynamicFormData = watch("dynamicFormData");

  if (!category) {
    return <EmptyState icon={FileQuestion} title="Select a customer category first" description="Go back to Personal Details and assign a category to continue." />;
  }

  const Icon = SECTOR_ICON[category.sector];

  if (category.dynamicFormSchema.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={`No additional ${SECTOR_LABEL[category.sector].toLowerCase()} required`}
        description={`The "${category.name}" category has no extra data fields configured.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {SECTOR_LABEL[category.sector]} — {category.name}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {category.dynamicFormSchema.map((field) => {
          const value = dynamicFormData[field.key] ?? "";
          return (
            <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
              <Label htmlFor={`dyn-${field.key}`}>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={`dyn-${field.key}`}
                  value={String(value)}
                  onChange={(e) => setValue("dynamicFormData", { ...dynamicFormData, [field.key]: e.target.value })}
                />
              ) : field.type === "select" ? (
                <Select
                  value={String(value) || NONE}
                  onValueChange={(v) => setValue("dynamicFormData", { ...dynamicFormData, [field.key]: !v || v === NONE ? "" : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${field.label.toLowerCase()}`}>
                      {(v: string) => (v === NONE ? `Select ${field.label.toLowerCase()}` : v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} className="text-muted-foreground">
                      {`Select ${field.label.toLowerCase()}`}
                    </SelectItem>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`dyn-${field.key}`}
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={String(value)}
                  onChange={(e) =>
                    setValue("dynamicFormData", {
                      ...dynamicFormData,
                      [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value,
                    })
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
