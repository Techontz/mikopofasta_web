import { z } from "zod";
import { RegisterCustomerInputSchema, STRUCTURED_TARGETS } from "@/types/customer";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";

/**
 * Same shape as the final submission payload minus the three verification
 * timestamps — those are not form fields. They are the outcome of the NIDA,
 * OTP and face steps, none of which the officer types, and two of which no
 * longer happen at all until their integrations exist.
 */
export const WizardSchema = RegisterCustomerInputSchema.omit({
  nidaVerifiedAt: true,
  otpVerifiedAt: true,
  faceVerifiedAt: true,
}).extend({
  /*
   * A birth date in the future is caught here, not at the server.
   *
   * The API rejects it (`before:today`) and always did, but the officer only
   * learned that after filling the whole form and pressing Save — and the
   * rejection arrived as "The given data was invalid.", naming no field. A
   * date typed as 2026 instead of 1926 is an ordinary slip; it should be
   * flagged in the field as it happens.
   *
   * Compared against the local calendar day rather than `new Date()`, so a
   * birthday entered as today is accepted rather than failing on the clock's
   * time-of-day component.
   */
  dob: z
    .string()
    .min(1, "Date of birth is required.")
    .refine(
      (value) => {
        const parsed = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return parsed < today;
      },
      { message: "Date of birth must be in the past." }
    ),
});
export type WizardValues = z.infer<typeof WizardSchema>;

/**
 * Four steps. The registration workflow, not a form split into pages.
 *
 *     Basic Information → Additional Details → Documents → Face Verification
 *
 * WHY DOCUMENTS AND FACE VERIFICATION ARE NOT ONE STEP. They were, and it hid
 * the most important fact about this workflow: THE CUSTOMER IS CREATED BETWEEN
 * THEM. Step three ends with a save that writes a permanent record and returns
 * a customer number; step four is a biometric check performed AGAINST that
 * record, by whoever has the customer in front of them, on whatever device has
 * a camera. One combined step made a save and a scan look like two halves of a
 * single button press, when in truth the officer may legitimately stop between
 * them for a day.
 *
 * SAVE IS NOT FINALISE.
 *
 *     step 3  →  customer exists, status "Awaiting face verification"
 *     step 4  →  face verification passes  →  KYC complete
 *
 * Leaving after step three loses nothing and is a supported outcome, not a
 * failure: the customer is in the book, findable, and their profile offers the
 * same scan. Nothing here may declare KYC complete — `KycEvaluator` decides
 * that from what is actually on file, and a client that could assert it would
 * be able to assert a biometric check nobody performed.
 *
 * WHAT STEP TWO ASKS IS NOT WRITTEN DOWN. It shows one dropdown — Customer Type
 * — and then whatever that type's configured registration form declares. A new
 * customer type, a new question, a new cascade or a new conditional rule are
 * all saves on an administration screen. Nothing in this directory names a
 * customer type.
 *
 * WHAT EACH STEP REQUIRES STILL COMES FROM THE ACCOUNT TYPE. `profile` is a row
 * from `account_type_requirements`, read from the API, and the same row is what
 * `RegisterCustomerRequest` validates against and what `KycEvaluator` judges
 * completeness by. The wizard is not a second opinion about the rules — it is
 * an earlier report of the same ones.
 */
export const WIZARD_STEPS = [
  { id: "basic", label: "Basic Information" },
  { id: "details", label: "Additional Details" },
  { id: "documents", label: "Documents" },
  { id: "face", label: "Face Verification" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/**
 * The step at which the customer record is created — the end of Documents, not
 * the end of the wizard. Everything before it is a draft; everything after it
 * operates on a customer that already exists.
 */
export const SAVE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "documents");

/** The biometric step. Reachable only once the customer has been created. */
export const FACE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "face");

/**
 * Fields validated (via RHF trigger) before allowing "Next" past each step.
 *
 * Only what the step actually SHOWS. A field validated on a step that does not
 * render it produces a Next button that refuses to advance and highlights
 * nothing — which is precisely how this list gets out of date, so it is short
 * on purpose.
 *
 * Step two names none of its fields, and cannot: they are whatever the chosen
 * customer type declares. They are validated against that configuration
 * instead — see `missingDynamicAnswers`.
 */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardValues)[]> = {
  basic: ["firstName", "lastName", "dob", "gender", "branchId", "phone"],
  details: ["guarantors", "nextOfKin"],
  /* Nothing validated by the form: whether the documents are mandatory is the
     account type's answer, given by the API, and enforcing it here would let
     the two disagree. The identity document is the exception and is checked at
     Save, because it decides whether a customer is created at all. */
  documents: [],
  /* Nothing. By this point the customer exists and the form is no longer the
     source of truth about them — the scanner is, and the API judges it. */
  face: [],
};

/**
 * Everything step one puts on screen, which is not the same as everything it
 * VALIDATES — the list above is only what React Hook Form is asked to check
 * before Next.
 *
 * This one answers a different question: when the server rejects a field, or a
 * rule fires at Save, which step should the officer be sent back to? Without it
 * a 422 on the address leaves them staring at step three with a message about a
 * box two pages away.
 *
 * Anything not named here belongs to step two, which is the honest default:
 * step two's fields are whatever the chosen customer type declares, so they
 * cannot be listed, and step three collects files rather than fields.
 */
const BASIC_STEP_FIELDS = new Set<string>([
  "firstName",
  "middleName",
  "lastName",
  "dob",
  "gender",
  "phone",
  "branchId",
  "employeeId",
  "idTypeId",
  "idNumber",
  "nidaNumber",
  "nationalIdNumber",
  "voterIdNumber",
  "driverLicenceNumber",
  "passportNumber",
  "workIdNumber",
  "regionId",
  "districtId",
  "wardName",
  "streetName",
]);

/**
 * Anything to do with a file, which step three collects.
 *
 * Prefix-matched rather than listed, because a document error is keyed by the
 * document's own code — `documents.salary_slip` — and those are configuration,
 * not something this file can enumerate.
 */
const DOCUMENT_ERROR_PREFIXES = ["documents", "attachments", "customerDocuments", "file"];

/**
 * The step that shows the field a message is about.
 *
 * Used both for a rule this form applies at Save and for a field the API
 * rejected, so a message always lands on a screen where the officer can see the
 * control it is about. NOTHING IS DISCARDED when this moves the step: the whole
 * wizard is one React Hook Form, so every value the officer typed is still
 * there, on whichever step owns it.
 */
export function stepOwning(field: string): WizardStepId {
  const root = field.split(".")[0];

  if (BASIC_STEP_FIELDS.has(root)) return "basic";
  if (DOCUMENT_ERROR_PREFIXES.includes(root)) return "documents";

  /* Everything else is step two's: the customer type and whatever its
     configuration asks for, which cannot be listed here because it is data. */
  return "details";
}

/**
 * React Hook Form's error tree, flattened to `[dotted path, message]`.
 *
 * WHY THIS EXISTS. The save path used to answer a failed validation with
 * "Please fix the highlighted fields before saving." and nothing else — no
 * field named, no step change, no focus. When the offending field was on
 * another step, or was one the form no longer displays, the officer was left
 * with a form that looked complete, a message that named nothing, and no way
 * forward. A validator that knows exactly what is wrong and refuses to say is
 * worse than no validator.
 *
 * RHF nests errors to mirror the value shape — `bankDetails.accountNumber`,
 * `guarantors.0.phone`, `dynamicFormData.land_size` — so this walks the tree
 * rather than reading its top level, which is how an error on a nested field
 * went unreported.
 */
export function flattenErrors(errors: unknown, prefix = ""): { path: string; message: string }[] {
  if (errors === null || typeof errors !== "object") return [];

  const found: { path: string; message: string }[] = [];

  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (key === "ref" || key === "types") continue;

    const path = prefix === "" ? key : `${prefix}.${key}`;

    if (value !== null && typeof value === "object") {
      const message = (value as { message?: unknown }).message;

      if (typeof message === "string" && message !== "") {
        found.push({ path, message });
        continue;
      }

      found.push(...flattenErrors(value, path));
    }
  }

  return found;
}

/**
 * A field's name in words, for a message the officer can act on.
 *
 * Falls back to the path itself rather than to nothing: `dynamicFormData.x` is
 * not friendly, but it is enough for an officer to describe the problem and for
 * anyone reading the report to find the field. Silence is the only answer that
 * helps nobody.
 */
export function describeField(path: string): string {
  const root = path.split(".")[0];

  /* The wizard's own controls first, then the storage targets a customer
     type's configured field may write to — those carry the same wording the
     administration screen shows, so a message about one names the thing the
     administrator configured rather than a column. */
  return FIELD_LABELS[root] ?? (STRUCTURED_TARGETS as Record<string, string>)[root] ?? path;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  middleName: "Middle name",
  lastName: "Last name",
  dob: "Date of birth",
  gender: "Gender",
  phone: "Phone number",
  branchId: "Branch",
  idTypeId: "ID type",
  idNumber: "ID number",
  regionId: "Region",
  districtId: "District",
  wardName: "Ward",
  streetName: "Street",
  customerCategoryId: "Customer type",
  guarantors: "Guarantors",
  nextOfKin: "Next of kin",
  bankDetails: "Bank details",
};

/**
 * The account-type rules the wizard enforces before letting the officer past a
 * step, mirroring RegisterCustomerRequest::after().
 *
 * THE SERVER IS THE ENFORCEMENT. This exists so a missing guarantor is caught
 * on the step that collects guarantors rather than five clicks later at Save,
 * and every message here is worded to match the API's so the officer does not
 * read two different sentences about one problem. Both read the same profile,
 * so they cannot disagree about WHAT is required — only about when it is
 * pointed out.
 *
 * Returns field-keyed messages, which is what RHF's `setError` takes.
 */
export function validateStepAgainstProfile(
  step: WizardStepId,
  values: WizardValues,
  profile: AccountTypeRequirementProfile
): Record<string, string> {
  const errors: Record<string, string> = {};
  const filled = (v: unknown) => typeof v === "string" && v.trim() !== "";
  const num = (v: unknown) => typeof v === "number" && !Number.isNaN(v);

  if (step === "basic" && profile.requiresAddress) {
    if (!filled(values.regionId)) errors.regionId = "Region is required.";
    /* District and not ward: districts are a complete list and wards are not. */
    if (!filled(values.districtId)) errors.districtId = "District must be selected.";
  }

  /*
   * The identity pair moved to step one with the rest of the basic details, so
   * the rule moved with it. Checking it anywhere else would refuse to advance
   * and highlight nothing, which is the exact failure the note above
   * STEP_FIELDS describes.
   */
  if (step === "basic" && profile.requiresIdentityDocument) {
    const hasPair = filled(values.idTypeId) && filled(values.idNumber);
    const hasLegacy = [
      values.nidaNumber,
      values.nationalIdNumber,
      values.voterIdNumber,
      values.driverLicenceNumber,
      values.passportNumber,
      values.workIdNumber,
    ].some(filled);

    if (!hasPair && !hasLegacy) {
      errors.idTypeId =
        "An identity document is required — choose the ID type and enter the number shown on it.";
    }
  }

  /*
   * The customer type is asked on step two, because it is what step two is
   * FOR: everything else on that step is the form this answer selects.
   *
   * The rule itself is the account type's and the wording is the API's. When
   * the account type does not demand a customer type, the officer may continue
   * without one and step two says so rather than inventing a requirement the
   * server does not have.
   */
  if (step === "details" && profile.requiresCustomerCategory && !filled(values.customerCategoryId)) {
    errors.customerCategoryId =
      "A customer type is required for this account type — it decides which loan products the customer may take.";
  }

  if (step === "details") {
    if (profile.requiresMaritalStatus && !filled(values.maritalStatusId) && !values.maritalStatus) {
      errors.maritalStatusId = "Marital status is required for this account type.";
    }

    /*
     * Employment, business and income under an account type that demands them.
     *
     * These are not asked by name any more — a customer type's configured form
     * decides which of them appear, and the ordinary configuration binds them
     * to these same fields (see structured-fields.ts). So the check still
     * reaches the right values, and if a profile demands something the chosen
     * customer type never asks for, the officer is told on the step that would
     * have carried it rather than at Save.
     */
    if (profile.requiresEmploymentDetails) {
      if (!filled(values.employer) && !filled(values.placeOfEmployment)) {
        errors.employer = "An employer or place of employment is required for this account type.";
      }
      if (!filled(values.workType) && !filled(values.employmentType)) {
        errors.workType = "Work type or type of employment is required for this account type.";
      }
      if (!num(values.takeHome) && !num(values.basicSalary) && !num(values.monthlyIncome)) {
        errors.takeHome = "An income figure is required for this account type.";
      }
    }

    if (profile.requiresBusinessDetails) {
      if (!filled(values.businessName)) errors.businessName = "Business name is required for this account type.";
      if (!filled(values.businessType)) errors.businessType = "Business type is required for this account type.";
    }

    if (values.guarantors.length < profile.minGuarantors) {
      errors.guarantors = `At least ${profile.minGuarantors} guarantor${
        profile.minGuarantors === 1 ? " is" : "s are"
      } required for this account type.`;
    }

    if (values.nextOfKin.length < profile.minNextOfKin) {
      errors.nextOfKin = `At least ${profile.minNextOfKin} next of kin ${
        profile.minNextOfKin === 1 ? "is" : "are"
      } required for this account type.`;
    }
  }

  return errors;
}

export function defaultWizardValues(
  homeBranchId: string | null,
  employeeId: string | null
): WizardValues {
  return {
    nidaNumber: "",
    firstName: "",
    middleName: null,
    lastName: "",
    dob: "",
    gender: "male",
    phone: "",
    maritalStatus: null,
    regionId: null,
    districtId: null,
    /* The ids stay in the payload for records that hold one; the wizard never
       sets them any more. See the API's 2026_08_26 migration. */
    wardId: null,
    streetId: null,
    wardName: "",
    streetName: "",
    residenceType: null,

    // The KYC detail block. Empty strings, not nulls, because these are bound
    // to <input> elements — RHF treats a null value as uncontrolled and React
    // warns about it. The API's schema normalises "" back to null on submit.
    alternativePhone: "",
    email: "",
    nationality: "",
    nationalIdNumber: "",
    tinNumber: "",
    passportNumber: "",
    village: "",
    houseNumber: "",
    postalCode: "",
    landmark: "",
    occupation: "",
    employer: "",
    monthlyIncome: null,
    employmentType: "",
    workType: "",
    businessName: "",
    businessType: "",
    businessAddress: "",
    bankBranch: "",
    mobileMoneyProvider: "",
    walletNumber: "",

    // Registration form. Empty strings for text/select ids (bound to inputs),
    // null for numbers so an untouched box is absent rather than 0.
    /* The signed-in officer, filled in by the caller. The field is read-only
       for anyone without `customers.assign_officer`. */
    employeeId: employeeId ?? "",
    /*
     * NO `loanTypeId`, AND NO LOAN CATEGORY. Registration records who somebody
     * is; what they borrow is decided in the lending workflow, where there is
     * an application to decide it for. Both were carried in this payload as
     * empty strings long after the form stopped showing them, which is how a
     * removed field quietly stays in the contract.
     */
    customerTypeId: "",
    accountTypeId: "",
    /* Superseded by the free-text `workType` / `employmentType` above, and
       still sent so a record captured before the change round-trips. */
    workTypeId: "",
    employmentTypeId: "",
    occupationId: "",
    maritalStatusId: "",
    bankId: "",
    mobileMoneyProviderId: "",
    nickname: "",
    department: "",
    councilNumber: "",
    placeOfEmployment: "",
    retirementDate: "",
    dependentsCount: null,
    basicSalary: null,
    takeHome: null,
    checkNumber: "",
    voterIdNumber: "",
    driverLicenceNumber: "",
    workIdNumber: "",
    cardNumber: "",
    cardExpiryMonth: null,
    cardExpiryYear: null,
    branchId: homeBranchId ?? "",
    customerCategoryId: "",
    dynamicFormData: {},
    bankDetails: null,
    guarantors: [],
    nextOfKin: [],
  };
}

/**
 * The browser copy, rewritten on every keystroke.
 *
 * Kept alongside the server draft rather than replaced by it: between two
 * server saves this is what survives an accidental refresh, and it costs
 * nothing. It is never restored silently — see the wizard's draft banner.
 */
export const WIZARD_DRAFT_STORAGE_KEY = "mikopofasta.customer-wizard-draft.v3";

/**
 * Repairs a draft written by an older shape of this form.
 *
 * A draft is JSON in someone's browser, or a row saved months ago, and the form
 * it was captured from is not the form it is restored into. `JSON.stringify`
 * turns NaN into null and drops undefined; a field that was text then and is a
 * number now comes back as a string; a step that no longer exists leaves keys
 * the schema has since tightened. Applied unrepaired, any of those refuses the
 * save at the very end, naming a field the officer never touched in this
 * sitting.
 *
 * Only the numeric fields are repaired, because they are the ones the schema
 * types as `number | null` and therefore the ones an old string breaks. Empty
 * and unparseable both become null, which is what "the officer has not answered
 * this" has always meant.
 */
export function toRecord(value: unknown): Record<string, string | number | boolean> {
  /*
   * `dynamicFormData` IS A RECORD AND MUST NEVER ARRIVE AS AN ARRAY.
   *
   * It does arrive as one, and the reason is not this application's mistake so
   * much as a place where two type systems disagree. PHP has a single array
   * type; JSON has two containers. An empty record sent to the API decodes to
   * an empty PHP array and comes back encoded as `[]`, so resuming a draft that
   * was saved before any JSON-stored question was answered — the ordinary case,
   * since a well-configured customer type writes most answers to real columns —
   * puts an array where the schema demands a record, and the save is refused
   * with "expected record, received array".
   *
   * The API no longer does that (see JsonRecord and the draft resource), but
   * drafts saved before that fix are still sitting in the database and in
   * browsers, so what comes in is normalised rather than trusted.
   *
   * `typeof [] === "object"` is why the first attempt at this guard let arrays
   * straight through.
   */
  if (value === null || value === undefined || typeof value !== "object") return {};

  if (Array.isArray(value)) {
    /* An empty list is an empty record that lost its shape in transit, and is
       the case that actually occurs. A populated list is data nobody can key
       reliably — unless its entries name their own key, which is the one shape
       worth rescuing rather than discarding somebody's answers. */
    const rescued: Record<string, string | number | boolean> = {};

    for (const entry of value) {
      if (entry === null || typeof entry !== "object") continue;

      const { key, value: held } = entry as { key?: unknown; value?: unknown };

      if (typeof key === "string" && key !== "" && isPrimitive(held)) rescued[key] = held;
    }

    return rescued;
  }

  /* An object, but not necessarily one the schema accepts: a value of the wrong
     type refuses the whole save at the end, naming a field the officer may
     never have seen. Anything that is not a string, number or boolean is
     dropped rather than carried. */
  const clean: Record<string, string | number | boolean> = {};

  for (const [key, held] of Object.entries(value as Record<string, unknown>)) {
    if (isPrimitive(held)) clean[key] = held;
  }

  return clean;
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function repairDraft(values: Partial<WizardValues>): Partial<WizardValues> {
  const numeric: (keyof WizardValues)[] = [
    "basicSalary",
    "takeHome",
    "monthlyIncome",
    "dependentsCount",
    "cardExpiryMonth",
    "cardExpiryYear",
  ];

  const repaired: Record<string, unknown> = { ...values };

  for (const key of numeric) {
    const value = repaired[key];

    if (value === null || value === undefined) continue;

    const parsed = typeof value === "number" ? value : Number(String(value).trim());
    repaired[key] = String(value).trim() === "" || !Number.isFinite(parsed) ? null : parsed;
  }

  repaired.dynamicFormData = toRecord(repaired.dynamicFormData);

  /* Both are arrays in the contract and neither is optional. */
  if (!Array.isArray(repaired.guarantors)) repaired.guarantors = [];
  if (!Array.isArray(repaired.nextOfKin)) repaired.nextOfKin = [];

  return repaired as Partial<WizardValues>;
}
