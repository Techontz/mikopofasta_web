import "server-only";
import type {
  InterestFormulaRecord,
  RepaymentScheduleRecord,
} from "@/lib/api/system-configuration";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { EarlySettlementRecord, Loan, LoanSchedule, LoanStatusHistory } from "@/types/loan";
import type { CategoryProductEligibility, LoanProduct } from "@/types/loan-product";
import type { DisbursementChannel, LoanStatus } from "@/types/enums";
import { collectPages } from "@/lib/api/paginate";

/**
 * Loan Origination — backend §2.5, §6, §10, §15.2.
 *
 * Five grants carry §14's separation of duties (loans.view / create / approve /
 * credit_review / disburse) and everything is branch-scoped (§13); all of it is
 * enforced by the API, so nothing here re-checks either.
 *
 * One conversion matters throughout: **the API sends money and rates as
 * decimal strings** ("850000.00", "8.000") because that is how they survive a
 * database DECIMAL without a float ever touching them. The app's domain types
 * are numeric and every screen does arithmetic on them, so the strings are
 * parsed here, at the boundary, exactly once. Nothing downstream has to know
 * the wire format — and nothing downstream can accidentally concatenate two
 * amounts instead of adding them.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

/** Decimal string → number. The API never sends a non-numeric amount. */
function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNum(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** String id → the integer the API's `exists:` rules expect. */
function toId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Wire shapes — what the API actually sends, before conversion.
// ---------------------------------------------------------------------------

interface LoanWire {
  id: string;
  loanNumber: string;
  paymentReference: string | null;
  paymentReferenceIssuedAt: string | null;
  customerId: string;
  loanProductId: string;
  repaymentScheduleId: string;
  groupId: string | null;
  branchId: string;
  officerId: string;
  principalAmount: string;
  interestRateSnapshot: string;
  penaltyRateSnapshot: string;
  tenureDays: number;
  requiresMandateSnapshot: boolean;
  status: LoanStatus;
  statusLabel: string;
  disbursementDate: string | null;
  expectedCompletionDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  closedAt: string | null;
  frozenUntil: string | null;
  createdBy: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  earlySettledAt: string | null;
  interestWaived: string;
  /** Absent unless the caller loaded it; null when the loan was not settled. */
  earlySettlement?: EarlySettlementWire | null;
  customerName?: string | null;
  customerNumber?: string | null;
  branchName?: string | null;
  productName?: string | null;
  schedules?: LoanScheduleWire[];
  totalPayable?: string;
  outstandingTotal?: string;
}

interface EarlySettlementWire {
  settledAt: string;
  interestWaived: string;
  amountPaid: string | null;
  reference: string | null;
  officerId: string | null;
  officerName: string | null;
}

interface LoanScheduleWire {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  penaltyDue: string;
  principalPaid: string;
  interestPaid: string;
  penaltyPaid: string;
  status: LoanSchedule["status"];
  totalDue: string;
  totalPaid: string;
  outstandingTotal: string;
}

interface LoanProductWire {
  id: string;
  name: string;
  code: string;
  interestFormulaId: string;
  interestRate: string;
  minAmount: string;
  maxAmount: string;
  minTenureDays: number;
  maxTenureDays: number;
  penaltyType: LoanProduct["penaltyType"];
  penaltyRate: string;
  penaltyGraceDays: number;
  penaltyCapAmount: string | null;
  requiresMandate: boolean;
  status: LoanProduct["status"];
  createdBy: string | null;
  deletedAt: string | null;
  interestFormulaCode?: string;
  allowedRepaymentScheduleIds?: string[];
  loanCount?: number;
  /* The Loan Category screen's own terms — see the API's 2026_09_02 migration. */
  minRepayments: number | null;
  maxRepayments: number | null;
  allowsDeduction: boolean;
  approvalStageId: string | null;
  approvalStageName?: string | null;
  topupPercent: string | null;
  takeHomePercent: string | null;
  durationNames?: string[];
  customerTypeIds?: string[];
  branchNames?: string[];
}

// ---------------------------------------------------------------------------
// Loan
// ---------------------------------------------------------------------------

/**
 * A loan plus the names the API resolved for it. `outstanding` is the server's
 * own `outstandingTotal` — summed in SQL on the index, off the loaded schedules
 * on `show`, the same figure either way. A loan whose schedule has not been
 * generated yet reports zero, because nothing is owed before disbursement and a
 * balance there would overstate the portfolio.
 */
export interface LoanListItem extends Loan {
  statusLabel: string;
  customerName: string | null;
  customerNumber: string | null;
  branchName: string | null;
  productName: string | null;
  createdAt: string | null;
  outstanding: number;
  totalPayable: number;
  /**
   * The settlement record, on the endpoints that load it (`show` and the
   * settle response). Undefined means "the caller did not ask", null means
   * "this loan was never settled early" — the list endpoint says the first,
   * never the second.
   */
  earlySettlement?: EarlySettlementRecord | null;
}

function toLoan(wire: LoanWire): LoanListItem {
  return {
    id: wire.id,
    loanNumber: wire.loanNumber,
    paymentReference: wire.paymentReference,
    paymentReferenceIssuedAt: wire.paymentReferenceIssuedAt,
    customerId: wire.customerId,
    loanProductId: wire.loanProductId,
    repaymentScheduleId: wire.repaymentScheduleId,
    groupId: wire.groupId,
    branchId: wire.branchId,
    officerId: wire.officerId,
    principalAmount: num(wire.principalAmount),
    interestRateSnapshot: num(wire.interestRateSnapshot),
    penaltyRateSnapshot: num(wire.penaltyRateSnapshot),
    tenureDays: wire.tenureDays,
    requiresMandateSnapshot: wire.requiresMandateSnapshot,
    status: wire.status,
    disbursementDate: wire.disbursementDate,
    expectedCompletionDate: wire.expectedCompletionDate,
    approvedBy: wire.approvedBy,
    approvedAt: wire.approvedAt,
    rejectedReason: wire.rejectedReason,
    closedAt: wire.closedAt,
    frozenUntil: wire.frozenUntil,
    createdBy: wire.createdBy,
    deletedAt: wire.deletedAt,
    earlySettledAt: wire.earlySettledAt,
    interestWaived: num(wire.interestWaived),
    earlySettlement:
      wire.earlySettlement === undefined
        ? undefined
        : wire.earlySettlement === null
          ? null
          : {
              settledAt: wire.earlySettlement.settledAt,
              interestWaived: num(wire.earlySettlement.interestWaived),
              amountPaid: wire.earlySettlement.amountPaid === null ? null : num(wire.earlySettlement.amountPaid),
              reference: wire.earlySettlement.reference,
              officerId: wire.earlySettlement.officerId,
              officerName: wire.earlySettlement.officerName,
            },

    statusLabel: wire.statusLabel,
    customerName: wire.customerName ?? null,
    customerNumber: wire.customerNumber ?? null,
    branchName: wire.branchName ?? null,
    productName: wire.productName ?? null,
    createdAt: wire.createdAt ?? null,
    outstanding: num(wire.outstandingTotal),
    totalPayable: num(wire.totalPayable),
  };
}

function toSchedule(wire: LoanScheduleWire): LoanSchedule {
  return {
    id: wire.id,
    loanId: wire.loanId,
    installmentNumber: wire.installmentNumber,
    dueDate: wire.dueDate,
    principalDue: num(wire.principalDue),
    interestDue: num(wire.interestDue),
    penaltyDue: num(wire.penaltyDue),
    principalPaid: num(wire.principalPaid),
    interestPaid: num(wire.interestPaid),
    penaltyPaid: num(wire.penaltyPaid),
    status: wire.status,
  };
}

export interface LoanFilters {
  search?: string;
  status?: string[];
  customerId?: string;
  branchId?: string;
  loanProductId?: string;
  officerId?: string;
  /** The two lifecycle groupings the list page's tabs use. */
  stage?: "origination" | "open_book";
  page?: number;
  perPage?: number;
}

function repeatedStatus(filters: LoanFilters): string {
  return (filters.status ?? []).map((s) => `status[]=${encodeURIComponent(s)}`).join("&");
}

export async function getLoans(
  filters: LoanFilters = {}
): Promise<{ loans: LoanListItem[]; pagination?: ApiPagination }> {
  const repeated = repeatedStatus(filters);
  const path = repeated ? `/api/v1/loans?${repeated}` : "/api/v1/loans";

  const response = await apiRequest<LoanWire[]>(path, {
    token: await token(),
    query: {
      search: filters.search,
      customer_id: toId(filters.customerId) ?? undefined,
      branch_id: toId(filters.branchId) ?? undefined,
      loan_product_id: toId(filters.loanProductId) ?? undefined,
      officer_id: toId(filters.officerId) ?? undefined,
      stage: filters.stage,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { loans: response.data.map(toLoan), pagination: response.meta?.pagination };
}

/**
 * The whole book the caller may see, page by page.
 *
 * The list screen filters and paginates in the browser and its four tiles count
 * across everything; there is no aggregate endpoint to ask instead. `per_page`
 * is capped at 100, so "all" means walking the paginator. PAGE_LIMIT is a
 * backstop that logs rather than silently truncating — a list that quietly
 * stops short reads as "that is the whole book" when it is not.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 100;

export async function getAllLoans(filters: LoanFilters = {}): Promise<LoanListItem[]> {
  return collectPages(
    async (page, perPage) => {
      const { loans, pagination } = await getLoans({ ...filters, page, perPage });
      return { items: loans, pagination };
    },
    { pageLimit: PAGE_LIMIT, perPage: PER_PAGE, label: "getAllLoans" }
  );
}

/**
 * Portfolio outstanding across a set of loans.
 *
 * One line, because the index resource now carries the balance. It used to be
 * a request per loan: `GET /loans` did not emit `outstandingTotal` — the figure
 * came off loaded schedules and listing loans cannot load schedules — so the
 * only way to total a book was to ask each loan for its own schedule. That
 * capped out at 60 loans, degraded to a partial total past it, and a burst of
 * page loads was enough to trip the API's rate limiter.
 *
 * `Loan::scopeWithScheduleTotals()` replaced the fan-out with two SQL sums over
 * the same six columns, so the balance arrives with the row. The query cost of
 * a page of loans is now flat in the number of loans on it, and a list row and
 * a detail page are computing the same figure from the same source rather than
 * agreeing by coincidence.
 *
 * The shape is kept — callers still get a map, a total and a completeness flag
 * — because nothing about the call sites needed to change and the flag still
 * carries meaning: the API omits the field when it was not asked for, which
 * `num()` reads as 0, and `complete` is what tells the tile apart from a
 * genuine zero.
 */
export interface OutstandingLookup {
  /** loan id → outstanding, as the API reported it. */
  byLoan: Map<string, number>;
  total: number;
  /** False if any row came back without a balance at all. */
  complete: boolean;
}

export function getOutstandingByLoan(loans: LoanListItem[]): OutstandingLookup {
  const owing = loans.filter((l) => l.disbursementDate !== null);

  return {
    byLoan: new Map(owing.map((loan) => [loan.id, loan.outstanding])),
    total: owing.reduce((sum, loan) => sum + loan.outstanding, 0),
    complete: owing.every((loan) => Number.isFinite(loan.outstanding)),
  };
}

/** `show` eager-loads schedules, so `outstanding` and `totalPayable` are populated. */
export async function getLoan(id: string): Promise<LoanListItem & { schedules: LoanSchedule[] }> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${id}`, { token: await token() });
  return { ...toLoan(wire), schedules: (wire.schedules ?? []).map(toSchedule) };
}

export interface LoanScheduleResult {
  installments: LoanSchedule[];
  totalPayable: number;
  outstandingTotal: number;
  count: number;
}

export async function getLoanSchedule(id: string): Promise<LoanScheduleResult> {
  const response = await apiRequest<LoanScheduleWire[]>(`/api/v1/loans/${id}/schedule`, { token: await token() });
  const meta = response.meta as { totalPayable?: string; outstandingTotal?: string; installments?: number } | undefined;

  return {
    installments: response.data.map(toSchedule),
    totalPayable: num(meta?.totalPayable),
    outstandingTotal: num(meta?.outstandingTotal),
    count: meta?.installments ?? response.data.length,
  };
}

export async function getLoanHistory(id: string): Promise<LoanStatusHistory[]> {
  return apiData<LoanStatusHistory[]>(`/api/v1/loans/${id}/history`, { token: await token() });
}

/** GET /loans/{loan}/topup-eligibility — §6's 60%-repaid rule. */
export interface TopupEligibility {
  eligible: boolean;
  paidPercent: number;
  reasons: string[];
}

export async function getTopupEligibility(id: string): Promise<TopupEligibility> {
  const wire = await apiData<{ eligible: boolean; paidPercent: string; reasons: string[] }>(
    `/api/v1/loans/${id}/topup-eligibility`,
    { token: await token() }
  );
  return { eligible: wire.eligible, paidPercent: num(wire.paidPercent), reasons: wire.reasons };
}

// ---------------------------------------------------------------------------
// Application and eligibility
// ---------------------------------------------------------------------------

export interface LoanApplicationPayload {
  customerId: string;
  loanProductId: string;
  repaymentScheduleId: string;
  principalAmount: number;
  tenureDays: number;
  groupId?: string | null;
}

function applicationBody(input: LoanApplicationPayload) {
  return {
    customerId: toId(input.customerId),
    loanProductId: toId(input.loanProductId),
    repaymentScheduleId: toId(input.repaymentScheduleId),
    // The API validates `decimal:0,2`, so the amount goes out with a fixed
    // scale rather than however JavaScript chose to print the float.
    principalAmount: input.principalAmount.toFixed(2),
    tenureDays: input.tenureDays,
    ...(input.groupId ? { groupId: toId(input.groupId) } : {}),
  };
}

export interface EligibilityViolation {
  code: string;
  message: string;
}

export interface EligibilityResult {
  eligible: boolean;
  violations: EligibilityViolation[];
}

/**
 * POST /loans/check-eligibility — the same gates `store` applies, without
 * creating anything. The frontend used to re-implement these; the API sees the
 * customer's whole loan history and the live category rules, so it is the only
 * party that can answer correctly.
 */
export async function checkEligibilityRequest(input: LoanApplicationPayload): Promise<EligibilityResult> {
  return apiData<EligibilityResult>("/api/v1/loans/check-eligibility", {
    method: "POST",
    token: await token(),
    body: applicationBody(input),
  });
}

export async function applyForLoanRequest(input: LoanApplicationPayload): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>("/api/v1/loans", {
    method: "POST",
    token: await token(),
    body: applicationBody(input),
  });
  return toLoan(wire);
}

// ---------------------------------------------------------------------------
// The §10 workflow
// ---------------------------------------------------------------------------

export async function decideLoanRequest(
  loanId: string,
  decision: "approve" | "reject",
  reason?: string
): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/approve-manager`, {
    method: "POST",
    token: await token(),
    body: { decision, ...(decision === "reject" ? { reason } : {}) },
  });
  return toLoan(wire);
}

/**
 * What a product would produce — priced by the engine, not by the browser.
 *
 * Amounts stay as decimal STRINGS here, unlike most of this module. The preview
 * is displayed and never arithmetic-ed, so parsing them would be a conversion
 * performed for no reason — and the engine's own totals are already exact.
 */
export interface SchedulePreview {
  formulaCode: string;
  formulaName: string;
  installmentCount: number;
  totalPrincipal: string;
  totalInterest: string;
  totalPayable: string;
  installments: {
    installmentNumber: number;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    totalDue: string;
  }[];
}

export async function previewScheduleRequest(input: {
  loanProductId: string;
  repaymentScheduleId: string;
  principalAmount: number;
  tenureDays: number;
}): Promise<SchedulePreview> {
  return apiData<SchedulePreview>("/api/v1/loans/schedule-preview", {
    method: "POST",
    token: await token(),
    body: {
      loanProductId: toId(input.loanProductId),
      repaymentScheduleId: toId(input.repaymentScheduleId),
      principalAmount: input.principalAmount.toFixed(2),
      tenureDays: input.tenureDays,
    },
  });
}

// ---------------------------------------------------------------------------
// The approval chain — Branch Manager → Zone Manager → Head Office Credit
// ---------------------------------------------------------------------------

/** One decision an approver can take. Mirrors the backend enum exactly. */
export type ApprovalDecision = "approved" | "rejected" | "returned_for_modification" | "held" | "released";

export interface ApprovalStage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  loanStatus: LoanStatus;
  requiredPermission: string;
  requiresMandateBefore: boolean;
  isActive: boolean;
}

export interface ApprovalDecisionRecord {
  id: string;
  stageCode: string;
  stageName: string;
  decision: ApprovalDecision;
  decisionLabel: string;
  fromStatus: LoanStatus;
  toStatus: LoanStatus;
  reason: string | null;
  decidedBy?: { id: string; name: string };
  decidedAt: string | null;
}

export interface LoanApprovalState {
  loanId: string;
  status: LoanStatus;
  currentStage: ApprovalStage | null;
  chain: ApprovalStage[];
  isOwnApplication: boolean;
  canDecide: boolean;
  /**
   * What this user may actually do right now.
   *
   * Computed by the API from the same rule that would refuse the write, so a
   * button is never offered that the server would then reject — and never
   * hidden from someone entitled to press it.
   */
  availableDecisions: (ApprovalDecision | "resubmit")[];
  holdResumeStatus: LoanStatus | null;
  decisions: ApprovalDecisionRecord[];
}

export async function getLoanApproval(loanId: string): Promise<LoanApprovalState> {
  return apiData<LoanApprovalState>(`/api/v1/loans/${loanId}/approval`, { token: await token() });
}

export async function decideApprovalRequest(
  loanId: string,
  decision: ApprovalDecision,
  reason?: string
): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/approval/decide`, {
    method: "POST",
    token: await token(),
    body: { decision, ...(reason ? { reason } : {}) },
  });
  return toLoan(wire);
}

export async function resubmitLoanRequest(loanId: string, note?: string): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/approval/resubmit`, {
    method: "POST",
    token: await token(),
    body: note ? { note } : {},
  });
  return toLoan(wire);
}

// ---------------------------------------------------------------------------
// Early settlement — "Close Loan Early" (client Decision 1, Option B)
// ---------------------------------------------------------------------------

/**
 * What closing a loan today costs, and what the borrower is forgiven.
 *
 * Amounts stay as decimal strings: they are displayed and confirmed, never
 * arithmetic-ed here. The server is the only place that decides the figure, and
 * it re-quotes at settlement so the number shown is the number charged.
 */
export interface EarlySettlementQuote {
  penalty: string;
  principal: string;
  interestEarned: string;
  interestWaived: string;
  advanceHeld: string;
  payable: string;
  cashRequired: string;
  payableIfRunToTerm: string;
  installmentsCancelled: number;
}

export async function getEarlySettlementQuote(loanId: string): Promise<EarlySettlementQuote> {
  return apiData<EarlySettlementQuote>(`/api/v1/loans/${loanId}/early-settlement`, { token: await token() });
}

export async function settleLoanEarlyRequest(loanId: string, amount: string): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/early-settlement`, {
    method: "POST",
    token: await token(),
    body: { amount },
  });
  return toLoan(wire);
}

export async function verifyMandateRequest(loanId: string, otp: string): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/mandate/verify-otp`, {
    method: "POST",
    token: await token(),
    body: { otp },
  });
  return toLoan(wire);
}

export async function retryMandateRequest(loanId: string): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/mandate/retry`, {
    method: "POST",
    token: await token(),
  });
  return toLoan(wire);
}

export async function telcoVerifyRequest(loanId: string, passed: boolean): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/telco-verify`, {
    method: "POST",
    token: await token(),
    body: { passed },
  });
  return toLoan(wire);
}

export interface DisbursementBatch {
  id: string;
  loanId: string;
  batchReference: string;
  attemptNumber: number;
  channel: DisbursementChannel;
  status: string;
  failureReason: string | null;
  requestedBy: string;
  requestedAt: string;
  completedAt: string | null;
}

export async function prepareDisbursementRequest(
  loanId: string,
  channel: DisbursementChannel
): Promise<DisbursementBatch> {
  return apiData<DisbursementBatch>(`/api/v1/loans/${loanId}/prepare-disbursement`, {
    method: "POST",
    token: await token(),
    body: { channel },
  });
}

export async function retryDisbursementRequest(loanId: string): Promise<DisbursementBatch> {
  return apiData<DisbursementBatch>(`/api/v1/loans/${loanId}/retry-disbursement`, {
    method: "POST",
    token: await token(),
  });
}

/**
 * The authenticated twin of the §15.2 provider callback. Both reach the same
 * action, so there is one place a loan becomes active and one place it posts to
 * the ledger.
 */
export async function settleDisbursementRequest(
  loanId: string,
  success: boolean,
  failureReason?: string
): Promise<void> {
  await apiData(`/api/v1/loans/${loanId}/settle-disbursement`, {
    method: "POST",
    token: await token(),
    body: { success, ...(failureReason ? { failureReason } : {}) },
  });
}

export async function closeLoanRequest(loanId: string, freezeDays: number): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/close`, {
    method: "POST",
    token: await token(),
    body: { freezeDays },
  });
  return toLoan(wire);
}

export async function cancelLoanRequest(loanId: string, reason: string): Promise<LoanListItem> {
  const wire = await apiData<LoanWire>(`/api/v1/loans/${loanId}/cancel`, {
    method: "POST",
    token: await token(),
    body: { reason },
  });
  return toLoan(wire);
}

// ---------------------------------------------------------------------------
// Loan products and configuration
// ---------------------------------------------------------------------------

/**
 * A product plus the two derived fields the API resolves: the formula's code
 * (which the schedule preview branches on) and which cadences it allows.
 */
export interface LoanProductWithConfig extends LoanProduct {
  interestFormulaCode: string | null;
  allowedRepaymentScheduleIds: string[];
  loanCount: number | null;
  /* How many instalments, whether it is deducted at source, which tier signs
     it off, the two percentages, and which Customer Types may borrow it. */
  minRepayments: number | null;
  maxRepayments: number | null;
  allowsDeduction: boolean;
  approvalStageId: string | null;
  approvalStageName: string | null;
  topupPercent: number | null;
  takeHomePercent: number | null;
  customerTypeIds: string[];
  /** Branches offering it. Empty means every branch. */
  branchNames: string[];
}

function toProduct(wire: LoanProductWire): LoanProductWithConfig {
  return {
    id: wire.id,
    name: wire.name,
    code: wire.code,
    interestFormulaId: wire.interestFormulaId,
    interestRate: num(wire.interestRate),
    minAmount: num(wire.minAmount),
    maxAmount: num(wire.maxAmount),
    minTenureDays: wire.minTenureDays,
    maxTenureDays: wire.maxTenureDays,
    penaltyType: wire.penaltyType,
    penaltyRate: num(wire.penaltyRate),
    penaltyGraceDays: wire.penaltyGraceDays,
    penaltyCapAmount: nullableNum(wire.penaltyCapAmount),
    requiresMandate: wire.requiresMandate,
    status: wire.status,
    createdBy: wire.createdBy,
    deletedAt: wire.deletedAt,

    interestFormulaCode: wire.interestFormulaCode ?? null,
    allowedRepaymentScheduleIds: wire.allowedRepaymentScheduleIds ?? [],
    loanCount: wire.loanCount ?? null,

    minRepayments: wire.minRepayments,
    maxRepayments: wire.maxRepayments,
    allowsDeduction: wire.allowsDeduction,
    approvalStageId: wire.approvalStageId,
    approvalStageName: wire.approvalStageName ?? null,
    topupPercent: nullableNum(wire.topupPercent),
    takeHomePercent: nullableNum(wire.takeHomePercent),
    customerTypeIds: wire.customerTypeIds ?? [],
    branchNames: wire.branchNames ?? [],
  };
}

export async function getLoanProducts(): Promise<LoanProductWithConfig[]> {
  const wire = await apiData<LoanProductWire[]>("/api/v1/loan-products", { token: await token() });
  return wire.map(toProduct);
}

export async function getLoanProduct(id: string): Promise<LoanProductWithConfig> {
  const wire = await apiData<LoanProductWire>(`/api/v1/loan-products/${id}`, { token: await token() });
  return toProduct(wire);
}

export interface LoanProductInput {
  name: string;
  code: string;
  interestFormulaId: string;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  minTenureDays: number;
  maxTenureDays: number;
  penaltyType: string;
  penaltyRate: number;
  penaltyGraceDays: number;
  penaltyCapAmount: number | null;
  requiresMandate: boolean;
  minRepayments?: number | null;
  maxRepayments?: number | null;
  allowsDeduction?: boolean;
  approvalStageId?: string | null;
  topupPercent?: number | null;
  takeHomePercent?: number | null;
  status: string;
  repaymentScheduleIds: string[];
}

function productBody(input: LoanProductInput) {
  return {
    name: input.name,
    code: input.code,
    interestFormulaId: toId(input.interestFormulaId),
    // `decimal:0,3` for rates and `decimal:0,2` for money — sent with the
    // scale the API validates against rather than JavaScript's default.
    interestRate: input.interestRate.toFixed(3),
    minAmount: input.minAmount.toFixed(2),
    maxAmount: input.maxAmount.toFixed(2),
    minTenureDays: input.minTenureDays,
    maxTenureDays: input.maxTenureDays,
    penaltyType: input.penaltyType,
    penaltyRate: input.penaltyRate.toFixed(3),
    penaltyGraceDays: input.penaltyGraceDays,
    penaltyCapAmount: input.penaltyCapAmount === null ? null : input.penaltyCapAmount.toFixed(2),
    requiresMandate: input.requiresMandate,
    status: input.status,
    repaymentScheduleIds: input.repaymentScheduleIds.map((id) => toId(id)).filter((id) => id !== null),
  };
}

export async function createLoanProductRequest(input: LoanProductInput): Promise<LoanProductWithConfig> {
  const wire = await apiData<LoanProductWire>("/api/v1/loan-products", {
    method: "POST",
    token: await token(),
    body: productBody(input),
  });
  return toProduct(wire);
}

export async function updateLoanProductRequest(
  id: string,
  input: LoanProductInput
): Promise<LoanProductWithConfig> {
  const wire = await apiData<LoanProductWire>(`/api/v1/loan-products/${id}`, {
    method: "PUT",
    token: await token(),
    body: productBody(input),
  });
  return toProduct(wire);
}

export async function deleteLoanProductRequest(id: string): Promise<void> {
  await apiData(`/api/v1/loan-products/${id}`, { method: "DELETE", token: await token() });
}

/**
 * Interest formulas and repayment cadences — the two lookups the application
 * form needs, and the two Settings screens read the same endpoints.
 *
 * A formula has no create and no delete: the loan engine branches on its code,
 * so a fourth one would have no implementation behind it. Only its name and
 * description can be edited. Schedules are fully editable, because
 * `frequencyDays` is a number the generator divides by rather than a branch —
 * see lib/api/system-configuration.ts for both write paths.
 *
 * Each row carries what is using it, which is what the Settings screens show
 * and what their guards are about. The application form ignores the counts.
 */
export async function getInterestFormulas(): Promise<InterestFormulaRecord[]> {
  return apiData<InterestFormulaRecord[]>("/api/v1/interest-formulas", { token: await token() });
}

export async function getRepaymentSchedules(): Promise<RepaymentScheduleRecord[]> {
  return apiData<RepaymentScheduleRecord[]>("/api/v1/repayment-schedules", { token: await token() });
}

/**
 * GET /customer-categories/{category}/eligibility — which products a category
 * may borrow, and the per-category ceiling that can sit under the product's own
 * maximum (§6).
 */
export interface CategoryEligibilityRule {
  id: string;
  loanProductId: string;
  loanProductName: string | null;
  maxAmountOverride: number | null;
  requiresExtraApproval: boolean;
}

export async function getCategoryEligibility(categoryId: string): Promise<CategoryEligibilityRule[]> {
  const wire = await apiData<{
    rules: { id: string; loanProductId: string; loanProductName: string | null; maxAmountOverride: string | null; requiresExtraApproval: boolean }[];
  }>(`/api/v1/customer-categories/${categoryId}/eligibility`, { token: await token() });

  return wire.rules.map((rule) => ({
    id: rule.id,
    loanProductId: rule.loanProductId,
    loanProductName: rule.loanProductName,
    maxAmountOverride: nullableNum(rule.maxAmountOverride),
    requiresExtraApproval: rule.requiresExtraApproval,
  }));
}

/**
 * The eligibility matrix for every category, in the shape the application form
 * already consumes.
 *
 * The form narrows the product list the moment a customer is picked, so the
 * rules must be in hand before the first keystroke. There is no bulk endpoint
 * and categories are a handful of rows, so they are fetched per category and
 * flattened once here.
 *
 * Which cadences a product allows is *not* here: the API puts
 * `allowedRepaymentScheduleIds` on the product itself, so the form reads it
 * from there rather than reconstructing a pivot table.
 */
export async function getEligibilityMatrix(categoryIds: string[]): Promise<CategoryProductEligibility[]> {
  const perCategory = await Promise.all(
    categoryIds.map(async (categoryId) => ({ categoryId, rules: await getCategoryEligibility(categoryId) }))
  );

  return perCategory.flatMap(({ categoryId, rules }) =>
    rules.map((rule) => ({
      id: rule.id,
      customerCategoryId: categoryId,
      loanProductId: rule.loanProductId,
      maxAmountOverride: rule.maxAmountOverride,
      requiresExtraApproval: rule.requiresExtraApproval,
    }))
  );
}
