"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { GENDERS, RESIDENCE_TYPES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { Branch } from "@/types/branch";
import { loadDistricts, loadRegions } from "@/features/customers/geography-actions";

/**
 * Step 1 — Basic Information. Who the person is, and where to find them.
 *
 *   ── Registration details ──────────────────────
 *   Branch            | Assigned Officer
 *   ──────────────────────────────────────────────
 *   First Name        | Middle name       | Last name
 *   Gender            | Date of Birth     | Phone Number
 *   ID Type           | ID Number
 *   Region            | District
 *   Ward              | Street            | Residence Type
 *
 * THE FIRST TWO ARE NOT BASIC INFORMATION, AND NO LONGER LOOK LIKE IT. Branch
 * and Assigned Officer describe the RECORD — which branch's book it joins, and
 * whose portfolio it sits in — not the person being registered. Sitting in the
 * middle of the personal details, under the heading "Employee", the second one
 * read like a fact about the customer: an officer could reasonably have taken
 * it for where the customer works. They now sit in their own strip above the
 * form, headed for what they are.
 *
 * ASSIGNED OFFICER IS NOT A LIST OF EVERYONE. It was a dropdown of every member
 * of staff, defaulting to nobody — so the field that records whose book the
 * customer sits on was routinely left blank, and the officer sitting with the
 * customer had to find their own name among all of them. It now shows the
 * signed-in user and is read-only. A supervisor holding
 * `customers.assign_officer` gets the dropdown back, because assigning a
 * customer to another officer moves the portfolio and the commission with them
 * and is a supervisory act.
 *
 * NONE OF THAT IS ENFORCED HERE. The API decides who may assign whom — see
 * RegisterCustomerRequest's officer check — and this only shows the officer
 * what they are allowed to do, so the screen and the server agree.
 *
 * IDENTITY IS A TYPE AND A NUMBER. Six separate ID-number boxes asked the
 * officer to find the right one; across the customers on file, two of the six
 * were ever used. One list of accepted documents and one number says the same
 * thing and makes "which document did we see?" answerable.
 *
 * THE ADDRESS IS TWO CHOSEN LEVELS AND TWO TYPED ONES. Region and district are
 * chosen from the reference tables, which are a complete and stable list and
 * are what every geographic report groups by. Ward and street are typed.
 *
 * The cascade used to run all four levels deep, and it dead-ended: the
 * reference tables do not cover the country, so an officer whose customer
 * lived in an unimported ward could not record the address at all, and the
 * control's advice — have it imported through Administration — is not
 * something they can act on with the customer sitting in front of them. A
 * typed ward is less queryable than a chosen one, and that is the cost being
 * paid deliberately. It is the same shape the customer profile screen already
 * uses, so a ward reads and edits the same way wherever it is seen. The values
 * land in `wardName` and `streetName`, which the API has accepted since the
 * 2026_08_26 migration; `wardId` and `streetId` remain in the payload for
 * records that already hold one.
 *
 * CUSTOMER TYPE IS NOT ASKED HERE ANY MORE. It moved to step two, which is
 * the step it builds: step two shows the customer type and then that type's
 * own configured questions, so asking it here would separate the question from
 * everything it decides and leave step two opening on a form whose shape was
 * chosen on another page.
 *
 * NOTHING ABOUT A LOAN IS ASKED HERE. Loan Category, Loan Type, Types of
 * Customer and Account Type were all on this step at one point, and none of
 * them describes the person being registered — they describe a commercial
 * relationship that does not exist yet at the moment the form is being filled
 * in. Loan Category in particular pre-judged an application nobody had made.
 * Which loan category a customer borrows under is decided in the lending
 * workflow, where there is a loan to decide it for; the Loan Category
 * administration module is untouched and its list is unchanged.
 *
 * "YEAR" IS GONE. It was the legacy form's read-only age box, derived from the
 * date of birth and sitting immediately beside it — a second rendering of a
 * fact already on screen, which nobody could edit and no rule read.
 */
export function BasicInformationStep({
  branches,
  branchLocked,
  currentUser,
  employees,
  canAssignOfficer,
  idTypes,
  profile,
}: {
  branches: Branch[];
  branchLocked: boolean;
  currentUser: { id: string; name: string };
  employees: { id: string; name: string }[];
  canAssignOfficer: boolean;
  /** Which identity documents the institution accepts. Admin-managed. */
  idTypes: MasterDataOption[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const regionId = watch("regionId");
  const employeeId = watch("employeeId");

  const regionLoader = React.useCallback(() => loadRegions(), []);
  const districtLoader = React.useCallback(() => loadDistricts(regionId ?? ""), [regionId]);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  /* Whoever the record is currently assigned to, named. Falls back to the
     signed-in user, which is what the form is initialised with. */
  const assignedName = employees.find((e) => e.id === employeeId)?.name ?? currentUser.name;

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Basic Information</h2>

      {profile.guidance && <p className="-mt-3 text-xs text-muted-foreground">{profile.guidance}</p>}

      {/*
        WHO IS DOING THE REGISTERING, and where it is booked.
        Deliberately set apart from everything below it. Neither of these
        describes the customer — they describe the RECORD: which branch's book
        it joins and whose portfolio it sits in. Mixed into the personal
        details, as they were, "Employee" read like a fact about the person in
        front of the officer.
      */}
      <section className="rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Registration details
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
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
            label="Assigned Officer"
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
                placeholder="Select officer"
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
        </div>
      </section>

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

      {/* Row 2 — Gender | Date of Birth | Phone Number */}
      <div className="grid gap-4 sm:grid-cols-3">
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
        <Field label="Date of Birth" required error={errors.dob?.message}>
          <Input id="dob" type="date" {...register("dob")} />
        </Field>
        <Field label="Phone Number" required error={errors.phone?.message}>
          <Input id="phone" placeholder="0754000000" {...register("phone")} />
        </Field>
      </div>

      {/* Row 3 — identity: which document, and what it says */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="ID Type" required={profile.requiresIdentityDocument} error={errors.idTypeId?.message}>
          <Combobox
            id="idTypeId"
            value={watch("idTypeId") ?? null}
            onChange={(v) => setValue("idTypeId", v ?? "", { shouldValidate: true })}
            options={asOptions(idTypes)}
            placeholder="Select ID type"
            emptyMessage="No ID types are configured. Add them under Administration → Master Data."
            invalid={!!errors.idTypeId}
          />
        </Field>
        <Field label="ID Number" required={profile.requiresIdentityDocument} error={errors.idNumber?.message}>
          <Input id="idNumber" placeholder="Number shown on the document" {...register("idNumber")} />
        </Field>
      </div>

      {/* Row 4 — Region → District, both chosen from the reference tables */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Region" required={profile.requiresAddress} error={errors.regionId?.message}>
          <Combobox
            id="addr-region"
            value={regionId ?? null}
            loadOptions={regionLoader}
            loadKey="regions"
            placeholder="Select region"
            emptyMessage="No regions are on file yet. They are imported under Administration → Geography."
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
            emptyMessage="No districts are on file for this region yet. They are imported under Administration → Geography."
            invalid={!!errors.districtId}
            onChange={(v) => setValue("districtId", v, { shouldValidate: true })}
          />
        </Field>
      </div>

      {/* Row 5 — Ward and Street, typed. See the note at the top of the file. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Ward" required={profile.requiresAddress} error={errors.wardName?.message}>
          <Input id="addr-ward" placeholder="Enter ward" {...register("wardName")} />
        </Field>
        <Field label="Street" required={profile.requiresAddress} error={errors.streetName?.message}>
          <Input id="addr-street" placeholder="Enter street" {...register("streetName")} />
        </Field>

        {/*
          RESIDENCE TYPE, WHICH NOTHING ASKED FOR.
          The column exists, the API validates it, the payload carries it and
          the customer profile has a field for it — and no control on this form
          ever set it, so every customer showed a dash under a heading the
          profile promised to fill. Asked here because it is part of where
          somebody lives, which is what the rest of this row is about.
        */}
        <Field
          label="Residence Type"
          error={errors.residenceType?.message}
          help="Whether the customer owns or rents where they live."
        >
          <Combobox
            id="residenceType"
            value={watch("residenceType") ?? null}
            onChange={(v) =>
              setValue("residenceType", (v as WizardValues["residenceType"]) ?? null, {
                shouldValidate: true,
              })
            }
            /* The two the column accepts. Adding a third — "family", say — is a
               migration on the enum, not a value this control may invent. */
            options={RESIDENCE_TYPES.map((r) => ({ value: r, label: capitalise(r) }))}
            placeholder="Select residence type"
            invalid={!!errors.residenceType}
          />
        </Field>
      </div>
    </div>
  );
}

/** "owned" → "Owned". The enum is stored lowercase and read in prose. */
function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
