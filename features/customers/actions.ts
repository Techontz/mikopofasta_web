"use server";

import { revalidatePath } from "next/cache";
import {
  NidaLookupInputSchema,
  NidaOtpVerifyInputSchema,
  RegisterCustomerInputSchema,
  needsApproval,
  type NidaLookupResult,
  type RegisterCustomerInput,
} from "@/types/customer";
import { CreateCustomerNoteInputSchema } from "@/types/customer-note";
import { CreateGuarantorInputSchema } from "@/types/guarantor";
import { CreateNextOfKinInputSchema } from "@/types/next-of-kin";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { MOCK_CUSTOMER_BANK_DETAILS } from "@/lib/mock-data/customer-bank-details";
import { MOCK_CUSTOMER_DOCUMENTS } from "@/lib/mock-data/customer-documents";
import { MOCK_CUSTOMER_NOTES } from "@/lib/mock-data/customer-notes";
import { MOCK_GUARANTORS } from "@/lib/mock-data/guarantors";
import { MOCK_NEXT_OF_KIN } from "@/lib/mock-data/next-of-kin";
import { MOCK_ACCOUNT_FREEZES } from "@/lib/mock-data/account-freezes";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { AUDIT_ACTIONS } from "@/types/audit";
import { simulateNidaLookup, MOCK_OTP } from "@/lib/domain/nida-simulator";
import { customerNumber as formatCustomerNumber } from "@/lib/domain/id-generators";
import { nextId } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

async function requireManagePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

async function requireApprovePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.CUSTOMERS_APPROVE)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

function logCustomerAudit(action: string, customerId: string, userId: string | null): void {
  MOCK_AUDIT_LOGS.push({
    id: nextId("audit"),
    userId,
    action,
    auditableType: "customer",
    auditableId: customerId,
    beforeJson: null,
    afterJson: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  });
}

/** Step 1 of the wizard's identity flow — backend spec §9/§15.1. */
export async function lookupNida(input: unknown): Promise<ActionResult & { data?: NidaLookupResult }> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = NidaLookupInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid NIDA number." };

  if (MOCK_CUSTOMERS.some((c) => c.nidaNumber === parsed.data.nidaNumber && c.deletedAt === null)) {
    return { ok: false, message: "A customer with this NIDA number is already registered." };
  }

  const data = simulateNidaLookup(parsed.data.nidaNumber);
  return { ok: true, message: `OTP sent. (Demo OTP: ${MOCK_OTP})`, data };
}

export async function verifyNidaOtp(input: unknown): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = NidaOtpVerifyInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  if (parsed.data.otp !== MOCK_OTP) {
    return { ok: false, message: "Incorrect OTP. Please try again." };
  }
  return { ok: true, message: "NIDA identity verified." };
}

export async function registerCustomer(input: RegisterCustomerInput): Promise<ActionResult & { customerId?: string }> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = RegisterCustomerInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  const values = parsed.data;

  const category = MOCK_CUSTOMER_CATEGORIES.find((c) => c.id === values.customerCategoryId && c.deletedAt === null);
  if (!category) return { ok: false, message: "Selected customer category was not found." };

  if (MOCK_CUSTOMERS.some((c) => c.nidaNumber === values.nidaNumber && c.deletedAt === null)) {
    return { ok: false, message: "A customer with this NIDA number is already registered." };
  }

  const actor = await getCurrentUser();
  const sequence = MOCK_CUSTOMERS.length + 1;
  const customerId = nextId("cust");
  const nowDate = new Date().toISOString().slice(0, 10);
  const requiresApproval = needsApproval(category);

  MOCK_CUSTOMERS.push({
    id: customerId,
    customerNumber: formatCustomerNumber(sequence),
    nidaNumber: values.nidaNumber,
    firstName: values.firstName,
    middleName: values.middleName,
    lastName: values.lastName,
    dob: values.dob,
    gender: values.gender,
    phone: values.phone,
    photoPath: null,
    nidaVerifiedAt: values.nidaVerifiedAt,
    otpVerifiedAt: values.otpVerifiedAt,
    faceVerifiedAt: values.faceVerifiedAt,
    maritalStatus: values.maritalStatus,
    regionId: values.regionId,
    districtId: values.districtId,
    wardId: values.wardId,
    streetId: values.streetId,
    residenceType: values.residenceType,
    customerCategoryId: values.customerCategoryId,
    dynamicFormData: values.dynamicFormData,
    branchId: values.branchId,
    kycStatus: "completed",
    status: "active",
    approvalStatus: requiresApproval ? "pending" : "not_required",
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdBy: actor?.id ?? null,
    createdAt: nowDate,
    deletedAt: null,
  });

  if (values.bankDetails) {
    MOCK_CUSTOMER_BANK_DETAILS.push({
      id: nextId("cbd"),
      customerId,
      bankName: values.bankDetails.bankName,
      accountNumber: values.bankDetails.accountNumber,
      accountName: values.bankDetails.accountName,
      checkNumber: null,
      phoneNumber: values.bankDetails.phoneNumber,
    });
  }

  for (const guarantor of values.guarantors) {
    const parsedGuarantor = CreateGuarantorInputSchema.safeParse(guarantor);
    if (!parsedGuarantor.success) continue;
    MOCK_GUARANTORS.push({ id: nextId("guar"), customerId, createdAt: nowDate, ...parsedGuarantor.data });
  }

  for (const kin of values.nextOfKin) {
    const parsedKin = CreateNextOfKinInputSchema.safeParse(kin);
    if (!parsedKin.success) continue;
    MOCK_NEXT_OF_KIN.push({ id: nextId("nok"), customerId, createdAt: nowDate, ...parsedKin.data });
  }

  logCustomerAudit(AUDIT_ACTIONS.CUSTOMER_REGISTERED, customerId, actor?.id ?? null);
  revalidatePath("/customers");
  return {
    ok: true,
    message: requiresApproval ? "Customer registered — pending approval before loan eligibility." : "Customer registered successfully.",
    customerId,
  };
}

export async function addGuarantor(customerId: string, input: unknown): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = CreateGuarantorInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  MOCK_GUARANTORS.push({ id: nextId("guar"), customerId, createdAt: new Date().toISOString().slice(0, 10), ...parsed.data });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Guarantor added." };
}

export async function removeGuarantor(guarantorId: string, customerId: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const index = MOCK_GUARANTORS.findIndex((g) => g.id === guarantorId);
  if (index < 0) return { ok: false, message: "Guarantor not found." };
  MOCK_GUARANTORS.splice(index, 1);
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Guarantor removed." };
}

export async function addNextOfKin(customerId: string, input: unknown): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = CreateNextOfKinInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  MOCK_NEXT_OF_KIN.push({ id: nextId("nok"), customerId, createdAt: new Date().toISOString().slice(0, 10), ...parsed.data });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Next of kin added." };
}

export async function removeNextOfKin(id: string, customerId: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const index = MOCK_NEXT_OF_KIN.findIndex((k) => k.id === id);
  if (index < 0) return { ok: false, message: "Record not found." };
  MOCK_NEXT_OF_KIN.splice(index, 1);
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Next of kin removed." };
}

export async function addCustomerNote(input: unknown): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const parsed = CreateCustomerNoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const actor = await getCurrentUser();
  MOCK_CUSTOMER_NOTES.push({
    id: nextId("note"),
    customerId: parsed.data.customerId,
    authorId: actor?.id ?? "unknown",
    note: parsed.data.note,
    createdAt: new Date().toISOString(),
  });
  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true, message: "Note added." };
}

export async function uploadCustomerDocument(customerId: string, documentType: string, fileName: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  if (!documentType.trim()) return { ok: false, message: "Document type is required." };

  const actor = await getCurrentUser();
  MOCK_CUSTOMER_DOCUMENTS.push({
    id: nextId("doc"),
    customerId,
    documentType,
    filePath: `/mock-documents/${customerId}/${fileName}`,
    uploadedBy: actor?.id ?? null,
    createdAt: new Date().toISOString(),
  });
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Document uploaded." };
}

export async function removeCustomerDocument(id: string, customerId: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const index = MOCK_CUSTOMER_DOCUMENTS.findIndex((d) => d.id === id);
  if (index < 0) return { ok: false, message: "Document not found." };
  MOCK_CUSTOMER_DOCUMENTS.splice(index, 1);
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Document removed." };
}

export async function approveCustomer(customerId: string): Promise<ActionResult> {
  const denied = await requireApprovePermission();
  if (denied) return denied;
  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return { ok: false, message: "Customer not found." };
  if (customer.approvalStatus !== "pending") return { ok: false, message: "This customer is not awaiting approval." };

  const actor = await getCurrentUser();
  customer.approvalStatus = "approved";
  customer.approvedBy = actor?.id ?? null;
  customer.approvedAt = new Date().toISOString();
  customer.rejectionReason = null;
  logCustomerAudit(AUDIT_ACTIONS.CUSTOMER_APPROVED, customerId, actor?.id ?? null);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer approved." };
}

export async function rejectCustomer(customerId: string, reason: string): Promise<ActionResult> {
  const denied = await requireApprovePermission();
  if (denied) return denied;
  if (!reason.trim()) return { ok: false, message: "A rejection reason is required." };
  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return { ok: false, message: "Customer not found." };
  if (customer.approvalStatus !== "pending") return { ok: false, message: "This customer is not awaiting approval." };

  const actor = await getCurrentUser();
  customer.approvalStatus = "rejected";
  customer.approvedBy = actor?.id ?? null;
  customer.approvedAt = new Date().toISOString();
  customer.rejectionReason = reason;
  logCustomerAudit(AUDIT_ACTIONS.CUSTOMER_REJECTED, customerId, actor?.id ?? null);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer registration rejected." };
}

export async function freezeCustomer(customerId: string, reason: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  if (!reason.trim()) return { ok: false, message: "A reason is required to freeze this account." };
  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return { ok: false, message: "Customer not found." };
  if (customer.status === "frozen") return { ok: false, message: "Customer is already frozen." };

  const actor = await getCurrentUser();
  customer.status = "frozen";
  MOCK_ACCOUNT_FREEZES.push({
    id: nextId("freeze"),
    freezableType: "customer",
    freezableId: customerId,
    reason,
    frozenBy: actor?.id ?? "unknown",
    frozenAt: new Date().toISOString(),
    unfrozenBy: null,
    unfrozenAt: null,
  });
  logCustomerAudit(AUDIT_ACTIONS.CUSTOMER_FROZEN, customerId, actor?.id ?? null);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer account frozen." };
}

export async function unfreezeCustomer(customerId: string): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return { ok: false, message: "Customer not found." };
  if (customer.status !== "frozen") return { ok: false, message: "Customer is not frozen." };

  const actor = await getCurrentUser();
  customer.status = "active";
  const openFreeze = MOCK_ACCOUNT_FREEZES.find((f) => f.freezableType === "customer" && f.freezableId === customerId && f.unfrozenAt === null);
  if (openFreeze) {
    openFreeze.unfrozenBy = actor?.id ?? "unknown";
    openFreeze.unfrozenAt = new Date().toISOString();
  }
  logCustomerAudit(AUDIT_ACTIONS.CUSTOMER_UNFROZEN, customerId, actor?.id ?? null);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer account unfrozen." };
}

export async function setCustomerActiveStatus(customerId: string, active: boolean): Promise<ActionResult> {
  const denied = await requireManagePermission();
  if (denied) return denied;
  const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
  if (!customer) return { ok: false, message: "Customer not found." };
  if (customer.status === "frozen") return { ok: false, message: "Unfreeze the account before changing its status." };

  const actor = await getCurrentUser();
  customer.status = active ? "active" : "suspended";
  logCustomerAudit(active ? AUDIT_ACTIONS.CUSTOMER_REACTIVATED : AUDIT_ACTIONS.CUSTOMER_SUSPENDED, customerId, actor?.id ?? null);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: active ? "Customer reactivated." : "Customer suspended." };
}
