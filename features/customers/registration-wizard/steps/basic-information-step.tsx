"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Loader2, Lock, Pencil, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NO_AUTOFILL } from "@/features/customers/registration-wizard/no-autofill";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/settings/combobox";
import { GENDERS, RESIDENCE_TYPES } from "@/types/enums";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";
import { structuredNameFor } from "@/features/customers/registration-wizard/structured-fields";
import { NextOfKinStep } from "@/features/customers/registration-wizard/steps/next-of-kin-step";
import type { MasterDataOption } from "@/lib/api/master-data";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";
import type { Branch } from "@/types/branch";
import type { CustomerCategory } from "@/types/customer";
import { loadDistricts, loadRegions, loadWards, type GeoOption } from "@/features/customers/geography-actions";
import { ageInYears, formatAge } from "@/lib/domain/age";

/**
 * Step 1 — Basic Information. Who the person is, where to find them, and what
 * kind of customer they are.
 *
 *   ── Registration ──────────────────────────────
 *   Branch      | Assigned Officer | Customer Type (decides step two)
 *   ── Personal details ──────────────────────────
 *   First name  | Middle name   | Last name      | Gender
 *   Date of Birth | Age         | Phone Number   | ID Type
 *   ID Number   | Marital Status | Dependents     | Residence Type
 *   ── Residence ─────────────────────────────────
 *   Region      | District      | Ward           | Street
 *   ── Next of Kin ───────────────────────────────
 *
 * FOUR GROUPS ON RULES, NOT FOUR CARDS. Every group above was once a bordered,
 * padded section — or, for the personal details, four separate grids stacked
 * with a gap between each. Both cost height the form did not have: the officer
 * met three headings and two tinted boxes before the first name box. The
 * grouping is what mattered and it survives, carried by a heading on a hairline
 * (`GroupHeading`) instead of a container. Rows are the grid's own wrapping,
 * which is why nothing sits alone on a line of its own any more.
 *
 * CUSTOMER TYPE IS ASKED HERE, and used to be asked at the top of step two.
 * Everything step two contains is this answer's consequence — a salaried
 * customer is asked about their employer, a trader about their business — so
 * asking it on the step it governs meant step two opened as an empty card with
 * one dropdown in it, and the officer could not see what choosing would bring.
 * Asking it here also means the rule for it fires where the control is; see
 * `validateStepAgainstProfile`.
 *
 * CHANGING IT FORGETS THE PREVIOUS TYPE'S ANSWERS, and must: a sector belonging
 * to a customer whose new type has no sector would be submitted against a field
 * nobody asked, or worse, would quietly satisfy a rule nobody meant to satisfy.
 *
 * THE FIRST TWO ARE NOT BASIC INFORMATION, AND DO NOT LOOK LIKE IT. Branch and
 * Assigned Officer describe the RECORD — which branch's book it joins, whose
 * portfolio it sits in — not the person being registered. Sitting in the middle
 * of the personal details, under the heading "Employee", the second one read
 * like a fact about the customer.
 *
 * ASSIGNED OFFICER IS NOT A LIST OF EVERYONE. It shows the signed-in user and
 * is read-only; a supervisor holding `customers.assign_officer` gets the
 * dropdown, because assigning a customer to another officer moves the portfolio
 * and the commission with them. NONE OF THAT IS ENFORCED HERE — the API decides
 * who may assign whom.
 *
 * IDENTITY IS A TYPE AND A NUMBER. Six separate ID-number boxes asked the
 * officer to find the right one; across the customers on file, two of the six
 * were ever used.
 *
 * THE ADDRESS IS A THREE-LEVEL CASCADE — Region → District → Ward — each level
 * fetched for the parent chosen above it, none of them held in this file. Ward
 * was a free-text box for a while, because the reference tables did not cover
 * the country and an officer whose customer lived in an unimported ward could
 * not record the address at all. THE TYPED BOX HAS NOT BEEN REMOVED; it is now
 * the fallback rather than the rule. A district with wards on file offers them;
 * a district with none offers the box, says why, and takes what is typed into
 * `wardName` — which the API has accepted since the 2026_08_26 migration. So a
 * chosen ward is queryable and reportable, and nobody is ever stuck.
 *
 * NEXT OF KIN IS COLLECTED HERE. It is an emergency contact — basic information
 * about a person in every sense except where an older version of this form put
 * it, which was behind a requirement flag on step two, invisible unless the
 * account type demanded one. An officer who did not see it registered the
 * customer and found out afterwards that next of kin lived somewhere else
 * entirely.
 *
 * NOTHING ABOUT A LOAN IS ASKED HERE. Loan Category and Loan Type were on this
 * step at one point, and neither describes the person being registered.
 *
 * "YEAR" IS GONE. It was the legacy form's read-only age box; the age under the
 * date of birth says the same thing and is right on the next birthday.
 */
export function BasicInformationStep({
  branches,
  branchLocked,
  currentUser,
  employees,
  canAssignOfficer,
  categories,
  idTypes,
  maritalStatuses,
  profile,
}: {
  branches: Branch[];
  branchLocked: boolean;
  currentUser: { id: string; name: string };
  employees: { id: string; name: string }[];
  canAssignOfficer: boolean;
  /** The customer types an administrator has configured and left active. */
  categories: CustomerCategory[];
  /** Which identity documents the institution accepts. Admin-managed. */
  idTypes: MasterDataOption[];
  /** The civil statuses the institution records. Admin-managed, never hardcoded. */
  maritalStatuses: MasterDataOption[];
  profile: AccountTypeRequirementProfile;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<WizardValues>();

  const regionId = watch("regionId");
  const districtId = watch("districtId");
  const employeeId = watch("employeeId");
  const categoryId = watch("customerCategoryId");
  const category = categories.find((c) => c.id === categoryId);

  /* The age the date of birth says, written under it as soon as one is picked.
     Officers were reading a birth year and doing the subtraction in their head
     against the product's minimum age; the form can just say it. Derived on
     every render rather than stored in a field, because an age that is captured
     once is wrong on the next birthday — see lib/domain/age. */
  const dob = watch("dob");
  const ageLabel = formatAge(ageInYears(dob));

  const regionLoader = React.useCallback(() => loadRegions(), []);
  const districtLoader = React.useCallback(() => loadDistricts(regionId ?? ""), [regionId]);

  const asOptions = (rows: MasterDataOption[]) =>
    rows.map((r) => ({ value: r.id, label: r.name, hint: r.description ?? undefined }));

  /* Whoever the record is currently assigned to, named. Falls back to the
     signed-in user, which is what the form is initialised with. */
  const assignedName = employees.find((e) => e.id === employeeId)?.name ?? currentUser.name;

  /**
   * Chooses the customer type, and forgets everything the previous one asked.
   *
   * An answer left behind from the old form would be submitted against a field
   * the new type never asks — or would quietly satisfy a rule nobody meant to
   * satisfy. Both the JSON answers and the structured ones are cleared, because
   * the officer cannot see which is which and the distinction is not theirs to
   * manage.
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

  /** A count box: a number, or nothing. Never the 0 that `Number("")` returns. */
  function writeCount(name: "dependentsCount", raw: string) {
    const parsed = raw.trim() === "" ? null : Number(raw);
    setValue(name, parsed === null || !Number.isFinite(parsed) ? null : parsed, {
      shouldValidate: true,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold">Basic Information</h2>
        {profile.guidance && <p className="text-xs text-muted-foreground">{profile.guidance}</p>}
      </div>

      {/*
        WHO IS DOING THE REGISTERING, WHERE IT IS BOOKED, AND WHAT KIND OF
        CUSTOMER IT IS. The three answers that describe the RECORD rather than
        the person, kept together and kept first.

        They used to be two bordered cards stacked above the form — a tinted
        one for branch and officer, a second for customer type — which cost
        about a third of the visible step before a single personal detail. The
        separation they were bought for is carried by the rule and the heading
        instead, and the officer can now see the name boxes without scrolling.
      */}
      <section className="space-y-3">
        <GroupHeading>Registration</GroupHeading>

        <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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

          <Field label="Assigned Officer" error={errors.employeeId?.message}>
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

          {/* The wrapper carries `data-field`, not the control: it is what the
              wizard scrolls to when this is the first thing left unanswered. */}
          <div data-field="customerCategoryId">
            <Field
              label="Customer Type"
              required={profile.requiresCustomerCategory}
              error={
                typeof errors.customerCategoryId?.message === "string"
                  ? errors.customerCategoryId.message
                  : undefined
              }
            >
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
                /* The officer cannot fix this themselves — creating a customer
                   type is the Super Administrator's — so the message names who to
                   ask rather than a screen they cannot open. */
                emptyMessage="No customer types are configured. Please contact the Super Administrator."
                invalid={!!errors.customerCategoryId}
              />
            </Field>
          </div>
        </div>
      </section>

      {/*
        THE PERSON. Names, then who they are and how to reach them, then what
        proves it and who depends on them.

        One grid rather than four. The rows below are the grid's own wrapping —
        four to a line on a wide screen, two on a tablet, one on a phone — which
        is why "Number of Dependents" no longer sits alone on a row of its own
        the way it did when every row was a separate grid.
      */}
      <section className="space-y-3">
        <GroupHeading>Personal details</GroupHeading>

        <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="First Name" required error={errors.firstName?.message}>
            <Input {...NO_AUTOFILL} id="firstName" placeholder="First name" {...register("firstName")} />
          </Field>
          <Field label="Middle name" error={errors.middleName?.message}>
            <Input {...NO_AUTOFILL} id="middleName" placeholder="Middle name" {...register("middleName")} />
          </Field>
          <Field label="Last name" required error={errors.lastName?.message}>
            <Input {...NO_AUTOFILL} id="lastName" placeholder="Last name" {...register("lastName")} />
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
          <Field label="Date of Birth" required error={errors.dob?.message}>
            <Input {...NO_AUTOFILL} id="dob" type="date" {...register("dob")} />
          </Field>
          {/*
            Age is READ, not entered. It is deliberately NOT registered with the
            form: nothing about age is sent to the API, because an age that is
            captured is wrong on the next birthday while the date of birth beside
            it stays right. `readOnly` rather than `disabled` so the value is
            still selectable and still reaches assistive technology, and out of
            the tab order so it does not interrupt typing between the date and
            the phone number.
          */}
          <Field label="Age">
            <Input {...NO_AUTOFILL}
              id="age"
              readOnly
              aria-readonly="true"
              tabIndex={-1}
              value={ageLabel ?? ""}
              placeholder="—"
              className="cursor-default bg-muted font-medium"
            />
          </Field>
          <Field label="Phone Number" required error={errors.phone?.message}>
            <Input {...NO_AUTOFILL} id="phone" placeholder="0754000000" {...register("phone")} />
          </Field>

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
            <Input {...NO_AUTOFILL} id="idNumber" placeholder="Number shown on the document" {...register("idNumber")} />
          </Field>

          {/*
            Marital status. Asked here because it was asked nowhere: the rule for
            it was enforced against step two while no step drew the field, so an
            account type that requires it refused to advance and highlighted
            nothing.

            The options are the institution's own list, from master data. There is
            no hardcoded set of statuses here: an institution that records
            "separated" adds it under Administration and the form offers it.
          */}
          <Field
            label="Marital Status"
            required={profile.requiresMaritalStatus}
            error={errors.maritalStatusId?.message}
          >
            <Combobox
              id="maritalStatusId"
              value={watch("maritalStatusId") || null}
              onChange={(v) => setValue("maritalStatusId", v ?? "", { shouldValidate: true })}
              options={asOptions(maritalStatuses)}
              placeholder="Select marital status"
              emptyMessage="No marital statuses are configured. Add them under Administration → Master Data."
              invalid={!!errors.maritalStatusId}
            />
          </Field>

          {/*
            NUMBER OF DEPENDENTS. A real column the API has always validated
            (0–50) and which no control ever set, so every customer profile showed
            a dash under it. It is written as a number or null — never the 0 that
            `Number("")` produces, which would record "no dependants" for a
            question nobody answered.
          */}
          <Field label="Number of Dependents" error={errors.dependentsCount?.message}>
            <Input {...NO_AUTOFILL}
              id="dependentsCount"
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              placeholder="0"
              value={watch("dependentsCount") ?? ""}
              onChange={(e) => writeCount("dependentsCount", e.target.value)}
            />
          </Field>

          {/*
            RESIDENCE TYPE. Asked here rather than under Residence: owning or
            renting is a fact about the person and their household, which is
            what the rows above it are, while Residence below is the address
            itself — region, district, ward, street. It also leaves each group
            filling its rows exactly: twelve here, four there.

            NOTHING ASKED FOR IT BEFORE.
            The column exists, the API validates it, the payload carries it and
            the customer profile has a field for it — and no control on this form
            ever set it, so every customer showed a dash under a heading the
            profile promised to fill.
          */}
          <Field label="Residence Type" error={errors.residenceType?.message}>
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
      </section>

      {/* ------------------------------------------------------------ address */}
      <section className="space-y-3">
        <GroupHeading>Residence</GroupHeading>

        {/* Region → District → Ward, each chosen from the register. The cascade
            itself is untouched: same ids, same loaders, same clearing rules. */}
        <div className="grid gap-x-3 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
                /* Everything below now belongs to a different place. Cleared
                   rather than left to look valid: a district from the previous
                   region is not merely stale, it is wrong. */
                setValue("districtId", null, { shouldValidate: true });
                setValue("wardId", null);
                setValue("wardName", "");
                setValue("streetId", null);
              }}
            />
          </Field>

          <Field label="District" required={profile.requiresAddress} error={errors.districtId?.message}>
            <Combobox
              id="addr-district"
              value={districtId ?? null}
              loadOptions={districtLoader}
              loadKey={regionId ?? null}
              disabled={!regionId}
              disabledMessage="Select a region first"
              placeholder="Select district"
              emptyMessage="No districts are on file for this region yet. They are imported under Administration → Geography."
              invalid={!!errors.districtId}
              onChange={(v) => {
                setValue("districtId", v, { shouldValidate: true });
                /* The ward below belongs to the district, in both of the shapes
                   a ward can be held in. */
                setValue("wardId", null);
                setValue("wardName", "");
                setValue("streetId", null);
              }}
            />
          </Field>

          {/*
            Remounted whenever the district changes — the `key` — so the loaded
            list, the loading flag and the "type it instead" choice all reset
            together. An effect resetting three pieces of state on a prop change
            is the same thing written less reliably.
          */}
          <WardField
            key={districtId ?? "no-district"}
            districtId={districtId ?? null}
            required={profile.requiresAddress}
            error={errors.wardId?.message ?? errors.wardName?.message}
          />

          <Field label="Street" required={profile.requiresAddress} error={errors.streetName?.message}>
            <Input {...NO_AUTOFILL} id="addr-street" placeholder="Enter street" {...register("streetName")} />
          </Field>

        </div>
      </section>

      {/* --------------------------------------------------------- next of kin */}
      <section className="space-y-3" data-field="nextOfKin">
        <GroupHeading>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden />
            Next of Kin
            {profile.minNextOfKin > 0 && <span className="text-destructive">*</span>}
          </span>
        </GroupHeading>

        {typeof errors.nextOfKin?.message === "string" && (
          <p className="text-xs text-destructive">{errors.nextOfKin.message}</p>
        )}

        <NextOfKinStep />
      </section>
    </div>
  );
}

/**
 * A group's name, on a hairline rule.
 *
 * What four bordered, padded cards used to do. A card draws a box around
 * fields that were never in danger of being confused with their neighbours,
 * and charges 2rem of padding plus a border for the service — repeated four
 * times, that was most of the reason this step did not fit on a laptop screen.
 * A rule separates just as well at a fraction of the height.
 */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b pb-1.5">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {children}
      </h3>
    </div>
  );
}

/**
 * The ward, chosen where the register knows it and typed where it does not.
 *
 * FOUR STATES, AND EACH ONE SAYS WHICH IT IS. Waiting for a district; loading
 * that district's wards; offering them; or offering a box because there are
 * none to offer. A cascade that shows an empty dropdown for all four is the
 * reason the ward was turned into a plain text box in the first place — the
 * officer could not tell "still loading" from "this district has no wards" from
 * "something is broken", and only one of those is worth waiting for.
 *
 * BOTH SHAPES REACH THE API. Choosing from the list writes `wardId` AND
 * `wardName`; typing writes `wardName` alone. The name is written in both cases
 * on purpose — every screen that displays an address reads `wardName`, and a
 * record that held only an id used to render a blank line until somebody
 * joined the table.
 *
 * THE MANUAL BOX IS ALWAYS REACHABLE, even where the list has entries. Ward
 * boundaries change, imports lag, and an officer with a customer in front of
 * them cannot act on "ask an administrator to import it".
 */
function WardField({
  districtId,
  required,
  error,
}: {
  districtId: string | null;
  required?: boolean;
  error?: string;
}) {
  const { setValue, watch } = useFormContext<WizardValues>();

  const wardId = watch("wardId");
  const wardName = watch("wardName");

  const [rows, setRows] = React.useState<GeoOption[] | null>(null);
  /* Starts loading when there is a district to load for, rather than being
     switched on inside the effect: this component is remounted per district
     (see the `key` on it), so the first render already knows the answer, and a
     setState in an effect body would make React re-render for a fact it could
     have been told up front. */
  const [loading, setLoading] = React.useState(() => Boolean(districtId));
  /* Initialised from what the form already holds, so a resumed draft carrying a
     typed ward comes back showing the box it was typed into rather than an
     empty dropdown. The component is remounted per district, so this is only
     ever read for the district the draft was saved against. */
  const [manual, setManual] = React.useState(() => Boolean(wardName) && !wardId);

  React.useEffect(() => {
    if (!districtId) return;

    let cancelled = false;

    /* `loadWards` fails soft to an empty list — see geography-actions. An empty
       list and a failed lookup are deliberately treated the same here: both
       mean "nothing to choose from", and both are answered by the typed box. */
    void loadWards(districtId).then((loaded) => {
      if (cancelled) return;
      setRows(loaded);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  const empty = rows !== null && rows.length === 0;
  const typing = manual || empty;

  if (!districtId) {
    return (
      <Field label="Ward" required={required} error={error}>
        {/* `readOnly` as well as `disabled`: React warns about a `value` with
            no `onChange`, and the warning is right — this box is a message, not
            an input. */}
        <Input {...NO_AUTOFILL}
          id="addr-ward"
          disabled
          readOnly
          value=""
          placeholder="Select a district first"
          aria-label="Ward"
        />
      </Field>
    );
  }

  if (loading && !typing) {
    return (
      <Field label="Ward" required={required}>
        <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          <span>Loading wards…</span>
        </div>
      </Field>
    );
  }

  if (typing) {
    return (
      <Field
        label="Ward"
        required={required}
        error={error}
        help={
          empty
            ? "No wards are on file for this district — type it. It can be imported later under Administration → Geography."
            : undefined
        }
      >
        <Input {...NO_AUTOFILL}
          id="addr-ward"
          placeholder="Enter ward"
          value={wardName ?? ""}
          onChange={(e) => {
            setValue("wardName", e.target.value, { shouldValidate: true });
            /* A typed name and a chosen id are two answers to one question. */
            setValue("wardId", null);
          }}
        />
        {!empty && (
          <button
            type="button"
            className="text-[12px] text-primary underline-offset-2 hover:underline"
            onClick={() => {
              setManual(false);
              setValue("wardName", "");
            }}
          >
            Choose from the list instead
          </button>
        )}
      </Field>
    );
  }

  return (
    <Field label="Ward" required={required} error={error}>
      <Combobox
        id="addr-ward"
        value={wardId ?? null}
        options={rows ?? []}
        placeholder="Select ward"
        emptyMessage="No wards are on file for this district yet."
        invalid={Boolean(error)}
        onChange={(v) => {
          setValue("wardId", v, { shouldValidate: true });
          /* The name travels with the id: every screen that shows an address
             reads `wardName`, and a record holding only an id renders a blank
             line until somebody joins the table. */
          setValue("wardName", rows?.find((r) => r.value === v)?.label ?? "", {
            shouldValidate: true,
          });
          setValue("streetId", null);
        }}
      />
      <button
        type="button"
        className="flex items-center gap-1 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => {
          setManual(true);
          setValue("wardId", null);
        }}
      >
        <Pencil className="size-3" aria-hidden />
        Ward not listed? Type it
      </button>
    </Field>
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
    <div className="space-y-1">
      <Label>
        {label}:{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {help && !error && <p className="text-[12px] text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
