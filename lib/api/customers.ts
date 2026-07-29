import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type {
  Customer,
  CustomerCategory,
  CustomerDocument,
  KycChecklist,
  NidaLookupResult,
  RegisterCustomerInput,
} from "@/types/customer";
import type { CustomerNote } from "@/types/customer-note";
import type { Guarantor } from "@/types/guarantor";
import type { NextOfKin } from "@/types/next-of-kin";

/**
 * Customers & KYC — backend §2.3, §2.4, §9, §15.1.
 *
 * Reads need `customers.view`, writes `customers.manage`, and approval
 * decisions `customers.approve`; everything is branch-scoped by the API (§13),
 * so nothing here filters by branch itself — a Loan Officer's list simply comes
 * back narrower.
 *
 * Two conventions worth stating once:
 *
 *   - Resources emit ids as strings, request bodies take them as integers. The
 *     frontend keeps the string convention end-to-end and `toId` converts at
 *     the boundary, so no caller has to remember which side it is on.
 *   - Document `filePath` is already a signed, time-limited URL to the API, not
 *     a storage path. It is meant to be handed straight to the browser as an
 *     href or an <img> src — that is why the download route sits outside
 *     Sanctum.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

/** String id → the integer the API's `exists:` rules expect. */
function toId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

/**
 * The list view's own shape. `branchName` and `categoryName` are resolved by
 * the API when it eager-loads them, which is why the table no longer looks them
 * up against a local branch array.
 */
export interface CustomerListItem extends Customer {
  fullName: string;
  branchName: string | null;
  categoryName: string | null;
}

export interface CustomerFilters {
  search?: string;
  kycStatus?: string[];
  status?: string[];
  approvalStatus?: string[];
  branchId?: string;
  customerCategoryId?: string;
  includeDeleted?: boolean;
  page?: number;
  perPage?: number;
}

/**
 * The array filters go out as `kyc_status[]=a&kyc_status[]=b`, which is what
 * Laravel's `array` rules read. `query` on the client only carries scalars, so
 * they are appended here as a pre-built search string.
 */
function filterQuery(filters: CustomerFilters): Record<string, string | number | undefined> {
  return {
    search: filters.search,
    branch_id: toId(filters.branchId) ?? undefined,
    customer_category_id: toId(filters.customerCategoryId) ?? undefined,
    include_deleted: filters.includeDeleted ? 1 : undefined,
    page: filters.page,
    per_page: filters.perPage,
  };
}

function repeatedParams(filters: CustomerFilters): string {
  const parts: string[] = [];
  for (const value of filters.kycStatus ?? []) parts.push(`kyc_status[]=${encodeURIComponent(value)}`);
  for (const value of filters.status ?? []) parts.push(`status[]=${encodeURIComponent(value)}`);
  for (const value of filters.approvalStatus ?? []) parts.push(`approval_status[]=${encodeURIComponent(value)}`);
  return parts.join("&");
}

export interface CustomerPage {
  customers: CustomerListItem[];
  pagination?: ApiPagination;
}

/** GET /api/v1/customers — one page. */
export async function getCustomers(filters: CustomerFilters = {}): Promise<CustomerPage> {
  const repeated = repeatedParams(filters);
  const path = repeated ? `/api/v1/customers?${repeated}` : "/api/v1/customers";

  const response = await apiRequest<CustomerListItem[]>(path, {
    token: await token(),
    query: filterQuery(filters),
  });

  return { customers: response.data, pagination: response.meta?.pagination };
}

/**
 * Every customer the caller may see, assembled page by page.
 *
 * The list screen searches, filters and paginates in the browser over the whole
 * set, and its four summary tiles count across all of it — there is no
 * aggregate endpoint to ask instead. `per_page` is capped at 100 by the API, so
 * "all" means walking the paginator rather than asking for one huge page.
 *
 * PAGE_LIMIT is a backstop, not a policy: at 100 per page it covers 5,000
 * customers, and passing it logs rather than silently truncating, because a
 * list that quietly stops short reads as "that is everyone" when it is not.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 50;

export async function getAllCustomers(filters: CustomerFilters = {}): Promise<CustomerListItem[]> {
  const all: CustomerListItem[] = [];
  let page = 1;

  for (;;) {
    const { customers, pagination } = await getCustomers({ ...filters, page, perPage: PER_PAGE });
    all.push(...customers);

    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage) break;

    if (page >= PAGE_LIMIT) {
      console.warn(
        `getAllCustomers stopped at ${PAGE_LIMIT} pages (${all.length} of ${pagination?.total ?? "?"} customers).`
      );
      break;
    }

    page += 1;
  }

  return all;
}

export async function getCustomer(id: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${id}`, { token: await token() });
}

/** GET /api/v1/customers/{customer}/kyc-status — the five-item checklist and what it implies. */
export interface KycStatusResult {
  customerId: string;
  checklist: KycChecklist;
  kycStatus: string;
  isComplete: boolean;
  missingDocuments: string[];
  isLoanEligible: boolean;
}

export async function getKycStatus(customerId: string): Promise<KycStatusResult> {
  return apiData<KycStatusResult>(`/api/v1/customers/${customerId}/kyc-status`, { token: await token() });
}

/**
 * POST /api/v1/customers — the wizard's whole payload in one transaction:
 * identity, address, category, dynamic KYC data, bank details, guarantors and
 * next-of-kin.
 */
export async function registerCustomerRequest(input: RegisterCustomerInput): Promise<Customer> {
  return apiData<Customer>("/api/v1/customers", {
    method: "POST",
    token: await token(),
    body: {
      nidaNumber: input.nidaNumber,
      nidaVerifiedAt: input.nidaVerifiedAt,
      otpVerifiedAt: input.otpVerifiedAt,
      faceVerifiedAt: input.faceVerifiedAt,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      dob: input.dob,
      gender: input.gender,
      phone: input.phone,
      maritalStatus: input.maritalStatus,
      regionId: toId(input.regionId),
      districtId: toId(input.districtId),
      wardId: toId(input.wardId),
      streetId: toId(input.streetId),
      residenceType: input.residenceType,
      branchId: toId(input.branchId),
      customerCategoryId: toId(input.customerCategoryId),
      dynamicFormData: input.dynamicFormData,
      bankDetails: input.bankDetails,
      guarantors: input.guarantors,
      nextOfKin: input.nextOfKin,
    },
  });
}

// ---------------------------------------------------------------------------
// KYC identity flow
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/customers/nida-lookup
 *
 * The API dispatches the OTP and returns the identity to populate the wizard
 * with; §9 is explicit that NIDA is the source of truth, so the officer does
 * not type these values.
 */
export interface NidaLookupResponse {
  verified: boolean;
  otpSent: boolean;
  customerDraft: NidaLookupResult;
}

export async function nidaLookupRequest(nidaNumber: string): Promise<NidaLookupResponse> {
  return apiData<NidaLookupResponse>("/api/v1/customers/nida-lookup", {
    method: "POST",
    token: await token(),
    body: { nidaNumber },
  });
}

/** POST /api/v1/customers/nida-otp-verify */
export interface NidaOtpVerifyResponse {
  verified: boolean;
  verifiedAt: string;
  customerDraft: NidaLookupResult;
}

export async function nidaOtpVerifyRequest(nidaNumber: string, otp: string): Promise<NidaOtpVerifyResponse> {
  return apiData<NidaOtpVerifyResponse>("/api/v1/customers/nida-otp-verify", {
    method: "POST",
    token: await token(),
    body: { nidaNumber, otp },
  });
}

/**
 * POST /api/v1/customers/{customer}/face-verify — a real liveness capture,
 * uploaded as an image, which also sets the customer's photo.
 */
export async function faceVerifyRequest(customerId: string, capture: File): Promise<Customer> {
  const form = new FormData();
  form.append("capture", capture);

  return apiData<Customer>(`/api/v1/customers/${customerId}/face-verify`, {
    method: "POST",
    token: await token(),
    formData: form,
  });
}

/** POST /api/v1/customers/{customer}/additional-data — the post-registration correction path. */
export interface AdditionalDataInput {
  maritalStatus?: string | null;
  regionId?: string | null;
  districtId?: string | null;
  wardId?: string | null;
  streetId?: string | null;
  residenceType?: string | null;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    phoneNumber?: string | null;
    checkNumber?: string | null;
  } | null;
}

export async function updateAdditionalDataRequest(
  customerId: string,
  input: AdditionalDataInput
): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/additional-data`, {
    method: "POST",
    token: await token(),
    body: {
      ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus } : {}),
      ...(input.regionId !== undefined ? { regionId: toId(input.regionId) } : {}),
      ...(input.districtId !== undefined ? { districtId: toId(input.districtId) } : {}),
      ...(input.wardId !== undefined ? { wardId: toId(input.wardId) } : {}),
      ...(input.streetId !== undefined ? { streetId: toId(input.streetId) } : {}),
      ...(input.residenceType !== undefined ? { residenceType: input.residenceType } : {}),
      ...(input.bankDetails !== undefined ? { bankDetails: input.bankDetails } : {}),
    },
  });
}

/** PUT /api/v1/customers/{customer}/category */
export async function assignCategoryRequest(
  customerId: string,
  customerCategoryId: string,
  dynamicFormData: Record<string, string | number | boolean>
): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/category`, {
    method: "PUT",
    token: await token(),
    body: { customerCategoryId: toId(customerCategoryId), dynamicFormData },
  });
}

// ---------------------------------------------------------------------------
// Approval, freeze and status
// ---------------------------------------------------------------------------

export async function approveCustomerRequest(customerId: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/approve`, {
    method: "POST",
    token: await token(),
  });
}

export async function rejectCustomerRequest(customerId: string, reason: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/reject`, {
    method: "POST",
    token: await token(),
    body: { reason },
  });
}

export async function freezeCustomerRequest(customerId: string, reason: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/freeze`, {
    method: "POST",
    token: await token(),
    body: { reason },
  });
}

export async function unfreezeCustomerRequest(customerId: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/unfreeze`, {
    method: "POST",
    token: await token(),
  });
}

export async function setCustomerStatusRequest(customerId: string, active: boolean): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/status`, {
    method: "PATCH",
    token: await token(),
    body: { active },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getCustomerDocuments(customerId: string): Promise<CustomerDocument[]> {
  return apiData<CustomerDocument[]>(`/api/v1/customers/${customerId}/documents`, { token: await token() });
}

export async function uploadCustomerDocumentRequest(
  customerId: string,
  documentType: string,
  file: File
): Promise<CustomerDocument> {
  const form = new FormData();
  form.append("documentType", documentType);
  form.append("file", file);

  return apiData<CustomerDocument>(`/api/v1/customers/${customerId}/documents`, {
    method: "POST",
    token: await token(),
    formData: form,
  });
}

export async function deleteCustomerDocumentRequest(customerId: string, documentId: string): Promise<void> {
  await apiData(`/api/v1/customers/${customerId}/documents/${documentId}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Guarantors, next of kin, notes
// ---------------------------------------------------------------------------

export async function getGuarantors(customerId: string): Promise<Guarantor[]> {
  return apiData<Guarantor[]>(`/api/v1/customers/${customerId}/guarantors`, { token: await token() });
}

export interface GuarantorInput {
  name: string;
  phone: string;
  nidaNumber: string | null;
  relationship: string;
  address: string | null;
  occupation: string | null;
}

export async function createGuarantorRequest(customerId: string, input: GuarantorInput): Promise<Guarantor> {
  return apiData<Guarantor>(`/api/v1/customers/${customerId}/guarantors`, {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function deleteGuarantorRequest(customerId: string, guarantorId: string): Promise<void> {
  await apiData(`/api/v1/customers/${customerId}/guarantors/${guarantorId}`, {
    method: "DELETE",
    token: await token(),
  });
}

export async function getNextOfKin(customerId: string): Promise<NextOfKin[]> {
  return apiData<NextOfKin[]>(`/api/v1/customers/${customerId}/next-of-kin`, { token: await token() });
}

export interface NextOfKinInput {
  name: string;
  relationship: string;
  phone: string;
  address: string | null;
}

export async function createNextOfKinRequest(customerId: string, input: NextOfKinInput): Promise<NextOfKin> {
  return apiData<NextOfKin>(`/api/v1/customers/${customerId}/next-of-kin`, {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function deleteNextOfKinRequest(customerId: string, id: string): Promise<void> {
  await apiData(`/api/v1/customers/${customerId}/next-of-kin/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

export async function getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  return apiData<CustomerNote[]>(`/api/v1/customers/${customerId}/notes`, { token: await token() });
}

export async function createCustomerNoteRequest(customerId: string, note: string): Promise<CustomerNote> {
  return apiData<CustomerNote>(`/api/v1/customers/${customerId}/notes`, {
    method: "POST",
    token: await token(),
    body: { note },
  });
}

// ---------------------------------------------------------------------------
// Customer categories
// ---------------------------------------------------------------------------

/**
 * Reads are open to every authenticated user — the registration wizard and the
 * customer profile both need the list, and gating it would break screens whose
 * own permission has already been checked. Writes require `admin.org_settings`,
 * enforced by the API.
 */
export async function getCustomerCategories(): Promise<CustomerCategory[]> {
  return apiData<CustomerCategory[]>("/api/v1/customer-categories", { token: await token() });
}

export interface CustomerCategoryInput {
  name: string;
  code: string;
  riskTier: string;
  sector: string;
  requiredDocuments: string[];
  dynamicFormSchema: unknown[];
  requiresExtraApproval: boolean;
}

export async function createCustomerCategoryRequest(input: CustomerCategoryInput): Promise<CustomerCategory> {
  return apiData<CustomerCategory>("/api/v1/customer-categories", {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateCustomerCategoryRequest(
  id: string,
  input: CustomerCategoryInput
): Promise<CustomerCategory> {
  return apiData<CustomerCategory>(`/api/v1/customer-categories/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

export async function deleteCustomerCategoryRequest(id: string): Promise<void> {
  await apiData(`/api/v1/customer-categories/${id}`, { method: "DELETE", token: await token() });
}
