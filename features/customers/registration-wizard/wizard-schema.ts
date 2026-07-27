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
});
export type WizardValues = z.infer<typeof WizardSchema>;

export const WIZARD_STEPS = [
  { id: "personal", label: "Personal Details" },
  { id: "contact", label: "Contact Details" },
  { id: "address", label: "Address" },
  { id: "category-data", label: "Employment / Business" },
  { id: "guarantors", label: "Guarantors" },
  { id: "next-of-kin", label: "Next of Kin" },
  { id: "review", label: "Review & Submit" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Fields validated (via RHF trigger) before allowing "Next" past each step. */
export const STEP_FIELDS: Record<WizardStepId, (keyof WizardValues)[]> = {
  personal: ["nidaNumber", "firstName", "lastName", "dob", "gender", "maritalStatus", "branchId", "customerCategoryId"],
  contact: ["phone"],
  address: ["regionId", "residenceType"],
  "category-data": ["dynamicFormData"],
  guarantors: ["guarantors"],
  "next-of-kin": ["nextOfKin"],
  review: [],
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
    branchId: homeBranchId ?? "",
    customerCategoryId: "",
    dynamicFormData: {},
    bankDetails: null,
    guarantors: [],
    nextOfKin: [],
  };
}

export const WIZARD_DRAFT_STORAGE_KEY = "mikopofasta.customer-wizard-draft";
