import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ExternalVerificationState } from "@/types/customer";

const token = async () => getApiToken();

/**
 * What registration requires, and what this deployment can actually verify.
 *
 * Both come from the API in one call, and neither is decided here. The wizard
 * shows a step because a profile says the account type needs it; the API
 * refuses a submission for the same reason, reading the same rows. If the
 * frontend held its own copy of these rules the two would disagree the first
 * time an administrator changed one.
 */

/** One account type's profile. `accountTypeId` is null for the default. */
export interface AccountTypeRequirementProfile {
  accountTypeId: string | null;
  accountTypeName?: string | null;
  isDefault: boolean;

  requiresEmploymentDetails: boolean;
  requiresBusinessDetails: boolean;
  requiresBankAccount: boolean;
  requiresCardDetails: boolean;
  minGuarantors: number;
  minNextOfKin: number;
  requiresCustomerCategory: boolean;
  requiresMaritalStatus: boolean;
  requiresAddress: boolean;
  requiresIdentityDocument: boolean;
  /* Whether the category's own document list BLOCKS, as opposed to merely
     being listed. False everywhere today — see the 2026_08_30_000005
     migration. The documents step reads it to decide whether it is a
     requirement or a checklist. */
  requiresCategoryDocuments: boolean;
  /* Null means the flag applies to every customer; a date means it applies
     only to registrations on or after it, so the existing book keeps what it
     has. See the API's 2026_08_31 migration. */
  categoryDocumentsEnforcedFrom: string | null;
  requiresFaceVerification: boolean;
  requiresNidaVerification: boolean;
  requiresOtpVerification: boolean;
  guidance: string | null;
}

export interface RegistrationRequirements {
  profiles: AccountTypeRequirementProfile[];
  externalVerification: {
    nida: ExternalVerificationState;
    otp: ExternalVerificationState;
  };
}

export async function getRegistrationRequirements(): Promise<RegistrationRequirements> {
  return apiData<RegistrationRequirements>("/api/v1/registration/requirements", {
    token: await token(),
  });
}

/* ------------------------------------------------------------------ drafts */

/**
 * An unfinished registration.
 *
 * `payload` arrives only on a single read — the list is a picker and does not
 * need whole wizard payloads to render three rows.
 */
export interface RegistrationDraftSummary {
  id: string;
  label: string;
  phone: string | null;
  step: number;
  branchId: string;
  createdById: string;
  createdByName?: string | null;
  customerId: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RegistrationDraft extends RegistrationDraftSummary {
  payload: Record<string, unknown>;
}

export async function getRegistrationDrafts(): Promise<RegistrationDraftSummary[]> {
  return apiData<RegistrationDraftSummary[]>("/api/v1/customer-drafts", { token: await token() });
}

export async function getRegistrationDraft(id: string): Promise<RegistrationDraft> {
  return apiData<RegistrationDraft>(`/api/v1/customer-drafts/${id}`, { token: await token() });
}

export async function saveRegistrationDraftRequest(input: {
  id?: string | null;
  branchId: string;
  label: string;
  phone: string | null;
  step: number;
  payload: Record<string, unknown>;
}): Promise<RegistrationDraftSummary> {
  return apiData<RegistrationDraftSummary>("/api/v1/customer-drafts", {
    method: "POST",
    token: await token(),
    body: {
      id: input.id ? Number(input.id) : undefined,
      branchId: Number(input.branchId),
      label: input.label,
      phone: input.phone,
      step: input.step,
      payload: input.payload,
    },
  });
}

/**
 * Called once the customer exists. The draft is kept, not deleted — see the
 * API's 2026_08_26 migration for why.
 */
export async function markDraftSubmittedRequest(
  draftId: string,
  customerId: string
): Promise<RegistrationDraftSummary> {
  return apiData<RegistrationDraftSummary>(`/api/v1/customer-drafts/${draftId}/submitted`, {
    method: "POST",
    token: await token(),
    body: { customerId: Number(customerId) },
  });
}

export async function deleteRegistrationDraftRequest(id: string): Promise<void> {
  await apiData(`/api/v1/customer-drafts/${id}`, { method: "DELETE", token: await token() });
}
