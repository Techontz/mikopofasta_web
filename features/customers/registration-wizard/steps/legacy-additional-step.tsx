"use client";

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";

/**
 * Step 2 — Aditinal Detail, in the legacy form's exact order.
 *
 *   Nick name      | Martial Status  | Account Type   | Work Type
 *   Type of employment | Department  | Council No     | Name of employer
 *   Place Employment   | Date of retirement | Number of Dependents
 *   Basic Salary       | Take home   | Check Number
 *
 * The heading keeps the original's spelling — "Aditinal Detail", "Martial
 * Status" — because that is what the screen being replaced says and the
 * officers using it recognise. Correcting the label would be a change nobody
 * asked for on a screen whose whole point is familiarity.
 *
 * Every dropdown reads the database. Marital status, account type, work type
 * and employment type are admin-managed lists, so the institution adds to them
 * without a deploy.
 *
 * Basic Salary and Take home are separate figures on purpose: affordability is
 * assessed on take-home, while a statutory deduction is computed against basic
 * salary. Collapsing them into one "income" field would lose that.
 */
export function LegacyAdditionalStep({
  maritalStatuses,
  accountTypes,
  workTypes,
  employmentTypes,
}: {
  maritalStatuses: MasterDataOption[];
  accountTypes: MasterDataOption[];
  workTypes: MasterDataOption[];
  employmentTypes: MasterDataOption[];
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Aditinal Detail</h2>

      {/* Row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nick name" error={errors.nickname?.message}>
          <Input id="nickname" {...register("nickname")} />
        </Field>
        <Field label="Martial Status" error={errors.maritalStatusId?.message}>
          <Combobox
            id="maritalStatusId"
            value={watch("maritalStatusId") || null}
            onChange={(v) => setValue("maritalStatusId", v ?? "")}
            options={asOptions(maritalStatuses)}
            placeholder="Select"
            emptyMessage="No marital statuses are configured."
          />
        </Field>
        <Field label="Account Type" error={errors.accountTypeId?.message}>
          <Combobox
            id="accountTypeId"
            value={watch("accountTypeId") || null}
            onChange={(v) => setValue("accountTypeId", v ?? "")}
            options={asOptions(accountTypes)}
            placeholder="Select"
            emptyMessage="No account types are configured."
          />
        </Field>
        <Field label="Work Type" error={errors.workTypeId?.message}>
          <Combobox
            id="workTypeId"
            value={watch("workTypeId") || null}
            onChange={(v) => setValue("workTypeId", v ?? "")}
            options={asOptions(workTypes)}
            placeholder="Select"
            emptyMessage="No work types are configured."
          />
        </Field>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Type of employment" error={errors.employmentTypeId?.message}>
          <Combobox
            id="employmentTypeId"
            value={watch("employmentTypeId") || null}
            onChange={(v) => setValue("employmentTypeId", v ?? "")}
            options={asOptions(employmentTypes)}
            placeholder="Select"
            emptyMessage="No employment types are configured."
          />
        </Field>
        <Field label="Department" error={errors.department?.message}>
          <Input id="department" {...register("department")} />
        </Field>
        <Field label="Council No" error={errors.councilNumber?.message}>
          <Input id="councilNumber" {...register("councilNumber")} />
        </Field>
        <Field label="Name of employer" error={errors.employer?.message}>
          <Input id="employer" {...register("employer")} />
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
          <Input
            id="dependentsCount"
            type="number"
            min="0"
            {...register("dependentsCount", { valueAsNumber: true })}
          />
        </Field>
      </div>

      {/* Row 4 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Basic Salary" error={errors.basicSalary?.message}>
          <Input
            id="basicSalary"
            type="number"
            min="0"
            {...register("basicSalary", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Take home" error={errors.takeHome?.message}>
          <Input
            id="takeHome"
            type="number"
            min="0"
            {...register("takeHome", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Check Number" error={errors.checkNumber?.message}>
          <Input id="checkNumber" {...register("checkNumber")} />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}:</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
