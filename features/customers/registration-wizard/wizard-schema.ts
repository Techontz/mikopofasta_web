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

  /**
   * WHICH ACCOUNT THE MONEY MOVES THROUGH — the MNO/Bank switch on step two.
   *
   * A form field rather than component state, for the same reason every other
   * answer is one: step two unmounts the moment the officer steps back to step
   * one, and a choice held in `useState` would be forgotten by the time they
   * returned — taking with it the reason half the payment boxes were on screen.
   *
   * IT IS NOT PART OF THE PAYLOAD, and it is the only field here that is not.
   * The API records a bank account and a wallet; it has no opinion about which
   * one an officer meant to capture. This exists so the other kind's boxes are
   * not on screen to be half-answered — see `registerCustomerRequest`, which
   * names every payload field explicitly and does not name this one.
   */
  paymentMethod: z.enum(["none", "mno", "bank"]),
});
export type WizardValues = z.infer<typeof WizardSchema>;

/**
 * Three steps. The registration workflow, not a form split into pages.
 *
 *     Basic Information → Customer Details → KYC & Documents
 *
 * WHAT SHAPES STEP TWO IS ANSWERED ON STEP ONE. Customer Type is asked with the
 * rest of the basic details, because it is the first thing an officer knows
 * about the person in front of them and because everything step two asks is
 * that answer's consequence: a salaried customer is asked about their employer,
 * a trader about their business, a type configured tomorrow about whatever its
 * registration form declares. It used to be asked at the top of step two, which
 * meant step two opened on a blank card with a dropdown in it and no way to
 * know what was coming. Nothing in this directory names a customer type.
 *
 * STEP ONE IS WHO THEY ARE — names, gender, date of birth, the numbers they can
 * be reached on, nationality, dependants, where they live (Region → District →
 * Ward, chosen from the register), and who to call when they cannot be reached.
 * NEXT OF KIN IS HERE, not somewhere the officer discovers after registering:
 * it is an emergency contact, which is basic information about a person in
 * every sense except where an older version of this form happened to put it.
 *
 * STEP TWO IS WHAT THEY DO AND WHERE THE MONEY GOES — the customer type's own
 * questions, and one payment block that is either a mobile wallet or a bank
 * account and never both.
 *
 * STEP THREE IS THE FILE. One KYC section, and the Save that creates the
 * customer.
 *
 * SAVE IS NOT FINALISE.
 *
 *     save on step 3   →  customer exists, "Awaiting face verification"
 *     face scan passes →  KYC complete
 *
 * FACE VERIFICATION IS NOT A FOURTH STEP, and was one. A step is somewhere the
 * officer must go; this is a biometric check performed AGAINST the record step
 * three creates, by whoever has the customer in front of them, on whatever
 * device has a camera — legitimately a day later. Numbering it made a save and
 * a scan look like two halves of one button press and made an interruption look
 * like a failure. It now appears on step three once the record exists, where
 * the officer can run it or leave: the customer is in the book either way,
 * findable, and their profile offers the same scan. Nothing here may declare
 * KYC complete — `KycEvaluator` decides that from what is actually on file.
 *
 * WHAT EACH STEP REQUIRES STILL COMES FROM THE ACCOUNT TYPE. `profile` is a row
 * from `account_type_requirements`, read from the API, and the same row is what
 * `RegisterCustomerRequest` validates against and what `KycEvaluator` judges
 * completeness by. The wizard is not a second opinion about the rules — it is
 * an earlier report of the same ones.
 */
export const WIZARD_STEPS = [
  { id: "basic", label: "Basic Information" },
  { id: "details", label: "Customer Details" },
  { id: "documents", label: "KYC Attachments" },
  { id: "face", label: "Face Verification" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/**
 * The step at which the customer record is created — the third of four.
 * Everything before it is a draft.
 *
 * FACE VERIFICATION IS THE FOURTH STEP, and it is reached only by completing
 * this one. That ordering is not presentational: the scan is a biometric check
 * against a customer who must already exist, so it cannot run until the record
 * has been written. The wizard therefore cannot jump to it, and `goNext` stops
 * here — the save is what opens it.
 */
export const SAVE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "documents");

/** The compulsory last step, available only once the save above has run. */
export const FACE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "face");

/**
 * Fields validated (via RHF trigger) before allowing "Next" past each step.
 *
 * Only what the step actually SHOWS. A field validated on a step that does not
 * render it produces a Next button that refuses to advance and highlights
 * nothing — which is precisely how this list gets out of date, so it is short
 * on purpose.
 *
 * Step two names almost none of its fields, and cannot: they are whatever the
 * chosen customer type declares. They are validated against that configuration
 * instead — see `missingDynamicAnswers`.
 */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardValues)[]> = {
  basic: [
    "firstName",
    "lastName",
    "dob",
    "gender",
    "branchId",
    "phone",
    "maritalStatusId",
    /* Asked here now, and so checked here. The customer type decides the whole
       of step two; letting the officer walk past it would open step two on a
       shape nobody had chosen. */
    "customerCategoryId",
    "nextOfKin",
  ],
  details: ["guarantors"],
  /* Nothing validated by the form: whether the documents are mandatory is the
     account type's answer, given by the API, and enforcing it here would let
     the two disagree. The identity document is the exception and is checked at
     Save, because it decides whether a customer is created at all. */
  documents: [],
  /* Nothing on the form either: by the time this step is reached the customer
     exists and the wizard's values have already been written. What it asks for
     is a live camera, which no field can hold. */
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
  /* Asked on step one, so a message about it must route to step one — this set
     is what `stepOwning` reads, and it is hand-written rather than derived from
     STEP_FIELDS, so adding a field to one without the other sends the officer
     to the wrong screen looking for a control that is not there. */
  "maritalStatusId",
  "maritalStatus",
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
  /* Chosen from the register again, so a rejection on either lands on the
     control the officer chose it in rather than on a box that is gone. */
  "wardId",
  "wardName",
  "streetId",
  "streetName",
  "residenceType",
  /* The rest of the basic block: the other ways to reach somebody, who they
     are to the state, and who depends on them. */
  "nickname",
  "alternativePhone",
  "email",
  "nationality",
  "dependentsCount",
  /* Asked on step one because it decides the whole of step two. */
  "customerCategoryId",
  /* Collected with the basic details rather than found later on the profile. */
  "nextOfKin",
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
  /* The MNO/Bank switch and the two boxes the API reads out of `bankDetails`
     rather than off the top level — neither is a structured target, so neither
     is named by the shared map `describeField` falls back to. */
  paymentMethod: "Payment account",
  accountName: "Account name",
  accountNumber: "Account number",
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
   * Marital status is asked on step one, so the rule is checked on step one.
   *
   * It used to be enforced against step two while no step drew the field at
   * all: an account type with `requiresMaritalStatus` refused to advance and
   * highlighted nothing, because the message was attached to an input that did
   * not exist. That is the failure the note above STEP_FIELDS describes, and it
   * is the reason the identity rule sits where it does.
   *
   * ONE FACT, TWO COLUMNS. `maritalStatusId` is the admin-managed list the form
   * now offers; `maritalStatus` is the older enum some records still carry. A
   * customer answered either way has answered, so a record created before the
   * list existed is not asked again.
   */
  if (step === "basic" && profile.requiresMaritalStatus) {
    if (!filled(values.maritalStatusId) && !values.maritalStatus) {
      errors.maritalStatusId = "Marital status is required for this account type.";
    }
  }

  /*
   * The customer type is asked on step ONE, so the rule is checked on step one.
   *
   * It decides the entire content of step two. Enforcing it from step two would
   * mean refusing to advance from the screen the officer has already left, and
   * sending them back a page to answer a question nothing had stopped them on —
   * the same failure the note above STEP_FIELDS describes, one step later.
   *
   * The rule itself is the account type's and the wording is the API's. When
   * the account type does not demand a customer type the officer may continue
   * without one, and step one says so rather than inventing a requirement the
   * server does not have.
   */
  if (step === "basic" && profile.requiresCustomerCategory && !filled(values.customerCategoryId)) {
    errors.customerCategoryId =
      "A customer type is required for this account type — it decides which loan products the customer may take.";
  }

  /* Next of kin is collected with the basic details, so it is judged where the
     officer can see the list and add to it. */
  if (step === "basic" && values.nextOfKin.length < profile.minNextOfKin) {
    errors.nextOfKin = `At least ${profile.minNextOfKin} next of kin ${
      profile.minNextOfKin === 1 ? "is" : "are"
    } required for this account type.`;
  }

  if (step === "details") {
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

    /*
     * WHERE THE MONEY GOES — one account, of one kind, complete.
     *
     * The API wants a bank account OR a mobile wallet and is indifferent to
     * which (RegisterCustomerRequest::checkBankAccount). The form asks the
     * officer to say which they are capturing so the other kind's boxes are
     * not on screen to be half-answered — and then holds them to that answer,
     * because a bank chosen with no account number arrives at the API as no
     * account at all, and the officer would learn that only at Save, on a
     * screen showing a bank name they had certainly filled in.
     */
    if (values.paymentMethod === "mno") {
      if (!filled(values.mobileMoneyProviderId)) {
        errors.mobileMoneyProviderId = "Choose the mobile money provider.";
      }
      if (!filled(values.walletNumber)) {
        errors.walletNumber = "Enter the number the wallet is registered on.";
      }
    }

    if (values.paymentMethod === "bank") {
      if (!filled(values.bankId)) errors.bankId = "Choose the bank.";
      if (!filled(values.accountName)) errors.accountName = "Enter the name the account is held in.";
      if (!filled(values.accountNumber)) errors.accountNumber = "Enter the account number.";
    }

    /* The account type's own rule, in the API's words. Reported against the
       chooser rather than against a box that is not on screen until one of the
       two has been picked. */
    if (profile.requiresBankAccount && values.paymentMethod === "none") {
      errors.paymentMethod =
        "A bank account or a mobile money wallet number is required for this account type.";
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

    /*
     * The payment block, empty and of no kind yet.
     *
     * `bankName` and `accountNumber` are bound to inputs on step two and were
     * missing from these defaults entirely — optional in the schema, so nothing
     * complained, but an <input> given `undefined` is uncontrolled and React
     * warns the first time somebody types in it. They are sent to the API
     * inside `bankDetails`, which step two's save assembles from them; the
     * top-level copies are deliberately not sent (see registerCustomerRequest).
     */
    bankName: "",
    bankBranch: "",
    accountName: "",
    accountNumber: "",
    mobileMoneyProvider: "",
    walletNumber: "",
    paymentMethod: "none",

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
/*
 * v4: three steps instead of four, and `step` therefore means something
 * different. A v3 draft saved on the old step 3 (face verification) would
 * restore onto the new step 3 (KYC & Documents) and offer a Save for a customer
 * who already exists. `repairDraft` clamps the index and fills the new field,
 * but the key is bumped as well so nothing depends on that being right.
 */
export const WIZARD_DRAFT_STORAGE_KEY = "mikopofasta.customer-wizard-draft.v4";

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

  /*
   * The MNO/Bank switch, which a draft saved before it existed does not carry —
   * and `z.enum` refuses undefined, so the whole save would be refused over a
   * field the officer never saw.
   *
   * Inferred from what the draft actually holds rather than reset to "none":
   * a resumed registration that already has a wallet number should come back
   * showing the wallet, not an unanswered question above boxes with answers in
   * them. The bank is recognised by its account number for the same reason the
   * API does — it is the one part of a bank account that means nothing is
   * missing.
   */
  if (repaired.paymentMethod !== "mno" && repaired.paymentMethod !== "bank" && repaired.paymentMethod !== "none") {
    const held = (name: string) => {
      const value = repaired[name];
      return typeof value === "string" && value.trim() !== "";
    };

    repaired.paymentMethod = held("walletNumber") || held("mobileMoneyProviderId")
      ? "mno"
      : held("accountNumber") || held("bankId")
        ? "bank"
        : "none";
  }

  return repaired as Partial<WizardValues>;
}
