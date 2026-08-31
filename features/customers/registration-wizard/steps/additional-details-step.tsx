"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { ClipboardList, Info } from "lucide-react";
import { Combobox } from "@/components/settings/combobox";
import { Label } from "@/components/ui/label";
import { DynamicFields } from "@/features/customers/registration-wizard/dynamic-fields";
import type { Lookups } from "@/features/customers/registration-wizard/dynamic-form";
import { GuarantorsStep } from "@/features/customers/registration-wizard/steps/guarantors-step";
import { NextOfKinStep } from "@/features/customers/registration-wizard/steps/next-of-kin-step";
import { structuredNameFor } from "@/features/customers/registration-wizard/structured-fields";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { CustomerCategory } from "@/types/customer";

/**
 * Step 2 — Additional Details. One question of its own, and then the form that
 * question selects.
 *
 *   CUSTOMER TYPE                       chosen from whatever is configured
 *   ───────────────────────────────
 *   <the type's own card>               its configured fields, in its order
 *
 * WHAT THIS FILE USED TO BE. Eighteen named inputs — Nick name, Work Type,
 * Department, Council No, Place Employment, Date of retirement, Number of
 * Dependents, Check Number and the rest — shown to every customer regardless of
 * who they were, because there was no way to say that a shopkeeper has no
 * council number. Adding a question meant editing this file; adding a customer
 * type meant editing it again.
 *
 * NONE OF THOSE FIELDS ARE WRITTEN HERE ANY MORE, and none of them are gone
 * either: each is a key a customer type's configuration may name, and naming
 * one binds it to the same customer column it always wrote to (see
 * structured-fields.ts). So a type that wants a check number asks for one, a
 * type that does not never shows the box, and the payroll export reads the same
 * column it always did.
 *
 * THE CARD IS TITLED BY THE CONFIGURATION, never by a code this file
 * recognises. `formTitle` falls back to the type's name — there is deliberately
 * no third fallback, because a heading invented here would be this component
 * claiming to know something about a customer type that the administrator
 * never told it.
 *
 * GUARANTORS AND NEXT OF KIN appear only when the account type demands them,
 * which no account type reachable from this form does today. They are kept
 * because the requirement profile can still ask for them and a form that
 * silently could not satisfy its own rules would be worse than one with a
 * section nobody sees.
 */
export function AdditionalDetailsStep({
  categories,
  lookups,
  profile,
}: {
  /** The customer types an administrator has configured and left active. */
  categories: CustomerCategory[];
  /** Every admin-managed list, for the configured selects to draw on. */
  lookups: Lookups;
  profile: AccountTypeRequirementProfile;
}) {
  const {
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const categoryId = watch("customerCategoryId");
  const category = categories.find((c) => c.id === categoryId);
  const fields = category?.dynamicFormSchema ?? [];

  /**
   * Everything the previous customer type asked, forgotten.
   *
   * §23: changing the type rebuilds this step, and an answer left behind from
   * the old form would be submitted against a field the new type never asks —
   * a sector belonging to a customer whose new type has no sector, or worse, a
   * value that quietly satisfies a rule nobody meant to satisfy. Both the JSON
   * answers and the structured ones are cleared, because the officer cannot see
   * which is which and the distinction is not theirs to manage.
   */
  function chooseCategory(nextId: string | null) {
    const previous = categories.find((c) => c.id === categoryId);

    for (const field of previous?.dynamicFormSchema ?? []) {
      const name = structuredNameFor(field);
      if (name !== null) setValue(name, null as never, { shouldValidate: false });
    }

    setValue("dynamicFormData", {}, { shouldValidate: false });
    setValue("customerCategoryId", nextId ?? "", { shouldValidate: true });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Additional Details</h2>
        <p className="text-sm text-muted-foreground">
          The customer type decides what else is asked. Choose it first.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="customerCategoryId">
            Customer Type
            {profile.requiresCustomerCategory && <span className="ml-0.5 text-destructive">*</span>}
          </Label>
          <Combobox
            id="customerCategoryId"
            value={categoryId || null}
            onChange={chooseCategory}
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
              hint: c.requiresExtraApproval ? "Needs extra approval" : undefined,
            }))}
            placeholder="Select Customer Type"
            /* The officer cannot fix this themselves — creating a customer type
               is the Super Administrator's — so the message names who to ask
               rather than a screen they cannot open. */
            emptyMessage="No customer types are configured. Please contact the Super Administrator."
            invalid={!!errors.customerCategoryId}
          />
          {errors.customerCategoryId?.message && (
            <p className="text-xs text-destructive">{errors.customerCategoryId.message}</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------- the type's own questions */}
      {category ? (
        <section className="rounded-xl border bg-muted/30">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold tracking-wide uppercase">
              {category.formTitle?.trim() || category.name}
            </h3>
          </header>

          <div className="p-4">
            {fields.length > 0 ? (
              <DynamicFields fields={fields} lookups={lookups} />
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  No additional details have been configured for this customer type yet. A Super
                  Administrator sets them under Administration → Customer Types → Registration form.
                </span>
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className="flex items-start gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Choose a customer type above to see the additional details it asks for.
            {!profile.requiresCustomerCategory &&
              " You can also continue without one and classify this customer later from their profile."}
          </span>
        </p>
      )}

      {/* --------------------------------- only when the account type asks --- */}
      {profile.minGuarantors > 0 && (
        <Section
          title={`Guarantors (at least ${profile.minGuarantors})`}
          error={typeof errors.guarantors?.message === "string" ? errors.guarantors.message : undefined}
        >
          <GuarantorsStep />
        </Section>
      )}

      {profile.minNextOfKin > 0 && (
        <Section
          title={`Next of kin (at least ${profile.minNextOfKin})`}
          error={typeof errors.nextOfKin?.message === "string" ? errors.nextOfKin.message : undefined}
        >
          <NextOfKinStep />
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {children}
    </section>
  );
}
