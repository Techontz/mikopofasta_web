"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

/**
 * The KYC detail a microfinance customer record carries.
 *
 * These were the fields with nowhere to go: the API had no columns for them,
 * so rendering the inputs would have meant accepting what the officer typed and
 * dropping it on submit — a form that lies about having saved. They now have
 * real, indexed columns (see the API's 2026_08_02 migration), so they are
 * asked for.
 *
 * Split into three blocks by who answers them: contact and identity are about
 * the person, employment and business about how they earn, and only one of
 * those last two usually applies. None is required — a customer frequently has
 * no email, no TIN and no passport, and the KYC evaluator decides completeness
 * rather than the form refusing to proceed.
 */

function Text({
  name,
  label,
  placeholder,
  type = "text",
}: {
  name: keyof WizardValues;
  label: string;
  placeholder?: string;
  type?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext<WizardValues>();
  const error = errors[name];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`kyc-${name}`}>{label}</Label>
      <Input
        id={`kyc-${name}`}
        type={type}
        placeholder={placeholder}
        {...register(name, type === "number" ? { valueAsNumber: true } : undefined)}
      />
      {error && <p className="text-xs text-destructive">{String(error.message)}</p>}
    </div>
  );
}

/** Contact and identity — the Basic Information step. */
export function ContactIdentityFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Text name="alternativePhone" label="Alternative Phone" placeholder="0754000000" />
      <Text name="email" label="Email" type="email" placeholder="name@example.co.tz" />
      <Text name="nationality" label="Nationality" placeholder="Tanzanian" />
      {/* National ID lives with the identity block on this step, not here. */}
      <Text name="tinNumber" label="TIN Number" placeholder="Optional" />
      <Text name="passportNumber" label="Passport Number" placeholder="Optional" />
    </div>
  );
}

/** Below the geography cascade: what no registry enumerates. */
export function AddressDetailFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Text name="village" label="Village" />
      <Text name="houseNumber" label="House Number" placeholder="e.g. H-42" />
      <Text name="postalCode" label="Postal Code" />
      <Text name="landmark" label="Landmark" placeholder="What to look for nearby" />
    </div>
  );
}

/**
 * Employment and business — the Additional Details step.
 *
 * Both are shown rather than switched on employment type: a shopkeeper who also
 * holds a salaried job is ordinary here, and making the officer pick one first
 * hides half the form behind a question they may answer wrongly.
 */
export function EmploymentBusinessFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Text name="occupation" label="Occupation" placeholder="e.g. Tailor" />
      <Text name="employer" label="Employer" placeholder="Or 'Self'" />
      <Text name="monthlyIncome" label="Monthly Income (TZS)" type="number" placeholder="0" />
      <Text name="employmentType" label="Employment Type" placeholder="e.g. Self-employed" />
      <Text name="businessName" label="Business Name" />
      <Text name="businessType" label="Business Type" placeholder="e.g. Retail" />
      <div className="sm:col-span-2">
        <Text name="businessAddress" label="Business Address" />
      </div>
    </div>
  );
}

/** The rest of the money block — the Passport & Bank step. */
export function MobileMoneyFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Text name="bankBranch" label="Bank Branch" />
      <Text name="mobileMoneyProvider" label="Mobile Money Provider" placeholder="e.g. M-Pesa" />
      <Text name="walletNumber" label="Wallet Number" placeholder="0754000000" />
    </div>
  );
}
