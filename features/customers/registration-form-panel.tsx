"use client";

import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { SettingsCard } from "@/components/settings";
import { ActionButtons, Button, DateInput, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import { cn } from "@/lib/utils";
import { LEGACY_BRANCHES } from "@/lib/legacy/source";
import { InferredLookups } from "@/lib/legacy/inferred";

/**
 * Customer → Register Customer, as the legacy form is shaped.
 *
 * DESIGN ONLY — nothing here submits. The wired seven-step wizard that used to
 * hold this route is at /customers/new/register, unchanged and still the thing
 * that actually creates a customer.
 *
 * Three steps, because the old form has three. Only the first was ever
 * captured, so the other two say so rather than inventing fields for them.
 *
 * Two facts about the old form are recorded here because both contradict the
 * written brief:
 *
 *   - District, Ward and Street are free-text. Only Region is a select. There
 *     is no legacy district or ward lookup to copy — our four-level geography
 *     cascade is an addition of ours, not a reproduction.
 *   - Every select but Branch is populated from InferredLookups, not from
 *     transcription: the form was captured with all of them closed.
 */

/** The old tabs read "Aditinal Detail"; corrected, as every label we author is. */
const STEPS = [
  { key: "basic", label: "Basic Information" },
  { key: "additional", label: "Additional Detail" },
  { key: "bank", label: "Passport & Bank Detail" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function RegistrationFormPanel() {
  const [step, setStep] = React.useState<StepKey>("basic");
  const [dob, setDob] = React.useState("");

  /*
   * The old form's readonly "Year" box, filled from the date beside it.
   *
   * Read as age in whole years — the loan lists print an Age column and this is
   * the only field that could feed it. The capture shows the box empty with a
   * date already in the picker, so the reading is not confirmed; if it turns
   * out to mean year of birth, this is the one line that changes.
   */
  const year = React.useMemo(() => ageFrom(dob), [dob]);

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      <Stepper current={currentIndex} onSelect={(i) => setStep(STEPS[i].key)} />

      {step === "basic" ? (
        <SettingsCard
          title="Basic Information"
          description="Who the customer is, which branch and officer they belong to, and where they live."
        >
          <form className="space-y-[18px]" onSubmit={(e) => e.preventDefault()}>
            <FieldGrid columns={3}>
              <Field label="First name" htmlFor="reg-first">
                <TextInput id="reg-first" placeholder="First name" />
              </Field>
              <Field label="Middle name" htmlFor="reg-middle">
                <TextInput id="reg-middle" placeholder="Middle name" />
              </Field>
              <Field label="Last name" htmlFor="reg-last">
                <TextInput id="reg-last" placeholder="Last name" />
              </Field>
            </FieldGrid>

            <FieldGrid columns={3}>
              <Field label="Branch" htmlFor="reg-branch">
                <Choice id="reg-branch" placeholder="Select branch" options={LEGACY_BRANCHES} />
              </Field>
              <Field label="Employee" htmlFor="reg-employee">
                <Choice
                  id="reg-employee"
                  placeholder="Select employee"
                  options={InferredLookups.employees}
                />
              </Field>
              <Field label="Gender" htmlFor="reg-gender">
                <Choice id="reg-gender" placeholder="Select gender" options={InferredLookups.genders} />
              </Field>
            </FieldGrid>

            <FieldGrid columns={3}>
              <Field label="Date of birth" htmlFor="reg-dob">
                <DateInput id="reg-dob" value={dob} onChange={(e) => setDob(e.target.value)} />
              </Field>
              <Field label="Year" htmlFor="reg-year" help="Age in whole years, from the date of birth.">
                <TextInput id="reg-year" readOnly value={year ?? ""} />
              </Field>
              <Field label="Phone number" htmlFor="reg-phone">
                <TextInput id="reg-phone" inputMode="tel" placeholder="Eg.0753(XXXX)34" />
              </Field>
              <Field label="Loan type" htmlFor="reg-loan-type">
                <Choice
                  id="reg-loan-type"
                  placeholder="Select loan type"
                  options={InferredLookups.loanTypes}
                />
              </Field>
              <Field label="Type of customer" htmlFor="reg-customer-type">
                <Choice
                  id="reg-customer-type"
                  placeholder="Select"
                  options={InferredLookups.customerTypes}
                />
              </Field>
            </FieldGrid>

            <FieldGrid columns={3}>
              <Field label="Region" htmlFor="reg-region">
                <Choice id="reg-region" placeholder="Select region" options={InferredLookups.regions} />
              </Field>
              {/* Free text, all three, exactly as the old form has them. */}
              <Field label="District" htmlFor="reg-district">
                <TextInput id="reg-district" placeholder="District" />
              </Field>
              <Field label="Ward" htmlFor="reg-ward">
                <TextInput id="reg-ward" placeholder="Ward" />
              </Field>
              <Field label="Street" htmlFor="reg-street">
                <TextInput id="reg-street" placeholder="Street" />
              </Field>
            </FieldGrid>

            <ActionButtons>
              <Button tone="primary" onClick={() => setStep("additional")}>
                Next
                <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
              </Button>
            </ActionButtons>
          </form>
        </SettingsCard>
      ) : (
        <SettingsCard title={STEPS[currentIndex].label}>
          <p className="py-10 text-center text-[13.5px] text-[var(--st-ink-soft)]">
            This step has not been captured from the legacy system, so its fields are unknown and
            nothing is drawn here. The wired registration wizard covers the same ground meanwhile.
          </p>
        </SettingsCard>
      )}
    </div>
  );
}

/**
 * The numbered stepper.
 *
 * A completed step keeps its number as a tick, so progress reads at a glance
 * rather than by comparing which pill is filled. Steps are clickable because
 * this is a design surface and nothing is validated on the way through.
 */
function Stepper({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-transparent bg-[var(--st-accent)] text-[var(--st-on-accent)]"
                  : "border-[var(--st-line-strong)] text-[var(--st-ink-soft)] hover:text-[var(--st-ink)]"
              )}
            >
              <span
                className={cn(
                  "font-tabular flex size-5 items-center justify-center rounded-full text-[11px]",
                  active
                    ? "bg-[color-mix(in_oklab,var(--st-on-accent)_25%,transparent)]"
                    : "bg-[var(--st-subtle-strong)] text-[var(--st-ink-faint)]"
                )}
              >
                {done ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : index + 1}
              </span>
              {step.label}
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="size-4 text-[var(--st-line-strong)]" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A select with its unselected placeholder, as every one on the old form has. */
function Choice({
  id,
  placeholder,
  options,
}: {
  id: string;
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <Select id={id} defaultValue="">
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}

/** Whole years elapsed. Empty until the date is complete and in the past. */
function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age < 0 ? null : age;
}
