"use client";

import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { RESIDENCE_TYPES } from "@/types/enums";
import { CategoryDataStep } from "@/features/customers/registration-wizard/steps/category-data-step";
import { GuarantorsStep } from "@/features/customers/registration-wizard/steps/guarantors-step";
import { NextOfKinStep } from "@/features/customers/registration-wizard/steps/next-of-kin-step";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { CustomerCategory } from "@/types/customer";

/**
 * Step 2 — Additional Details, in the legacy form's order, plus the blocks
 * that had nowhere to live in the three-step version.
 *
 *   Nick name      | Martial Status  | Work Type      | Type of employment
 *   Department     | Council No      | Name of employer
 *   Place Employment | Date of retirement | Number of Dependents
 *   Basic Salary   | Take home       | Check Number
 *   Contact  ·  Residence  ·  Business (when the account type asks)
 *   Customer category and its questions
 *   Guarantors  ·  Next of kin
 *
 * The heading keeps the original's spelling — "Martial Status" — because that
 * is what the screen being replaced says and the officers using it recognise.
 *
 * WORK TYPE AND TYPE OF EMPLOYMENT ARE NOW TYPED. They were dropdowns over
 * admin-managed lists of three entries each, and no list of three covers what
 * people do: "Fundi wa pikipiki", "Mama lishe", "Government employee on
 * contract" are all real answers that a fixed list forces somebody to
 * mis-record. Both columns already existed as free text on the customer — the
 * `*_id` references stay for records captured before this and are still read
 * on the profile.
 *
 * GUARANTORS AND NEXT OF KIN ARE COLLECTED HERE. Their step components existed
 * and were rendered by nothing — the three-step wizard validated
 * `guarantors` and `nextOfKin` before advancing and never showed a field for
 * either. Since the loan engine refuses any application without a guarantor,
 * every customer registered through that form was permanently unable to
 * borrow, which is a large part of what this work is fixing.
 *
 * WHAT IS REQUIRED HERE COMES FROM THE ACCOUNT TYPE. Business details appear
 * only when the profile asks for them; the guarantor minimum is the profile's
 * number, not a constant. See `wizard-schema.ts`.
 */
export function AdditionalDetailsStep({
  maritalStatuses,
  occupations,
  categories,
  profile,
}: {
  maritalStatuses: MasterDataOption[];
  occupations: MasterDataOption[];
  categories: CustomerCategory[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const categoryId = watch("customerCategoryId");
  const category = categories.find((c) => c.id === categoryId);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Aditinal Detail</h2>

      {/* Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nick name" error={errors.nickname?.message}>
          <Input id="nickname" {...register("nickname")} />
        </Field>
        <Field
          label="Martial Status"
          required={profile.requiresMaritalStatus}
          error={errors.maritalStatusId?.message}
        >
          <Combobox
            id="maritalStatusId"
            value={watch("maritalStatusId") || null}
            onChange={(v) => setValue("maritalStatusId", v ?? "", { shouldValidate: true })}
            options={asOptions(maritalStatuses)}
            placeholder="Select"
            emptyMessage="No marital statuses are configured."
            invalid={!!errors.maritalStatusId}
          />
        </Field>
        <Field
          label="Work Type"
          required={profile.requiresEmploymentDetails}
          error={errors.workType?.message}
          help="Type whatever the customer does — Business, Farmer, Driver, Teacher…"
        >
          <Input id="workType" placeholder="e.g. Farmer" {...register("workType")} />
        </Field>
        <Field
          label="Type of employment"
          error={errors.employmentType?.message}
          help="Permanent, Contract, Casual, Self-employed, Government employee…"
        >
          <Input
            id="employmentType"
            placeholder="e.g. Permanent"
            {...register("employmentType")}
          />
        </Field>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Department" error={errors.department?.message}>
          <Input id="department" {...register("department")} />
        </Field>
        <Field label="Council No" error={errors.councilNumber?.message}>
          <Input id="councilNumber" {...register("councilNumber")} />
        </Field>
        <Field
          label="Name of employer"
          required={profile.requiresEmploymentDetails}
          error={errors.employer?.message}
        >
          <Input id="employer" placeholder="Or 'Self'" {...register("employer")} />
        </Field>
        <Field label="Occupation" error={errors.occupationId?.message}>
          <Combobox
            id="occupationId"
            value={watch("occupationId") || null}
            onChange={(v) => setValue("occupationId", v ?? "")}
            options={asOptions(occupations)}
            placeholder="Select"
            emptyMessage="No occupations are configured."
          />
        </Field>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Place Employment" error={errors.placeOfEmployment?.message}>
          <Input id="placeOfEmployment" {...register("placeOfEmployment")} />
        </Field>
        <Field label="Date of retirement" error={errors.retirementDate?.message}>
          <Input id="retirementDate" type="date" {...register("retirementDate")} />
        </Field>
        <Field label="Number of Dependents" error={errors.dependentsCount?.message}>
          <NumberInput name="dependentsCount" min={0} />
        </Field>
      </div>

      {/* Row 4 — the two salary figures are deliberately separate: affordability
          is assessed on take-home, statutory deductions on basic salary. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Basic Salary" error={errors.basicSalary?.message}>
          <NumberInput name="basicSalary" min={0} />
        </Field>
        <Field
          label="Take home"
          required={profile.requiresEmploymentDetails}
          error={errors.takeHome?.message}
        >
          <NumberInput name="takeHome" min={0} />
        </Field>
        <Field label="Monthly Income (TZS)" error={errors.monthlyIncome?.message}>
          <NumberInput name="monthlyIncome" min={0} />
        </Field>
        <Field label="Check Number" error={errors.checkNumber?.message}>
          <Input id="checkNumber" {...register("checkNumber")} />
        </Field>
      </div>

      {/* ------------------------------------------------------------ contact */}
      <Section title="Contact & residence">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Alternative Phone" error={errors.alternativePhone?.message}>
            <Input id="alternativePhone" placeholder="0754000000" {...register("alternativePhone")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input id="email" type="email" placeholder="name@example.co.tz" {...register("email")} />
          </Field>
          <Field label="Nationality" error={errors.nationality?.message}>
            <Input id="nationality" placeholder="Tanzanian" {...register("nationality")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Residence Type">
            <Combobox
              id="residenceType"
              value={watch("residenceType") ?? null}
              onChange={(v) => setValue("residenceType", (v as WizardValues["residenceType"]) ?? null)}
              options={RESIDENCE_TYPES.map((r) => ({ value: r, label: r }))}
              placeholder="Select"
            />
          </Field>
          <Field label="Village" error={errors.village?.message}>
            <Input id="village" {...register("village")} />
          </Field>
          <Field label="House Number" error={errors.houseNumber?.message}>
            <Input id="houseNumber" placeholder="e.g. H-42" {...register("houseNumber")} />
          </Field>
          <Field label="Postal Code" error={errors.postalCode?.message}>
            <Input id="postalCode" {...register("postalCode")} />
          </Field>
          <Field label="Landmark" error={errors.landmark?.message}>
            <Input id="landmark" placeholder="What to look for nearby" {...register("landmark")} />
          </Field>
        </div>
      </Section>

      {/* ----------------------------------------------------------- business */}
      {/*
        Shown when the account type asks for it, and also whenever the officer
        has already put something in it — a savings customer who happens to run
        a shop should not have that quietly hidden and dropped because they
        changed account type afterwards.
      */}
      {(profile.requiresBusinessDetails ||
        watch("businessName") ||
        watch("businessType") ||
        watch("businessAddress")) && (
        <Section title="Business information">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Business Name"
              required={profile.requiresBusinessDetails}
              error={errors.businessName?.message}
            >
              <Input id="businessName" {...register("businessName")} />
            </Field>
            <Field
              label="Business Type"
              required={profile.requiresBusinessDetails}
              error={errors.businessType?.message}
            >
              <Input id="businessType" placeholder="e.g. Retail" {...register("businessType")} />
            </Field>
            <Field label="Business Address" error={errors.businessAddress?.message}>
              <Input id="businessAddress" {...register("businessAddress")} />
            </Field>
          </div>
        </Section>
      )}

      {/* ----------------------------------------------------------- category */}
      <Section
        title="Customer category"
        note={
          profile.requiresCustomerCategory
            ? "Required for this account type — the category decides which loan products this customer may take."
            : "Optional. It can also be assigned later from the customer's profile."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Category"
            required={profile.requiresCustomerCategory}
            error={errors.customerCategoryId?.message}
          >
            <Combobox
              id="customerCategoryId"
              value={categoryId || null}
              onChange={(v) => {
                setValue("customerCategoryId", v ?? "", { shouldValidate: true });
                /* A different category asks different questions; keeping the
                   old answers would submit values against fields that no
                   longer exist. */
                setValue("dynamicFormData", {});
              }}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
                hint: c.requiresExtraApproval ? "Needs extra approval" : undefined,
              }))}
              placeholder="Select category"
              emptyMessage="No categories are configured."
              invalid={!!errors.customerCategoryId}
            />
          </Field>
        </div>

        {category && (
          <div className="pt-2">
            <CategoryDataStep category={category} />
          </div>
        )}
      </Section>

      {/* --------------------------------------------------------- guarantors */}
      <Section
        title={
          profile.minGuarantors > 0
            ? `Guarantors (at least ${profile.minGuarantors})`
            : "Guarantors"
        }
        note={
          profile.minGuarantors > 0
            ? "Required for this account type. A loan cannot be submitted without one."
            : undefined
        }
        error={typeof errors.guarantors?.message === "string" ? errors.guarantors.message : undefined}
      >
        <GuarantorsStep />
      </Section>

      {/* -------------------------------------------------------- next of kin */}
      <Section
        title={
          profile.minNextOfKin > 0 ? `Next of kin (at least ${profile.minNextOfKin})` : "Next of kin"
        }
        error={typeof errors.nextOfKin?.message === "string" ? errors.nextOfKin.message : undefined}
      >
        <NextOfKinStep />
      </Section>
    </div>
  );
}

/* ----------------------------------------------------------------- parts */

function Section({
  title,
  note,
  error,
  children,
}: {
  title: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {note}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * A number box that yields null when empty rather than NaN.
 *
 * `valueAsNumber` on an empty input produces NaN, which zod rejects with
 * "expected number, received nan" — an error the officer cannot act on for a
 * field they deliberately left blank.
 */
function NumberInput({ name, min }: { name: keyof WizardValues; min?: number }) {
  const { register } = useFormContext<WizardValues>();

  return (
    <Input
      id={String(name)}
      type="number"
      min={min}
      {...register(name, {
        setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
      })}
    />
  );
}

function Field({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {help && !error && <p className="text-[11px] text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
