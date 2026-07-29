import { z } from "zod";
import {
  CUSTOMER_APPROVAL_STATUSES,
  CUSTOMER_CATEGORY_SECTORS,
  CUSTOMER_STATUSES,
  GENDERS,
  KYC_STATUSES,
  MARITAL_STATUSES,
  RESIDENCE_TYPES,
  RISK_TIERS,
} from "@/types/enums";

/** One field in a CustomerCategory's dynamic KYC form (frontend spec §5). */
export const DynamicFormFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "select", "date", "textarea"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});
export type DynamicFormField = z.infer<typeof DynamicFormFieldSchema>;

/**
 * Backend spec §2.3 — drives KYC requirements, risk tier, and (via
 * category_product_eligibility) which loan products a customer may apply
 * for. Deliberately separate from LoanProduct and RepaymentSchedule.
 */
export const CustomerCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  riskTier: z.enum(RISK_TIERS),
  /** Determines whether the registration wizard labels its dynamic step "Employment Details" or "Business Information". */
  sector: z.enum(CUSTOMER_CATEGORY_SECTORS),
  requiredDocuments: z.array(z.string()),
  dynamicFormSchema: z.array(DynamicFormFieldSchema),
  requiresExtraApproval: z.boolean(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
  /** Counted by the API on the index/show routes; absent elsewhere. */
  customerCount: z.number().optional(),
});
export type CustomerCategory = z.infer<typeof CustomerCategorySchema>;

export const CustomerBankDetailsSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  checkNumber: z.string().nullable(),
  phoneNumber: z.string().nullable(),
});
export type CustomerBankDetails = z.infer<typeof CustomerBankDetailsSchema>;

export const CustomerDocumentSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  documentType: z.string(),
  /**
   * A signed, time-limited URL to the API's download route — not a storage
   * path. The route sits outside Sanctum precisely so this can be used as a
   * plain href or <img> src, which a bearer token could not be attached to.
   */
  filePath: z.string(),
  /** The name the file was uploaded under, which is what a download should be called. */
  originalName: z.string().nullable(),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().nullable(),
  uploadedBy: z.string().nullable(),
  createdAt: z.string(),
});
export type CustomerDocument = z.infer<typeof CustomerDocumentSchema>;

/** Whether the browser can render this inline, or should only offer to download it. */
export function isPreviewable(document: Pick<CustomerDocument, "mimeType">): boolean {
  const type = document.mimeType ?? "";
  return type.startsWith("image/") || type === "application/pdf";
}

export const CustomerSchema = z.object({
  id: z.string(),
  customerNumber: z.string(),
  nidaNumber: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  dob: z.string(),
  gender: z.enum(GENDERS),
  phone: z.string(),
  photoPath: z.string().nullable(),
  nidaVerifiedAt: z.string().nullable(),
  otpVerifiedAt: z.string().nullable(),
  faceVerifiedAt: z.string().nullable(),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  regionId: z.string().nullable(),
  districtId: z.string().nullable(),
  wardId: z.string().nullable(),
  streetId: z.string().nullable(),
  residenceType: z.enum(RESIDENCE_TYPES).nullable(),
  customerCategoryId: z.string().nullable(),
  /** Validated against customerCategory.dynamicFormSchema at write time. */
  dynamicFormData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).nullable(),
  branchId: z.string(),
  kycStatus: z.enum(KYC_STATUSES),
  status: z.enum(CUSTOMER_STATUSES),
  /** Only meaningful once KYC is complete and the assigned category has requiresExtraApproval. */
  approvalStatus: z.enum(CUSTOMER_APPROVAL_STATUSES),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type Customer = z.infer<typeof CustomerSchema>;

export function customerFullName(c: Pick<Customer, "firstName" | "middleName" | "lastName">): string {
  return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
}

/**
 * KYC checklist — backend spec §9. All five must be true for kycStatus =
 * 'completed'.
 *
 * The shape only; the evaluation is `GET /customers/{customer}/kyc-status`.
 * It cannot be computed here: `additionalDataComplete` turns on whether a bank
 * record exists, and the API accepts bank details on write without ever
 * returning them.
 */
export interface KycChecklist {
  nidaVerified: boolean;
  otpVerified: boolean;
  faceVerified: boolean;
  additionalDataComplete: boolean;
  categoryAssigned: boolean;
}

export const NidaLookupInputSchema = z.object({
  nidaNumber: z.string().min(10),
});
export type NidaLookupInput = z.infer<typeof NidaLookupInputSchema>;

export const NidaOtpVerifyInputSchema = z.object({
  nidaNumber: z.string().min(10),
  otp: z.string().length(6),
});
export type NidaOtpVerifyInput = z.infer<typeof NidaOtpVerifyInputSchema>;

export const CreateCustomerInputSchema = CustomerSchema.pick({
  firstName: true,
  middleName: true,
  lastName: true,
  dob: true,
  gender: true,
  phone: true,
  nidaNumber: true,
  branchId: true,
}).extend({ middleName: z.string().nullable().optional() });
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

/** Simulated NIDA registry response — backend spec §9 ("NIDA ndiyo source ya truth"). */
export interface NidaLookupResult {
  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string;
  gender: "male" | "female";
}

/** The full Registration Wizard payload, assembled client-side across every step. */
export const RegisterCustomerInputSchema = z.object({
  nidaNumber: z.string().min(10),
  nidaVerifiedAt: z.string(),
  otpVerifiedAt: z.string(),
  faceVerifiedAt: z.string(),
  firstName: z.string().min(1),
  middleName: z.string().nullable(),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  gender: z.enum(GENDERS),
  phone: z.string().min(9),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  regionId: z.string().nullable(),
  districtId: z.string().nullable(),
  wardId: z.string().nullable(),
  streetId: z.string().nullable(),
  residenceType: z.enum(RESIDENCE_TYPES).nullable(),
  branchId: z.string(),
  customerCategoryId: z.string(),
  dynamicFormData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  bankDetails: z
    .object({ bankName: z.string(), accountNumber: z.string(), accountName: z.string(), phoneNumber: z.string().nullable() })
    .nullable(),
  guarantors: z.array(
    z.object({ name: z.string(), phone: z.string(), nidaNumber: z.string().nullable(), relationship: z.string(), address: z.string().nullable(), occupation: z.string().nullable() })
  ),
  nextOfKin: z.array(z.object({ name: z.string(), relationship: z.string(), phone: z.string(), address: z.string().nullable() })),
});
export type RegisterCustomerInput = z.infer<typeof RegisterCustomerInputSchema>;

export function needsApproval(category: Pick<CustomerCategory, "requiresExtraApproval">): boolean {
  return category.requiresExtraApproval;
}
