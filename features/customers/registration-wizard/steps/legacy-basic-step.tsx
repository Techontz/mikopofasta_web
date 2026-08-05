"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { GENDERS } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { Branch } from "@/types/branch";
import {
  loadDistricts,
  loadRegions,
  loadStreets,
  loadWards,
} from "@/features/customers/geography-actions";

/**
 * Step 1 — Basic Information, in the legacy form's exact order.
 *
 * The layout is the old screen's, row for row:
 *
 *   First Name        | Middle name       | Last name
 *   Branch            | Employee          | Gender
 *   Date of Birth | Year | Phone Number | Loan Type | Types of customer
 *   Region            | District          | Ward        | Street
 *
 * Field order, grouping and the single `next →` are fixed by the screenshots.
 * What is modern is underneath: every dropdown reads the database rather than a
 * constant, and the four address levels cascade instead of being free text.
 *
 * "Year" is the legacy form's read-only age box — it shows 0 until a date of
 * birth is entered and is derived, never typed. It is reproduced because the
 * officers reading this screen expect it, and computing it from `dob` is the
 * only honest way to fill it.
 */
export function LegacyBasicStep({
  branches,
  branchLocked,
  employees,
  loanTypes,
  customerTypes,
}: {
  branches: Branch[];
  branchLocked: boolean;
  employees: { id: string; name: string }[];
  loanTypes: MasterDataOption[];
  customerTypes: MasterDataOption[];
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const dob = watch("dob");
  const regionId = watch("regionId");
  const districtId = watch("districtId");
  const wardId = watch("wardId");

  /** The legacy "Year" box: age in whole years, or 0 before a date is set. */
  const age = React.useMemo(() => {
    if (!dob) return 0;
    const born = new Date(`${dob}T00:00:00`);
    if (Number.isNaN(born.getTime())) return 0;
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    const monthDelta = now.getMonth() - born.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) years -= 1;
    return Math.max(0, years);
  }, [dob]);

  const districtLoader = React.useCallback(() => loadDistricts(regionId ?? ""), [regionId]);
  const wardLoader = React.useCallback(() => loadWards(districtId ?? ""), [districtId]);
  const streetLoader = React.useCallback(() => loadStreets(wardId ?? ""), [wardId]);
  const regionLoader = React.useCallback(() => loadRegions(), []);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Basic Information</h2>

      {/* Row 1 — names */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First Name" required error={errors.firstName?.message}>
          <Input id="firstName" placeholder="First name" {...register("firstName")} />
        </Field>
        <Field label="Middle name" error={errors.middleName?.message}>
          <Input id="middleName" placeholder="Middle name" {...register("middleName")} />
        </Field>
        <Field label="Last name" required error={errors.lastName?.message}>
          <Input id="lastName" placeholder="Last name" {...register("lastName")} />
        </Field>
      </div>

      {/* Row 2 — Branch | Employee | Gender */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Branch" required error={errors.branchId?.message}>
          <Combobox
            id="branchId"
            value={watch("branchId") || null}
            onChange={(v) => v && setValue("branchId", v, { shouldValidate: true })}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            disabled={branchLocked}
            disabledMessage="Fixed to your branch"
            placeholder="Select Branch"
            emptyMessage="No branches are configured."
            invalid={!!errors.branchId}
          />
        </Field>
        <Field label="Employee" error={errors.employeeId?.message}>
          <Combobox
            id="employeeId"
            value={watch("employeeId") || null}
            onChange={(v) => setValue("employeeId", v ?? "")}
            options={employees.map((e) => ({ value: e.id, label: e.name }))}
            placeholder="Select Employee"
            emptyMessage="No staff are registered."
          />
        </Field>
        <Field label="Gender" required error={errors.gender?.message}>
          <Combobox
            id="gender"
            value={watch("gender") || null}
            onChange={(v) => v && setValue("gender", v as WizardValues["gender"], { shouldValidate: true })}
            options={GENDERS.map((g) => ({ value: g, label: g }))}
            placeholder="Select Gender"
            invalid={!!errors.gender}
          />
        </Field>
      </div>

      {/* Row 3 — DOB | Year | Phone | Loan Type | Types of customer */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Date of Birth" required error={errors.dob?.message}>
          <Input id="dob" type="date" {...register("dob")} />
        </Field>
        <Field label="Year">
          {/* Derived from the date of birth, exactly as the legacy box is. */}
          <Input id="ageYears" value={age} readOnly tabIndex={-1} className="bg-muted" />
        </Field>
        <Field label="Phone Number" required error={errors.phone?.message}>
          <Input id="phone" placeholder="0754000000" {...register("phone")} />
        </Field>
        <Field label="Loan Type" error={errors.loanTypeId?.message}>
          <Combobox
            id="loanTypeId"
            value={watch("loanTypeId") || null}
            onChange={(v) => setValue("loanTypeId", v ?? "")}
            options={asOptions(loanTypes)}
            placeholder="Select loan type"
            emptyMessage="No loan types are configured."
          />
        </Field>
        <Field label="Types of customer" error={errors.customerTypeId?.message}>
          <Combobox
            id="customerTypeId"
            value={watch("customerTypeId") || null}
            onChange={(v) => setValue("customerTypeId", v ?? "")}
            options={asOptions(customerTypes)}
            placeholder="Select"
            emptyMessage="No customer types are configured."
          />
        </Field>
      </div>

      {/* Row 4 — Region | District | Ward | Street (cascading) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Region" error={errors.regionId?.message}>
          <Combobox
            id="addr-region"
            value={regionId ?? null}
            loadOptions={regionLoader}
            loadKey="regions"
            placeholder="Select region"
            emptyMessage="No regions are configured."
            invalid={!!errors.regionId}
            onChange={(v) => {
              setValue("regionId", v, { shouldValidate: true });
              // Everything below now belongs to a different place.
              setValue("districtId", null);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
          />
        </Field>
        <Field label="District">
          <Combobox
            id="addr-district"
            value={districtId ?? null}
            loadOptions={districtLoader}
            loadKey={regionId ?? null}
            disabled={!regionId}
            disabledMessage="Select a region first"
            placeholder="district"
            emptyMessage="No districts in this region."
            onChange={(v) => {
              setValue("districtId", v);
              setValue("wardId", null);
              setValue("streetId", null);
            }}
          />
        </Field>
        <Field label="Ward">
          <Combobox
            id="addr-ward"
            value={wardId ?? null}
            loadOptions={wardLoader}
            loadKey={districtId ?? null}
            disabled={!districtId}
            disabledMessage="Select a district first"
            placeholder="Ward"
            emptyMessage="No wards in this district."
            onChange={(v) => {
              setValue("wardId", v);
              setValue("streetId", null);
            }}
          />
        </Field>
        <Field label="Street">
          <Combobox
            id="addr-street"
            value={watch("streetId") ?? null}
            loadOptions={streetLoader}
            loadKey={wardId ?? null}
            disabled={!wardId}
            disabledMessage="Select a ward first"
            placeholder="street"
            emptyMessage="No streets in this ward."
            onChange={(v) => setValue("streetId", v)}
          />
        </Field>
      </div>
    </div>
  );
}

/** Label above control, error below — the shape every row on this form uses. */
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
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
