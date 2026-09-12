"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { ArrowLeft, ClipboardList, Info } from "lucide-react";
import { DynamicFields } from "@/features/customers/registration-wizard/dynamic-fields";
import type { Lookups } from "@/features/customers/registration-wizard/dynamic-form";
import { GuarantorsStep } from "@/features/customers/registration-wizard/steps/guarantors-step";
import { PaymentDetailsStep } from "@/features/customers/registration-wizard/steps/payment-details-step";
import {
  registrationFieldsFor,
  renderableFields,
} from "@/features/customers/registration-wizard/customer-type-fields";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { CustomerCategory } from "@/types/customer";

/**
 * Step 2 — Customer Details. Everything the customer type chosen on step one
 * brings with it, and one payment account.
 *
 *   <the type's own card>      its configured fields, then the standard block
 *                              for what kind of customer it is
 *   Payment Account            MNO or Bank — never both
 *   Guarantors                 only where the account type asks for them
 *
 * WHAT THIS STEP ASKS IS NOT WRITTEN DOWN HERE, and cannot be. The field list
 * comes from `registrationFieldsFor`, which composes the customer type's own
 * configured form with the standard block for its sector — employment
 * questions for an employed customer, business questions for a trader. No
 * customer type, sector, cadre or contract is named in this file, and adding a
 * type, or a question to one, is a save on an administration screen.
 *
 * THE CUSTOMER TYPE IS NO LONGER ASKED HERE. It was the first control on this
 * step, which meant the step opened as an empty card with one dropdown in it
 * and the officer could not see what choosing would bring. It is asked on step
 * one with the rest of the basic details, and this step is its consequence.
 *
 * THE CARD IS TITLED BY THE CONFIGURATION, never by a code this file
 * recognises. `formTitle` falls back to the type's name — there is deliberately
 * no third fallback, because a heading invented here would be this component
 * claiming to know something about a customer type the administrator never
 * told it.
 *
 * NEXT OF KIN MOVED TO STEP ONE. It is an emergency contact, and it used to be
 * here behind a requirement flag — invisible unless the account type demanded
 * one, so an officer would register a customer and discover afterwards that
 * next of kin was collected somewhere else entirely.
 *
 * GUARANTORS STAY. They are a lending concept rather than a KYC one: somebody
 * vouching for a repayment. They appear only where the account type asks for
 * them, which no account type reachable from this form does today, and they are
 * kept because the requirement profile can still ask and a form that silently
 * could not satisfy its own rules would be worse than one with a section nobody
 * sees.
 */
export function CustomerDetailsStep({
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
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const categoryId = watch("customerCategoryId");
  const category = categories.find((c) => c.id === categoryId);

  /* The same composition the wizard validates against — one function, so the
     form and the validator cannot disagree about which questions were asked. */
  const fields = React.useMemo(
    () => renderableFields(registrationFieldsFor(category, profile)),
    [category, profile]
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Customer Details</h2>
        <p className="text-sm text-muted-foreground">
          {category
            ? `What a ${category.name} customer is asked for, and where their money goes.`
            : "What is asked here depends on the customer type."}
        </p>
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
              /* Reachable only for a customer type whose configured form asks
                 nothing except what step one and the payment block already
                 collect — unusual, but not an error, and not worth an alarming
                 message. */
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  A {category.name} customer is asked nothing beyond their basic details and a
                  payment account. A Super Administrator can add questions under Administration →
                  Customer Types → Registration form.
                </span>
              </p>
            )}
          </div>
        </section>
      ) : (
        <p className="flex items-start gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <ArrowLeft className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            No customer type has been chosen. Go back to Basic Information and choose one — it
            decides what is asked here.
            {!profile.requiresCustomerCategory &&
              " You can also continue without one and classify this customer later from their profile."}
          </span>
        </p>
      )}

      {/* ------------------------------------------------ where the money goes */}
      <PaymentDetailsStep
        banks={lookups.banks}
        providers={lookups["mobile-money-providers"]}
        profile={profile}
      />

      {/* --------------------------------- only when the account type asks --- */}
      {profile.minGuarantors > 0 && (
        <section className="space-y-3 rounded-xl border p-4" data-field="guarantors">
          <h3 className="text-sm font-semibold">Guarantors (at least {profile.minGuarantors})</h3>
          {typeof errors.guarantors?.message === "string" && (
            <p className="text-xs text-destructive">{errors.guarantors.message}</p>
          )}
          <GuarantorsStep />
        </section>
      )}
    </div>
  );
}
