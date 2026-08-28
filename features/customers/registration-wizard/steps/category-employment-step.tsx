"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Briefcase, Building2, CalendarClock, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { loadSectorCategories } from "@/features/customers/geography-actions";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { CustomerCategory } from "@/types/customer";

/**
 * The employment blocks a customer's CATEGORY asks for.
 *
 * WHY THESE ARE NOT DYNAMIC FORM FIELDS. Sector, cadre, contract and salary
 * are real, typed, foreign-keyed columns on the customer — they are searched,
 * reported on, and read by the eligibility engine. `dynamic_form_data` is a
 * JSON blob for the questions peculiar to one category. Putting these there
 * too would store the same fact in two shapes and leave two screens
 * disagreeing about which is authoritative.
 *
 * WHAT DECIDES WHETHER THEY APPEAR. Three booleans on the category —
 * `requiresSector`, `requiresContract`, `requiresSalary` — set by an
 * administrator. Nothing here tests a category CODE. A public servant is
 * shown all three because the row says so, not because this file knows what
 * "PUBLIC_SERVANT" means; a new category configured tomorrow gets the same
 * treatment without a deployment.
 *
 * THE CADRE CASCADES OFF THE SECTOR, the same way district cascades off
 * region: the list loads only once a sector is chosen, and choosing a
 * different sector clears it — a cadre that belonged to the old sector would
 * be refused by the API anyway, and silently keeping it would make the
 * rejection look arbitrary.
 *
 * TEMPORARY IMPLIES AN EXPIRY DATE, PERMANENT FORBIDS ONE. Both halves are
 * enforced by the API; this mirrors them so the officer learns it while
 * typing rather than on submit. The check is on the contract type's CODE,
 * because an administrator may rename or translate the name.
 */
export function CategoryEmploymentStep({
  category,
  sectors,
  employers,
  contractTypes,
}: {
  category: CustomerCategory;
  sectors: MasterDataOption[];
  /** Private companies — a separate list from `sectors`, never merged. */
  employers: MasterDataOption[];
  contractTypes: MasterDataOption[];
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const sectorId = watch("sectorId");
  const contractTypeId = watch("contractTypeId");

  const cadreLoader = React.useCallback(() => loadSectorCategories(sectorId ?? ""), [sectorId]);

  /* Matched on code, never on name or id: ids differ between environments and
     the name is an administrator's to translate. */
  const isTemporary =
    contractTypes.find((c) => c.id === contractTypeId)?.code.toUpperCase() === "TEMPORARY";

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  if (
    !category.requiresSector &&
    !category.requiresEmployer &&
    !category.requiresContract &&
    !category.requiresSalary
  ) {
    return null;
  }

  return (
    <div className="space-y-5">
      {category.requiresSector && (
        <Block icon={Briefcase} title="Sector" note={`Required for a ${category.name} customer.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sector" required error={errors.sectorId?.message}>
              <Combobox
                id="sectorId"
                value={sectorId ?? null}
                onChange={(v) => {
                  setValue("sectorId", v ?? "", { shouldValidate: true });
                  // The cadre below belongs to a different sector now.
                  setValue("sectorCategoryId", null);
                }}
                options={asOptions(sectors)}
                placeholder="Select sector"
                emptyMessage="No sectors are configured. Add them under Administration → Master Data."
                invalid={!!errors.sectorId}
              />
            </Field>

            <Field label="Sector Category" required error={errors.sectorCategoryId?.message}>
              <Combobox
                id="sectorCategoryId"
                value={watch("sectorCategoryId") ?? null}
                loadOptions={cadreLoader}
                loadKey={sectorId ?? null}
                disabled={!sectorId}
                disabledMessage="Select a sector first"
                placeholder="Select sector category"
                emptyMessage="No categories are configured for this sector."
                invalid={!!errors.sectorCategoryId}
                onChange={(v) => setValue("sectorCategoryId", v, { shouldValidate: true })}
              />
            </Field>
          </div>
        </Block>
      )}

      {/*
        A private employer, from its own list. NOT the sector list above: a
        public servant serves a ministry that has cadres inside it, and a
        private employee works for a company that does not. A category asks for
        one or the other, never both.
      */}
      {category.requiresEmployer && (
        <Block icon={Building2} title="Employer" note={`Required for a ${category.name} customer.`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employer" required error={errors.employerId?.message}>
              <Combobox
                id="employerId"
                value={watch("employerId") ?? null}
                onChange={(v) => setValue("employerId", v ?? "", { shouldValidate: true })}
                options={asOptions(employers)}
                placeholder="Select employer"
                /* Not an invitation to type one: an employer nobody configured
                   is one nothing can report on. */
                emptyMessage="No employers are configured. Add them under Administration → Master Data."
                invalid={!!errors.employerId}
              />
            </Field>
          </div>
        </Block>
      )}

      {category.requiresContract && (
        <Block icon={CalendarClock} title="Contract" note="A temporary contract needs an expiry date.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contract Type" required error={errors.contractTypeId?.message}>
              <Combobox
                id="contractTypeId"
                value={contractTypeId ?? null}
                onChange={(v) => {
                  setValue("contractTypeId", v ?? "", { shouldValidate: true });
                  /* A permanent contract with an end date is a contradiction
                     the API refuses; clear it rather than submit it. */
                  const stillTemporary =
                    contractTypes.find((c) => c.id === v)?.code.toUpperCase() === "TEMPORARY";
                  if (!stillTemporary) setValue("contractExpiryDate", null);
                }}
                options={asOptions(contractTypes)}
                placeholder="Select contract type"
                emptyMessage="No contract types are configured. Add them under Administration → Master Data."
                invalid={!!errors.contractTypeId}
              />
            </Field>

            {/* Only for a fixed term. Hidden rather than disabled: a greyed box
                for something that can never apply is just noise. */}
            {isTemporary && (
              <Field label="Contract Expiry" required error={errors.contractExpiryDate?.message}>
                <Input id="contractExpiryDate" type="date" {...register("contractExpiryDate")} />
              </Field>
            )}
          </div>
        </Block>
      )}

      {category.requiresSalary && (
        <Block icon={Wallet} title="Salary" note="Take-home is what the affordability check reads.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Basic Salary (TZS)" error={errors.basicSalary?.message}>
              <Input
                id="basicSalary"
                type="number"
                inputMode="numeric"
                {...register("basicSalary", { setValueAs: toNullableNumber })}
              />
            </Field>
            <Field label="Take-home Salary (TZS)" required error={errors.takeHome?.message}>
              <Input
                id="takeHome"
                type="number"
                inputMode="numeric"
                {...register("takeHome", { setValueAs: toNullableNumber })}
              />
            </Field>
          </div>
        </Block>
      )}
    </div>
  );
}

/** An empty box means "not given", not zero. */
function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Block({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </h3>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
