"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { GENDERS } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { Branch } from "@/types/branch";
import { loadDistricts, loadRegions } from "@/features/customers/geography-actions";

/**
 * Step 1 — Basic Information.
 *
 * The legacy screen's layout, row for row, because the officers reading it
 * recognise it:
 *
 *   First Name        | Middle name       | Last name
 *   Branch            | Employee          | Gender
 *   Date of Birth | Year | Phone Number | Loan Type | Types of customer
 *   Account Type
 *   Region            | District          | Ward        | Street
 *
 * Three things underneath it changed.
 *
 * EMPLOYEE IS NO LONGER A LIST OF EVERYONE. It was a dropdown of every member
 * of staff, defaulting to nobody — so the field that records whose book the
 * customer sits on was routinely left blank, and the officer sitting with the
 * customer had to find their own name among all of them. It now shows the
 * signed-in user and is read-only. A supervisor holding
 * `customers.assign_officer` gets the dropdown back, because assigning a
 * customer to another officer moves the portfolio and the commission with them
 * and is a supervisory act.
 *
 * WARD AND STREET ARE TYPED. They were the bottom two levels of a cascade over
 * reference tables that do not cover the country. With no ward row there was no
 * street list, and the officer's only options were to pick a neighbouring ward
 * — a wrong address recorded as if verified — or abandon the registration.
 * Region and district stay dropdowns: those lists are complete, and picking
 * from them is what keeps an address searchable.
 *
 * ACCOUNT TYPE IS HERE, NOT ON STEP 2. It decides what the rest of the wizard
 * asks for, so it has to be answered before the officer reaches the steps it
 * governs. See `wizard-schema.ts`.
 *
 * "Year" is the legacy form's read-only age box — it shows 0 until a date of
 * birth is entered and is derived, never typed.
 */
export function BasicInformationStep({
  branches,
  branchLocked,
  currentUser,
  employees,
  canAssignOfficer,
  loanTypes,
  customerTypes,
  accountTypes,
  profile,
}: {
  branches: Branch[];
  branchLocked: boolean;
  currentUser: { id: string; name: string };
  employees: { id: string; name: string }[];
  canAssignOfficer: boolean;
  loanTypes: MasterDataOption[];
  customerTypes: MasterDataOption[];
  accountTypes: MasterDataOption[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const dob = watch("dob");
  const regionId = watch("regionId");
  const employeeId = watch("employeeId");

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

  const regionLoader = React.useCallback(() => loadRegions(), []);
  const districtLoader = React.useCallback(() => loadDistricts(regionId ?? ""), [regionId]);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  /* Whoever the record is currently assigned to, named. Falls back to the
     signed-in user, which is what the form is initialised with. */
  const assignedName =
    employees.find((e) => e.id === employeeId)?.name ??
    (employeeId === currentUser.id ? currentUser.name : currentUser.name);

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

        <Field
          label="Employee"
          error={errors.employeeId?.message}
          help={
            canAssignOfficer
              ? "Defaults to you. Change it only to register on another officer's behalf."
              : undefined
          }
        >
          {canAssignOfficer ? (
            <Combobox
              id="employeeId"
              value={employeeId || null}
              onChange={(v) => setValue("employeeId", v ?? currentUser.id)}
              options={
                /* The signed-in user is guaranteed to be offered even if the
                   staff list failed to load — otherwise a supervisor could be
                   left unable to select themselves. */
                employees.some((e) => e.id === currentUser.id)
                  ? employees.map((e) => ({ value: e.id, label: e.name }))
                  : [{ value: currentUser.id, label: currentUser.name }, ...employees.map((e) => ({ value: e.id, label: e.name }))]
              }
              placeholder="Select Employee"
              emptyMessage="No staff are registered."
            />
          ) : (
            /*
             * Read-only, and shown as text rather than a disabled select: a
             * disabled control invites the officer to look for a way to enable
             * it. The value still reaches the payload — it is registered in the
             * form, not rendered from it.
             */
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted px-3 text-sm">
              <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate font-medium">{assignedName}</span>
              <span className="sr-only">
                Registering as {assignedName}. You may only register customers under your own name.
              </span>
            </div>
          )}
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
            emptyMessage="No loan types are configured. Add them under Administration → Master Data."
          />
        </Field>
        <Field label="Types of customer" error={errors.customerTypeId?.message}>
          <Combobox
            id="customerTypeId"
            value={watch("customerTypeId") || null}
            onChange={(v) => setValue("customerTypeId", v ?? "")}
            options={asOptions(customerTypes)}
            placeholder="Select"
            emptyMessage="No customer types are configured. Add them under Administration → Master Data."
          />
        </Field>
      </div>

      {/* Row 4 — Account Type, which decides the rest of the wizard */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Account Type"
          error={errors.accountTypeId?.message}
          help="Decides what the remaining steps ask for."
        >
          <Combobox
            id="accountTypeId"
            value={watch("accountTypeId") || null}
            onChange={(v) => setValue("accountTypeId", v ?? "")}
            options={asOptions(accountTypes)}
            placeholder="Select account type"
            emptyMessage="No account types are configured. Add them under Administration → Master Data."
          />
        </Field>
        {profile.guidance && (
          <div className="flex items-end">
            <p className="pb-2 text-xs text-muted-foreground">{profile.guidance}</p>
          </div>
        )}
      </div>

      {/* Row 5 — Region | District (chosen) | Ward | Street (typed) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Region" required={profile.requiresAddress} error={errors.regionId?.message}>
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
              // The district below now belongs to a different place.
              setValue("districtId", null);
            }}
          />
        </Field>

        <Field label="District" required={profile.requiresAddress} error={errors.districtId?.message}>
          <Combobox
            id="addr-district"
            value={watch("districtId") ?? null}
            loadOptions={districtLoader}
            loadKey={regionId ?? null}
            disabled={!regionId}
            disabledMessage="Select a region first"
            placeholder="Select district"
            emptyMessage="No districts in this region."
            invalid={!!errors.districtId}
            onChange={(v) => setValue("districtId", v, { shouldValidate: true })}
          />
        </Field>

        <Field label="Ward" error={errors.wardName?.message}>
          {/* Typed. Our ward table does not cover the country, and a dropdown
              that cannot offer the right answer produces a wrong one. */}
          <Input id="wardName" placeholder="Type the ward" {...register("wardName")} />
        </Field>

        <Field label="Street" error={errors.streetName?.message}>
          <Input id="streetName" placeholder="Type the street" {...register("streetName")} />
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
