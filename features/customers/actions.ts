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
  getFaceScanAudit,
  getCustomers,
  nidaLookupRequest,
  nidaOtpVerifyRequest,
  registerCustomerRequest,
  resubmitRegistrationRequest,
  rejectCustomerRequest,
  setCustomerStatusRequest,
  unfreezeCustomerRequest,
  uploadCustomerDocumentRequest,
  updateCustomerRequest,
  type CustomerUpdate,
} from "@/lib/api/customers";
import { ApiError, describeError } from "@/lib/api/errors";
import type { FaceScanAudit } from "@/types/face-scan";
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

/**
 * Send a returned registration back to the approver.
 *
 * Reached from the customer profile once a manager has returned the file with
 * a reason. The API clears that reason on success — it described a record that
 * has since been corrected — and the audit trail keeps it.
 */
export async function resubmitCustomerRegistration(customerId: string): Promise<ActionResult> {
  try {
    await resubmitRegistrationRequest(customerId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers/approvals");

  return { ok: true, message: "Registration re-submitted for approval." };
}

export async function registerCustomer(
  input: RegisterCustomerInput
): Promise<ActionResult & { customerId?: string; fieldErrors?: Record<string, string[]> }> {
  let customer;

  try {
    customer = await registerCustomerRequest(input);
  } catch (error) {
    /*
     * A 422 carries `errors` — a map of field to messages — and this used to
     * throw it away, returning only `describeError()`. That collapses "Phone
     * number is already registered" and "Date of birth must be before today"
     * into the same eight words: "The given data was invalid." The officer is
     * left with a form that refuses to submit and no indication which of forty
     * fields is at fault.
     *
     * The map is passed back so the wizard can put each message under the
     * field it belongs to.
     */
    if (error instanceof ApiError && error.fieldErrors) {
      return {
        ok: false,
        message: describeError(error),
        fieldErrors: error.fieldErrors,
      };
    }
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
 * POST /customers/{customer}/face-verify — a liveness capture and the
 * scanner's report on it.
 *
 * Takes FormData because a File only survives the Server Action boundary
 * inside one, and because the report rides along in the same body: the image
 * and the measurements that justify it are one record, and an endpoint that
 * could receive them separately could receive one without the other.
 *
 * Nothing is re-derived here. The status the scanner reported is the status
 * that is sent; whether it makes the customer verified is the API's decision,
 * not this function's.
 */
export async function verifyCustomerFace(customerId: string, formData: FormData): Promise<ActionResult> {
  const capture = formData.get("capture");
  if (!(capture instanceof File) || capture.size === 0) {
    return { ok: false, message: "Select a capture to verify." };
  }

  const failed = formData.get("status") === "failed";

  try {
    await faceVerifyRequest(customerId, formData);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  /*
   * A face scan changes the photograph every one of these screens shows
   * beside the customer's name, and — when it fails — their KYC status, which
   * the applicant pickers filter on. All of them are invalidated so the change
   * is visible without a reload, exactly as an edit to any other field is.
   */
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/loans/new/apply");
  revalidatePath("/groups");
  revalidatePath("/teller");
  revalidatePath("/dashboard");

  return failed
    ? {
        ok: true,
        message: "Scan recorded as failed. The customer is not face-verified.",
      }
    : { ok: true, message: "Face liveness verified." };
}

/**
 * The "Download Audit" export for one scan.
 *
 * Returns the report as data and lets the browser save it, rather than
 * exposing a download route: the bearer token stays on the server, and there
 * is one fewer way to reach biometric metadata with only a URL.
 */
export async function getFaceScanAuditReport(
  customerId: string,
  scanId: string
): Promise<ActionResult & { report?: FaceScanAudit }> {
  try {
    return { ok: true, report: await getFaceScanAudit(customerId, scanId) };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
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

/**
 * Suspend or reactivate — PATCH /customers/{id}/status.
 *
 * A reason is required in both directions and is checked here as well as by
 * the API, so an empty one never costs a round trip. Suspension stops a
 * customer borrowing; lifting it lets them start again. Both are decisions
 * somebody will be asked about, and both used to be recorded as nothing but a
 * status column.
 */
export async function setCustomerActiveStatus(
  customerId: string,
  active: boolean,
  reason: string,
  remarks?: string
): Promise<ActionResult> {
  if (reason.trim().length < 3) {
    return { ok: false, message: "Give a reason for the change." };
  }

  try {
    await setCustomerStatusRequest(customerId, active, reason.trim(), remarks?.trim() || null);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  /* Status drives loan eligibility, so every screen that filters on it has to
     see the change without a reload. */
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/loans/new/apply");
  revalidatePath("/groups");
  revalidatePath("/teller");
  revalidatePath("/dashboard");

  return { ok: true, message: active ? "Customer reactivated." : "Customer suspended." };
}

/**
 * The top bar's customer jump.
 *
 * This exists so the shell can stop pre-loading the customer book. The layout
 * used to call `getAllCustomers()` on every navigation to fill a native
 * `<select>`; that walks the paginator a hundred customers at a time, so an
 * institution with five thousand of them paid up to fifty sequential API round
 * trips before any page in the application painted, and then rendered five
 * thousand `<option>` elements into the DOM of every screen. Searching on
 * demand costs one request, and only when somebody actually types.
 *
 * PAGED, not capped. It used to return a flat twenty and stop, which silently
 * hid the twenty-first match — on a common surname that is most of them. The
 * picker now asks for the next page as the reader scrolls, so "load all
 * customers" is true without ever loading all customers at once.
 *
 * An empty search is a valid request: it opens the picker on the first page of
 * the whole book, which is what an ERP selector does when you click it.
 *
 * Failures come back as an empty page WITH a message, so the box can say what
 * went wrong instead of looking like "no such customer".
 */
export interface CustomerPick {
  id: string;
  name: string;
  customerNumber: string;
  phone: string | null;
  branch: string | null;
  status: string;
  /** Signed URL to the KYC capture, or null — see CustomerAvatar. */
  photoUrl: string | null;
}

const JUMP_PAGE_SIZE = 25;

export async function searchCustomersForJump(
  term: string,
  page = 1
): Promise<{ ok: boolean; message?: string; results: CustomerPick[]; hasMore: boolean }> {
  try {
    const search = term.trim();
    const { customers, pagination } = await getCustomers({
      ...(search === "" ? {} : { search }),
      page,
      perPage: JUMP_PAGE_SIZE,
    });

    return {
      ok: true,
      results: customers.map((c) => ({
        id: c.id,
        name: c.fullName,
        customerNumber: c.customerNumber,
        phone: c.phone,
        branch: c.branchName,
        status: c.status,
        photoUrl: c.photoPath,
      })),
      /*
       * Prefer the paginator's own answer. Falling back to a full-page
       * heuristic would ask for one empty page at the exact end of the book,
       * which is harmless but shows a spinner for no reason.
       */
      hasMore: pagination ? page < pagination.lastPage : customers.length === JUMP_PAGE_SIZE,
    };
  } catch (error) {
    return { ok: false, message: describeError(error), results: [], hasMore: false };
  }
}

/**
 * Saves one section of a customer's profile.
 *
 * Everything the registration wizard captures is correctable here — the
 * endpoint accepts any subset, so a section posts only its own fields.
 *
 * `revalidatePath` is what makes the edit appear everywhere without a reload:
 * the customer list, the profile, the loan applicant picker and the group
 * member picker are all server-rendered from the same API, so invalidating
 * their cache entries is enough. The global selector searches on demand and
 * needs no invalidation at all.
 *
 * Field errors come back mapped, exactly as registration's do, so a section
 * can put "Phone number is already registered" under the phone input rather
 * than toasting something generic.
 */
export async function updateCustomer(
  customerId: string,
  changes: CustomerUpdate
): Promise<ActionResult & { fieldErrors?: Record<string, string[]> }> {
  try {
    await updateCustomerRequest(customerId, changes);
  } catch (error) {
    if (error instanceof ApiError && error.fieldErrors) {
      return { ok: false, message: describeError(error), fieldErrors: error.fieldErrors };
    }
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/customers/overview");
  /* The loan and group pickers read the customer book on the server. */
  revalidatePath("/loans/new/apply");
  revalidatePath("/groups");
  revalidatePath("/teller");
  revalidatePath("/dashboard");

  return { ok: true, message: "Changes saved." };
}
