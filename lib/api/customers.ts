import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type {
  Customer,
  CustomerCategory,
  CustomerDocument,
  KycChecklist,
  KycRequirement,
  RegistrationProgress,
  ExternalVerificationState,
  NidaLookupResult,
  RegisterCustomerInput,
} from "@/types/customer";
import {
  FaceScanAuditSchema,
  FaceScanSchema,
  type FaceScan,
  type FaceScanAudit,
} from "@/types/face-scan";
import { AccountFreezeSchema, type AccountFreeze } from "@/types/audit";
import type { CustomerNote } from "@/types/customer-note";
import type { Guarantor, ImportableGuarantor } from "@/types/guarantor";
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
  /*
   * The whole eligibility rule, asked of the API rather than reassembled here.
   *
   * `kycStatus: ["completed"] + approvalStatus: ["approved"]` is a second copy
   * of `Customer::isLoanEligible()` living in the frontend, free to drift from
   * it the moment the rule changes — and it did: registration approval was not
   * part of it until now. One flag, one definition, server-side.
   */
  loanEligible?: boolean;
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
  if (filters.loanEligible) parts.push("loan_eligible=1");
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

/**
 * PUT /api/v1/customers/{id} — the profile's save.
 *
 * Partial by design: only the keys passed are sent, and the API treats an
 * absent key as "not being edited" rather than "clear it". That is what lets
 * one section of the profile save without the others posting stale values back
 * over a change somebody else made a moment ago.
 */
export type CustomerUpdate = Partial<Record<string, string | number | null>>;

export async function updateCustomerRequest(
  id: string,
  changes: CustomerUpdate
): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${id}`, {
    method: "PUT",
    token: await token(),
    body: changes,
  });
}

/**
 * GET /api/v1/customers/{customer}/freezes — the freeze history.
 *
 * Every freeze this customer has been under, newest first, open ones included
 * (`unfrozenAt: null`). The profile used to have no way to ask: freeze and
 * unfreeze were POSTs with no counterpart, so the timeline was assembled from
 * an empty array and said nothing about who froze an account or why.
 */
export async function getCustomerFreezes(customerId: string): Promise<AccountFreeze[]> {
  const rows = await apiData<unknown[]>(`/api/v1/customers/${customerId}/freezes`, {
    token: await token(),
  });

  return rows.map((row) => AccountFreezeSchema.parse(row));
}

/**
 * A row on the manager's registration-approval queue.
 *
 * Its own endpoint rather than the customer index, because deciding needs
 * facts the index does not carry — whether the face scan passed, who
 * registered the customer, and what is still outstanding. Deriving
 * `outstanding` in the browser would mean one kyc-status request per row.
 */
export interface PendingRegistration {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  branchName: string | null;
  categoryName: string | null;
  accountTypeName: string | null;
  registeredById: string | null;
  registeredByName: string | null;
  registeredAt: string | null;
  kycStatus: string;
  faceVerified: boolean;
  /** Empty means approvable. The same list the API checks before deciding. */
  outstanding: string[];
  requiresExtraApproval: boolean;
}

/** GET /api/v1/customers/pending-approval — branch-scoped by the API. */
export async function getPendingRegistrations(): Promise<PendingRegistration[]> {
  return apiData<PendingRegistration[]>("/api/v1/customers/pending-approval", {
    token: await token(),
  });
}

/**
 * POST /api/v1/customers/{id}/resubmit — a returned registration, corrected.
 *
 * `customers.manage`, not `customers.approve`: the officer fixes the record,
 * the manager decides on it. Without this a rejection is terminal and a
 * customer returned over a mistyped ward could never be registered at all —
 * their phone and National ID are already taken by the refused record.
 */
export async function resubmitRegistrationRequest(id: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${id}/resubmit`, {
    method: "POST",
    token: await token(),
  });
}

export async function getCustomer(id: string): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${id}`, { token: await token() });
}

/**
 * GET /api/v1/customers/{customer}/kyc-status.
 *
 * `checklist` is the original five-key map, kept because the contract
 * published it. `requirements` is what the UI should read: one line per
 * requirement, each knowing whether it applies to this customer's account
 * type and whether the check is even possible in this deployment.
 */
export interface KycStatusResult {
  customerId: string;
  checklist: KycChecklist;
  requirements: KycRequirement[];
  kycStatus: string;
  isComplete: boolean;
  missingDocuments: string[];
  isLoanEligible: boolean;
  progress: RegistrationProgress;
  externalVerification: {
    nida: ExternalVerificationState;
    otp: ExternalVerificationState;
  };
}

export async function getKycStatus(customerId: string): Promise<KycStatusResult> {
  return apiData<KycStatusResult>(`/api/v1/customers/${customerId}/kyc-status`, { token: await token() });
}

/**
 * POST /api/v1/customers — the wizard's whole payload in one transaction:
 * identity, address, category, dynamic KYC data, bank details, guarantors and
 * next-of-kin.
 */
/** An untouched input arrives as "", which the API reads as a value. Drop it. */
function blank(value: string | null | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? undefined : trimmed;
}

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
      /* Typed, not chosen. See the API's 2026_08_26 migration. */
      wardName: blank(input.wardName),
      streetName: blank(input.streetName),
      residenceType: input.residenceType,
      branchId: toId(input.branchId),
      customerCategoryId: toId(input.customerCategoryId),
      dynamicFormData: input.dynamicFormData,
      bankDetails: input.bankDetails,
      guarantors: input.guarantors,
      nextOfKin: input.nextOfKin,

      /*
       * The legacy registration form's own fields.
       *
       * This body is an explicit allowlist rather than a spread, so that only
       * what the API accepts is sent — but that also means a field absent from
       * this list is silently dropped on the way out. Every one of these was
       * typed by the officer, validated by the form and then discarded here,
       * which is exactly the "nothing should silently disappear" failure.
       */
      employeeId: toId(input.employeeId),
      loanTypeId: toId(input.loanTypeId),
      customerTypeId: toId(input.customerTypeId),
      accountTypeId: toId(input.accountTypeId),
      workTypeId: toId(input.workTypeId),
      employmentTypeId: toId(input.employmentTypeId),
      occupationId: toId(input.occupationId),
      maritalStatusId: toId(input.maritalStatusId),
      bankId: toId(input.bankId),
      mobileMoneyProviderId: toId(input.mobileMoneyProviderId),

      nickname: blank(input.nickname),
      department: blank(input.department),
      councilNumber: blank(input.councilNumber),
      placeOfEmployment: blank(input.placeOfEmployment),
      retirementDate: blank(input.retirementDate),
      dependentsCount: input.dependentsCount ?? undefined,
      basicSalary: input.basicSalary ?? undefined,
      takeHome: input.takeHome ?? undefined,
      checkNumber: blank(input.checkNumber),

      accountName: blank(input.accountName),
      nationalIdNumber: blank(input.nationalIdNumber),
      voterIdNumber: blank(input.voterIdNumber),
      driverLicenceNumber: blank(input.driverLicenceNumber),
      workIdNumber: blank(input.workIdNumber),
      /* Sent in full; the API keeps only the last four. Never stored here. */
      cardNumber: blank(input.cardNumber),
      cardExpiryMonth: input.cardExpiryMonth ?? undefined,
      cardExpiryYear: input.cardExpiryYear ?? undefined,

      email: blank(input.email),
      alternativePhone: blank(input.alternativePhone),
      nationality: blank(input.nationality),
      tinNumber: blank(input.tinNumber),
      passportNumber: blank(input.passportNumber),
      village: blank(input.village),
      houseNumber: blank(input.houseNumber),
      postalCode: blank(input.postalCode),
      landmark: blank(input.landmark),
      occupation: blank(input.occupation),
      employer: blank(input.employer),
      /* Both free text now — the master-data ids above stay for records that
         already reference a list entry. */
      employmentType: blank(input.employmentType),
      workType: blank(input.workType),
      monthlyIncome: input.monthlyIncome ?? undefined,
      businessName: blank(input.businessName),
      businessType: blank(input.businessType),
      businessAddress: blank(input.businessAddress),
      bankBranch: blank(input.bankBranch),
      mobileMoneyProvider: blank(input.mobileMoneyProvider),
      walletNumber: blank(input.walletNumber),
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
 * POST /api/v1/customers/{customer}/face-verify — a liveness capture and the
 * scanner's report on it.
 *
 * The FormData is passed straight through rather than rebuilt here. It already
 * carries the image plus eleven checks and eight measurements assembled by
 * `appendReport()`, and copying that apart field by field would be one more
 * place for the two ends of the contract to drift.
 */
export async function faceVerifyRequest(customerId: string, form: FormData): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/face-verify`, {
    method: "POST",
    token: await token(),
    formData: form,
  });
}

/**
 * GET /api/v1/customers/{customer}/face-scans — the whole history, newest
 * first, with the active scan flagged.
 *
 * Superseded scans are kept deliberately: a re-scan replaces the photograph a
 * branch identifies somebody by, and the previous one is the only thing the
 * new one can be checked against.
 */
export async function getFaceScans(customerId: string): Promise<FaceScan[]> {
  const scans = await apiData<unknown[]>(`/api/v1/customers/${customerId}/face-scans`, {
    token: await token(),
  });

  return scans.map((scan) => FaceScanSchema.parse(scan));
}

/** GET /api/v1/customers/{customer}/face-scans/{scan}/audit — the export. */
export async function getFaceScanAudit(customerId: string, scanId: string): Promise<FaceScanAudit> {
  return FaceScanAuditSchema.parse(
    await apiData<unknown>(`/api/v1/customers/${customerId}/face-scans/${scanId}/audit`, {
      token: await token(),
    })
  );
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

export async function setCustomerStatusRequest(
  customerId: string,
  active: boolean,
  reason: string,
  remarks: string | null
): Promise<Customer> {
  return apiData<Customer>(`/api/v1/customers/${customerId}/status`, {
    method: "PATCH",
    token: await token(),
    body: { active, reason, remarks },
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

/**
 * GET /api/v1/guarantors — every guarantor on record, branch-scoped by the API.
 *
 * Backs the loan application's "Import Guarantors" step. Server-side search, so
 * the browser never downloads the whole guarantor book to filter it locally.
 */
export async function searchGuarantorsRequest(
  search: string,
  limit = 50
): Promise<ImportableGuarantor[]> {
  return apiData<ImportableGuarantor[]>("/api/v1/guarantors", {
    token: await token(),
    query: search.trim() === "" ? { limit } : { search: search.trim(), limit },
  });
}

export interface GuarantorInput {
  name: string;
  phone: string;
  nidaNumber: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  relationship: string;
  address: string | null;
  occupation: string | null;
  /** The passport photograph or scan, when one was taken. */
  passport?: File | null;
  /** An import: copy this guarantor's passport onto the new record. */
  copyPassportFromGuarantorId?: string | null;
}

/**
 * POST /api/v1/customers/{id}/guarantors.
 *
 * Sent as multipart, because the passport is a file — the same shape
 * `uploadCustomerDocumentRequest` uses, so it goes to the same private KYC
 * disk through the same storage service. Laravel validates a multipart field
 * exactly as it validates a JSON one, so no rule changed to allow this.
 *
 * Null and undefined are omitted rather than sent: `FormData` stringifies
 * everything, and a literal "null" would fail `Rule::in(...)` on gender.
 */
export async function createGuarantorRequest(customerId: string, input: GuarantorInput): Promise<Guarantor> {
  const form = new FormData();

  form.append("name", input.name);
  form.append("phone", input.phone);
  form.append("relationship", input.relationship);

  const optional: Record<string, string | null | undefined> = {
    nidaNumber: input.nidaNumber,
    gender: input.gender,
    maritalStatus: input.maritalStatus,
    address: input.address,
    occupation: input.occupation,
    copyPassportFromGuarantorId: input.copyPassportFromGuarantorId,
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== null && value !== undefined && value !== "") form.append(key, value);
  }

  if (input.passport) form.append("passport", input.passport);

  return apiData<Guarantor>(`/api/v1/customers/${customerId}/guarantors`, {
    method: "POST",
    token: await token(),
    formData: form,
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
