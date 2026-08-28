import { z } from "zod";
import { RegisterCustomerInputSchema } from "@/types/customer";
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
 * Six steps — the KYC workflow, not a form split into pages.
 *
 * The three it replaces (Basic Information → Additional Details → Passport &
 * Bank Details) were the legacy screen's grouping, and they had two problems
 * that no amount of regrouping could fix:
 *
 *   1. Face verification was BURIED IN STEP 3, beside the bank card fields,
 *      and the form refused to submit without it. A registration could
 *      therefore only ever be completed at a desk with a working camera, in
 *      one sitting, with the customer still present. There was no way to take
 *      down someone's details and verify their face afterwards — which is how
 *      the work actually happens.
 *
 *   2. Nothing could be saved part-way. An interrupted registration was lost.
 *
 * So face verification is now step six, it is the LAST step, and it is
 * OPTIONAL AT THIS POINT: the customer is created at step five, and the scan
 * can be run then, or an hour later from a phone, by whoever has the customer
 * in front of them. See `FaceVerificationStep` and the profile's own panel,
 * which is the same capability reached from the other direction.
 *
 * Steps 2, 3 and 4 vary by Account Type. Which fields they require — and
 * whether some of them appear at all — comes from
 * `account_type_requirements`, read from the API. Nothing about that is
 * decided in this file.
 */
export const WIZARD_STEPS = [
  { id: "basic", label: "Basic Information" },
  { id: "personal", label: "Category & Details" },
  { id: "identity", label: "Identity" },
  /*
   * The documents the CATEGORY requires, one slot each. Its own step because
   * a public servant produces five of them and the identity step had room for
   * one, labelled "Optional" — so the requirement was unmeetable by
   * construction. Placed after identity and before the bank details, which is
   * the order the paper file is assembled in.
   */
  { id: "documents", label: "Required Documents" },
  { id: "bank", label: "Bank & Account" },
  { id: "review", label: "Review & Save" },
  { id: "face", label: "Face Verification" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** The step at which the customer record is created. Everything before it is a draft. */
export const SAVE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "review");
export const FACE_STEP_INDEX = WIZARD_STEPS.findIndex((s) => s.id === "face");

/**
 * Fields validated (via RHF trigger) before allowing "Next" past each step.
 *
 * Only what the step actually SHOWS. A field validated on a step that does not
 * render it produces a Next button that refuses to advance and highlights
 * nothing — the bug the three-step version had, where marital status and
 * category were checked on step one and lived on step two.
 */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardValues)[]> = {
  basic: ["firstName", "lastName", "dob", "gender", "branchId", "phone"],
  personal: ["guarantors", "nextOfKin"],
  identity: [],
  /* Nothing validated by the form: whether the documents are mandatory is the
     account type's answer, given by the API, and enforcing it here would let
     the two disagree. */
  documents: [],
  bank: [],
  review: [],
  face: [],
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

  if (step === "personal") {
    if (profile.requiresMaritalStatus && !filled(values.maritalStatusId) && !values.maritalStatus) {
      errors.maritalStatusId = "Marital status is required for this account type.";
    }

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

    if (profile.requiresCustomerCategory && !filled(values.customerCategoryId)) {
      errors.customerCategoryId =
        "A customer category is required for this account type — it decides which loan products the customer may take.";
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

  if (step === "identity" && profile.requiresIdentityDocument) {
    const documents = [
      values.nidaNumber,
      values.nationalIdNumber,
      values.voterIdNumber,
      values.driverLicenceNumber,
      values.passportNumber,
      values.workIdNumber,
    ];
    if (!documents.some(filled)) {
      errors.nationalIdNumber =
        "At least one identity document is required — National ID, voter ID, driving licence, passport or work ID.";
    }
  }

  if (step === "bank") {
    if (profile.requiresBankAccount) {
      const hasBank = filled(values.bankDetails?.accountNumber);
      if (!hasBank && !filled(values.walletNumber)) {
        errors["bankDetails.accountNumber"] =
          "A bank account or a mobile money wallet number is required for this account type.";
      }
    }
    if (profile.requiresCardDetails && !filled(values.cardNumber)) {
      errors.cardNumber = "Card details are required for this account type.";
    }
  }

  return errors;
}

/**
 * Which steps a profile makes relevant.
 *
 * A step is never HIDDEN for holding an optional field — hiding the bank step
 * from a savings customer who does happen to have an account would lose real
 * information. What varies is whether the step announces itself as required,
 * which is what `requiredSteps` drives in the stepper.
 */
export function requiredSteps(profile: AccountTypeRequirementProfile): Set<WizardStepId> {
  const required = new Set<WizardStepId>(["basic", "review"]);

  if (
    profile.requiresEmploymentDetails ||
    profile.requiresBusinessDetails ||
    profile.requiresMaritalStatus ||
    profile.requiresCustomerCategory ||
    profile.minGuarantors > 0 ||
    profile.minNextOfKin > 0
  ) {
    required.add("personal");
  }

  if (profile.requiresIdentityDocument) required.add("identity");
  if (profile.requiresBankAccount || profile.requiresCardDetails) required.add("bank");
  if (profile.requiresFaceVerification) required.add("face");

  return required;
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
    loanTypeId: "",
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
export const WIZARD_DRAFT_STORAGE_KEY = "mikopofasta.customer-wizard-draft";
