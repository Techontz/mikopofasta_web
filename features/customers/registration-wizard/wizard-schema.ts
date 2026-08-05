import { z } from "zod";
import { RegisterCustomerInputSchema } from "@/types/customer";

/**
 * Same shape as the final submission payload minus the three verification
 * timestamps — those live in wizard-only local state (not a form field,
 * they're a side effect of the NIDA/OTP/face steps) and get attached right
 * before calling registerCustomer().
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
   * learned that after filling three steps and pressing Submit — and the
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
 * Three steps, which is what the system being replaced has.
 *
 * This wizard used to have seven — Personal, Contact, Address, Employment,
 * Guarantors, Next of Kin, Review. Every one of them held three or four fields,
 * so registering a customer meant six Next clicks through mostly-empty screens,
 * and an officer could not see the identity they had just verified while typing
 * the address that belongs to it.
 *
 * The legacy form groups the same fields into Basic Information, Additional
 * Details, and Passport & Bank Details, and that grouping is better for the
 * work: everything you need in front of the customer is on step one, everything
 * you ask them about is on step two, and the paperwork is on step three.
 *
 * NOTHING WAS REMOVED. The seven step components still exist and still own
 * their own fields and validation; they are composed into three pages rather
 * than paged through one at a time. NIDA, OTP, face capture, the address
 * cascade, the dynamic category form, guarantors, next of kin, the bank block
 * and the review summary are all still here.
 */
export const WIZARD_STEPS = [
  { id: "basic", label: "Basic Information" },
  { id: "additional", label: "Additional Details" },
  { id: "passport-bank", label: "Passport & Bank Details" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/**
 * Fields validated (via RHF trigger) before allowing "Next" past each step.
 *
 * The union of what the old per-step lists checked, regrouped. A field is
 * validated on the step that now shows it, so nothing is checked before the
 * officer has had a chance to fill it.
 */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardValues)[]> = {
  /*
   * Only what the step actually shows. `maritalStatus` and `customerCategoryId`
   * were validated on step 1 and are not on it — marital status moved to step 2
   * as the legacy form has it, and category is not on the legacy form at all —
   * so Next refused to advance over fields the officer could not see or fill.
   */
  basic: ["firstName", "lastName", "dob", "gender", "branchId", "phone", "regionId"],
  additional: ["guarantors", "nextOfKin"],
  "passport-bank": [],
};

export function defaultWizardValues(homeBranchId: string | null): WizardValues {
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
    wardId: null,
    streetId: null,
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
    businessName: "",
    businessType: "",
    businessAddress: "",
    bankBranch: "",
    mobileMoneyProvider: "",
    walletNumber: "",

    // Legacy registration form. Empty strings for text/select ids (bound to
    // inputs), null for numbers so an untouched box is absent rather than 0.
    employeeId: "",
    loanTypeId: "",
    customerTypeId: "",
    accountTypeId: "",
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

export const WIZARD_DRAFT_STORAGE_KEY = "mikopofasta.customer-wizard-draft";
