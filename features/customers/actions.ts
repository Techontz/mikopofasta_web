"use server";

import { revalidatePath } from "next/cache";
import { NidaLookupInputSchema, NidaOtpVerifyInputSchema, type NidaLookupResult, type RegisterCustomerInput } from "@/types/customer";
import { CreateCustomerNoteInputSchema } from "@/types/customer-note";
import { CreateGuarantorInputSchema } from "@/types/guarantor";
import { CreateNextOfKinInputSchema } from "@/types/next-of-kin";
import {
  approveCustomerRequest,
  createCustomerNoteRequest,
  createGuarantorRequest,
  createNextOfKinRequest,
  deleteCustomerDocumentRequest,
  deleteGuarantorRequest,
  deleteNextOfKinRequest,
  faceVerifyRequest,
  freezeCustomerRequest,
  nidaLookupRequest,
  nidaOtpVerifyRequest,
  registerCustomerRequest,
  rejectCustomerRequest,
  setCustomerStatusRequest,
  unfreezeCustomerRequest,
  uploadCustomerDocumentRequest,
} from "@/lib/api/customers";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Customers & KYC — the write half of backend §15.1.
 *
 * Every rule these functions used to re-implement against in-memory arrays now
 * lives where it belongs:
 *
 *   - `customers.manage` / `customers.approve` are checked by the API, which
 *     also applies §13 branch scoping — a check here could only ever be a
 *     second opinion, and a stale one.
 *   - "already registered with this NIDA number" is a 409 raised at lookup
 *     time, so the officer is stopped on step one rather than after seven.
 *   - "not awaiting approval", "already frozen" and the KYC recomputation that
 *     follows every change are the API's, which can see the whole record.
 *
 * The UI contract is unchanged: the same ActionResult, the same toasts, the
 * same redirects.
 */

/** Step 1 of the wizard's identity flow — backend §9/§15.1. */
export async function lookupNida(input: unknown): Promise<ActionResult & { data?: NidaLookupResult }> {
  const parsed = NidaLookupInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid NIDA number." };

  try {
    const result = await nidaLookupRequest(parsed.data.nidaNumber);
    return {
      ok: true,
      message: "Identity found. An OTP has been sent to the customer's registered number.",
      data: result.customerDraft,
    };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

/**
 * Returns the API's own `verifiedAt` rather than a locally-stamped time: it is
 * the value the registration payload is validated against, and the browser's
 * clock is not the one the server trusts.
 */
export async function verifyNidaOtp(input: unknown): Promise<ActionResult & { verifiedAt?: string }> {
  const parsed = NidaOtpVerifyInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const result = await nidaOtpVerifyRequest(parsed.data.nidaNumber, parsed.data.otp);
    return { ok: true, message: "NIDA identity verified.", verifiedAt: result.verifiedAt };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

export async function registerCustomer(
  input: RegisterCustomerInput
): Promise<ActionResult & { customerId?: string }> {
  let customer;

  try {
    customer = await registerCustomerRequest(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/customers");
  return {
    ok: true,
    message:
      customer.approvalStatus === "pending"
        ? "Customer registered — pending approval before loan eligibility."
        : "Customer registered successfully.",
    customerId: customer.id,
  };
}

/**
 * POST /customers/{customer}/face-verify — a real liveness image, which also
 * becomes the customer's photo. Takes FormData because a File only survives the
 * Server Action boundary inside one.
 */
export async function verifyCustomerFace(customerId: string, formData: FormData): Promise<ActionResult> {
  const capture = formData.get("capture");
  if (!(capture instanceof File) || capture.size === 0) {
    return { ok: false, message: "Select a capture to verify." };
  }

  try {
    await faceVerifyRequest(customerId, capture);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Face liveness verified." };
}

export async function addGuarantor(customerId: string, input: unknown): Promise<ActionResult> {
  const parsed = CreateGuarantorInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createGuarantorRequest(customerId, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Guarantor added." };
}

export async function removeGuarantor(guarantorId: string, customerId: string): Promise<ActionResult> {
  try {
    await deleteGuarantorRequest(customerId, guarantorId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Guarantor removed." };
}

export async function addNextOfKin(customerId: string, input: unknown): Promise<ActionResult> {
  const parsed = CreateNextOfKinInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createNextOfKinRequest(customerId, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Next of kin added." };
}

export async function removeNextOfKin(id: string, customerId: string): Promise<ActionResult> {
  try {
    await deleteNextOfKinRequest(customerId, id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Next of kin removed." };
}

export async function addCustomerNote(input: unknown): Promise<ActionResult> {
  const parsed = CreateCustomerNoteInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createCustomerNoteRequest(parsed.data.customerId, parsed.data.note);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true, message: "Note added." };
}

/**
 * Takes FormData for the same reason as the face capture: the file itself has
 * to reach the API, and only FormData carries one across the action boundary.
 */
export async function uploadCustomerDocument(customerId: string, formData: FormData): Promise<ActionResult> {
  const documentType = String(formData.get("documentType") ?? "").trim();
  const file = formData.get("file");

  if (!documentType) return { ok: false, message: "Document type is required." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a file to upload." };

  try {
    await uploadCustomerDocumentRequest(customerId, documentType, file);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Document uploaded." };
}

export async function removeCustomerDocument(id: string, customerId: string): Promise<ActionResult> {
  try {
    await deleteCustomerDocumentRequest(customerId, id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  return { ok: true, message: "Document removed." };
}

export async function approveCustomer(customerId: string): Promise<ActionResult> {
  try {
    await approveCustomerRequest(customerId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer approved." };
}

export async function rejectCustomer(customerId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, message: "A rejection reason is required." };

  try {
    await rejectCustomerRequest(customerId, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer registration rejected." };
}

export async function freezeCustomer(customerId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, message: "A reason is required to freeze this account." };

  try {
    await freezeCustomerRequest(customerId, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer account frozen." };
}

export async function unfreezeCustomer(customerId: string): Promise<ActionResult> {
  try {
    await unfreezeCustomerRequest(customerId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: "Customer account unfrozen." };
}

export async function setCustomerActiveStatus(customerId: string, active: boolean): Promise<ActionResult> {
  try {
    await setCustomerStatusRequest(customerId, active);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true, message: active ? "Customer reactivated." : "Customer suspended." };
}
