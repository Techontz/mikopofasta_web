"use server";

import { revalidatePath } from "next/cache";
import {
  LoanApplicationInputSchema,
  type LoanApplicationInput,
} from "@/types/loan";
import type { LoanStatus, DisbursementChannel } from "@/types/enums";
import { MOCK_LOANS, MOCK_LOAN_STATUS_HISTORY, MOCK_E_MANDATES, MOCK_TELCO_VERIFICATIONS, MOCK_DISBURSEMENT_BATCHES } from "@/lib/mock-data/loans";
import { MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_CUSTOMER_BANK_DETAILS } from "@/lib/mock-data/customer-bank-details";
import { MOCK_LOAN_PRODUCTS, MOCK_CATEGORY_PRODUCT_ELIGIBILITY, MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES } from "@/lib/mock-data/loan-products";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { postEntry } from "@/lib/mock-data/journal-entries";
import { LOAN_RECEIVABLE_ACCOUNT_ID, PRINCIPAL_ACCOUNT_ID } from "@/lib/mock-data/chart-of-accounts";
import { AUDIT_ACTIONS } from "@/types/audit";
import { checkLoanApplication } from "@/lib/domain/loan-eligibility";
import { canTransition, MAX_DISBURSEMENT_ATTEMPTS } from "@/lib/domain/loan-status-machine";
import { generateLoanSchedule } from "@/lib/domain/loan-schedule";
import { loanNumber as formatLoanNumber, disbursementBatchReference } from "@/lib/domain/id-generators";
import { nextId } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const MANDATE_OTP = "654321";

async function requirePermission(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]): Promise<AuthenticatedUser | ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return user;
}

function isDenied(v: AuthenticatedUser | ActionResult): v is ActionResult {
  return "ok" in v;
}

function logLoanAudit(action: string, loanId: string, userId: string | null): void {
  MOCK_AUDIT_LOGS.push({
    id: nextId("audit"),
    userId,
    action,
    auditableType: "loan",
    auditableId: loanId,
    beforeJson: null,
    afterJson: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  });
}

function recordTransition(loanId: string, from: LoanStatus | null, to: LoanStatus, userId: string | null, reason: string | null): void {
  MOCK_LOAN_STATUS_HISTORY.push({
    id: nextId("lsh"),
    loanId,
    fromStatus: from,
    toStatus: to,
    changedBy: userId,
    reason,
    createdAt: new Date().toISOString(),
  });
}

function revalidateLoan(loanId: string) {
  revalidatePath("/loans");
  revalidatePath(`/loans/${loanId}`);
}

/**
 * Moves a loan to a new status, enforcing the §10 state machine in one
 * place so no action can invent an illegal transition.
 */
function transition(loanId: string, to: LoanStatus, userId: string | null, reason: string | null): ActionResult {
  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (!canTransition(loan.status, to)) {
    return { ok: false, message: `Cannot move a loan from ${loan.status} to ${to}.` };
  }
  const from = loan.status;
  loan.status = to;
  recordTransition(loanId, from, to, userId, reason);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export async function applyForLoan(input: LoanApplicationInput): Promise<ActionResult & { loanId?: string }> {
  const actor = await requirePermission(PERMISSIONS.LOANS_CREATE);
  if (isDenied(actor)) return actor;

  const parsed = LoanApplicationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  const values = parsed.data;

  const customer = MOCK_CUSTOMERS.find((c) => c.id === values.customerId && c.deletedAt === null);
  if (!customer) return { ok: false, message: "Customer not found." };
  const product = MOCK_LOAN_PRODUCTS.find((p) => p.id === values.loanProductId && p.deletedAt === null);
  if (!product) return { ok: false, message: "Loan product not found." };

  const violations = checkLoanApplication({
    customer,
    product,
    repaymentScheduleId: values.repaymentScheduleId,
    principalAmount: values.principalAmount,
    tenureDays: values.tenureDays,
    eligibility: MOCK_CATEGORY_PRODUCT_ELIGIBILITY,
    productSchedules: MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES,
    openLoans: MOCK_LOANS.filter((l) => l.customerId === customer.id),
  });
  if (violations.length > 0) {
    return { ok: false, message: violations[0].message };
  }

  const loanId = nextId("loan");
  const seq = MOCK_LOANS.length + 1;

  MOCK_LOANS.push({
    id: loanId,
    loanNumber: formatLoanNumber(seq),
    customerId: customer.id,
    loanProductId: product.id,
    repaymentScheduleId: values.repaymentScheduleId,
    groupId: values.groupId ?? null,
    branchId: customer.branchId,
    officerId: actor.id,
    principalAmount: values.principalAmount,
    interestRateSnapshot: product.interestRate,
    penaltyRateSnapshot: product.penaltyRate,
    tenureDays: values.tenureDays,
    requiresMandateSnapshot: product.requiresMandate,
    status: "pending_manager_approval",
    disbursementDate: null,
    expectedCompletionDate: null,
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    closedAt: null,
    frozenUntil: null,
    createdBy: actor.id,
    deletedAt: null,
  });

  recordTransition(loanId, null, "draft", actor.id, null);
  recordTransition(loanId, "draft", "pending_manager_approval", actor.id, "Application submitted");
  logLoanAudit(AUDIT_ACTIONS.LOAN_APPLIED, loanId, actor.id);

  revalidatePath("/loans");
  return { ok: true, message: "Loan application submitted for manager approval.", loanId };
}

// ---------------------------------------------------------------------------
// Manager approval — separation of duties (backend §14)
// ---------------------------------------------------------------------------

export async function decideLoanApproval(loanId: string, decision: "approve" | "reject", reason?: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_APPROVE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "pending_manager_approval") {
    return { ok: false, message: "This loan is not awaiting manager approval." };
  }
  // Backend §14: the officer who created an application can never record its approval.
  if (loan.createdBy === actor.id) {
    return { ok: false, message: "You can't approve an application you submitted yourself." };
  }
  if (decision === "reject" && !reason?.trim()) {
    return { ok: false, message: "A rejection reason is required." };
  }

  if (decision === "reject") {
    const result = transition(loanId, "rejected", actor.id, reason ?? null);
    if (!result.ok) return result;
    loan.rejectedReason = reason ?? null;
    logLoanAudit(AUDIT_ACTIONS.LOAN_REJECTED, loanId, actor.id);
    revalidateLoan(loanId);
    return { ok: true, message: "Loan application rejected." };
  }

  // Approval generates the repayment schedule (pure computation, no ledger yet — §6).
  const product = MOCK_LOAN_PRODUCTS.find((p) => p.id === loan.loanProductId);
  const formula = MOCK_INTEREST_FORMULAS.find((f) => f.id === product?.interestFormulaId);
  const schedule = MOCK_REPAYMENT_SCHEDULES.find((s) => s.id === loan.repaymentScheduleId);
  if (!product || !formula || !schedule) return { ok: false, message: "Loan configuration is incomplete." };

  const next: LoanStatus = loan.requiresMandateSnapshot ? "mandate_pending_otp" : "pending_credit_review";
  const result = transition(loanId, next, actor.id, "Approved by manager");
  if (!result.ok) return result;

  loan.approvedBy = actor.id;
  loan.approvedAt = new Date().toISOString();

  const generated = generateLoanSchedule({
    loanId,
    principalAmount: loan.principalAmount,
    interestRate: loan.interestRateSnapshot,
    tenureDays: loan.tenureDays,
    frequencyDays: schedule.frequencyDays,
    interestFormulaCode: formula.code,
    startDate: new Date(),
  });
  generated.forEach((installment, i) => MOCK_LOAN_SCHEDULES.push({ ...installment, id: `sched-${loanId}-${i + 1}` }));

  if (loan.requiresMandateSnapshot) {
    const bank = MOCK_CUSTOMER_BANK_DETAILS.find((b) => b.customerId === loan.customerId);
    MOCK_E_MANDATES.push({
      id: nextId("mandate"),
      loanId,
      bankName: bank?.bankName ?? "Unknown Bank",
      otpReference: null,
      status: "pending_otp",
      failureReason: null,
      verifiedAt: null,
    });
  }

  logLoanAudit(AUDIT_ACTIONS.LOAN_APPROVED, loanId, actor.id);
  revalidateLoan(loanId);
  return {
    ok: true,
    message: loan.requiresMandateSnapshot ? "Approved — E-Mandate OTP required next." : "Approved — sent to credit review.",
  };
}

// ---------------------------------------------------------------------------
// E-Mandate
// ---------------------------------------------------------------------------

export async function verifyMandateOtp(loanId: string, otp: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_CREATE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "mandate_pending_otp") return { ok: false, message: "This loan is not awaiting a mandate OTP." };

  const mandate = MOCK_E_MANDATES.find((m) => m.loanId === loanId && m.status === "pending_otp");
  if (!mandate) return { ok: false, message: "No pending mandate found for this loan." };

  if (otp !== MANDATE_OTP) {
    mandate.status = "failed";
    mandate.failureReason = "Incorrect OTP supplied by customer.";
    const failed = transition(loanId, "mandate_failed", actor.id, "Mandate OTP verification failed");
    if (!failed.ok) return failed;
    revalidateLoan(loanId);
    return { ok: false, message: "Incorrect OTP — mandate marked failed. You can retry." };
  }

  mandate.status = "active";
  mandate.otpReference = nextId("otpref");
  mandate.verifiedAt = new Date().toISOString();
  const ok = transition(loanId, "mandate_active", actor.id, "Mandate verified");
  if (!ok.ok) return ok;

  // Mandate active immediately advances to credit review — §10.
  transition(loanId, "pending_credit_review", actor.id, "Mandate active");
  revalidateLoan(loanId);
  return { ok: true, message: "E-Mandate verified — sent to credit review." };
}

export async function retryMandate(loanId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_CREATE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "mandate_failed") return { ok: false, message: "This loan has no failed mandate to retry." };

  const bank = MOCK_CUSTOMER_BANK_DETAILS.find((b) => b.customerId === loan.customerId);
  MOCK_E_MANDATES.push({
    id: nextId("mandate"),
    loanId,
    bankName: bank?.bankName ?? "Unknown Bank",
    otpReference: null,
    status: "pending_otp",
    failureReason: null,
    verifiedAt: null,
  });

  const result = transition(loanId, "mandate_pending_otp", actor.id, "Mandate retried");
  if (!result.ok) return result;
  revalidateLoan(loanId);
  return { ok: true, message: `New mandate OTP sent. (Demo OTP: ${MANDATE_OTP})` };
}

// ---------------------------------------------------------------------------
// Credit review — telco verification (Credit Officer, strictly branch-scoped)
// ---------------------------------------------------------------------------

export async function runTelcoVerification(loanId: string, pass: boolean): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_CREDIT_REVIEW);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "pending_credit_review") return { ok: false, message: "This loan is not in credit review." };

  // Backend §13: Credit Officers are strictly branch-scoped, no exception.
  const crossBranch = actor.branchId !== loan.branchId;
  const mayActCrossBranch = hasPermission(actor, PERMISSIONS.LOANS_REVIEW_CROSS_BRANCH);
  if (crossBranch && !mayActCrossBranch) {
    return { ok: false, message: "This loan belongs to another branch and you don't hold cross-branch review permission." };
  }

  const customer = MOCK_CUSTOMERS.find((c) => c.id === loan.customerId);
  MOCK_TELCO_VERIFICATIONS.push({
    id: nextId("telco"),
    loanId,
    provider: "vodacom",
    requestPayload: { phone: customer?.phone ?? "", nida: customer?.nidaNumber ?? "" },
    responsePayload: { matched: pass },
    status: pass ? "success" : "failed",
    verifiedAt: new Date().toISOString(),
  });

  if (!pass) {
    const result = transition(loanId, "rejected", actor.id, "Telco verification failed");
    if (!result.ok) return result;
    loan.rejectedReason = "Telco KYC verification failed.";
    logLoanAudit(AUDIT_ACTIONS.LOAN_REJECTED, loanId, actor.id);
    revalidateLoan(loanId);
    return { ok: true, message: "Telco verification failed — loan rejected." };
  }

  const result = transition(loanId, "pending_finance", actor.id, "Telco verification passed");
  if (!result.ok) return result;
  revalidateLoan(loanId);
  return { ok: true, message: "Telco verification passed — sent to Finance." };
}

// ---------------------------------------------------------------------------
// Disbursement — Finance only (backend §14)
// ---------------------------------------------------------------------------

export async function prepareDisbursement(loanId: string, channel: DisbursementChannel): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_DISBURSE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "pending_finance") return { ok: false, message: "This loan is not awaiting Finance." };

  const result = transition(loanId, "awaiting_disbursement", actor.id, "Disbursement batch prepared");
  if (!result.ok) return result;

  MOCK_DISBURSEMENT_BATCHES.push({
    id: nextId("batch"),
    loanId,
    batchReference: disbursementBatchReference(MOCK_DISBURSEMENT_BATCHES.length + 1, 1),
    attemptNumber: 1,
    channel,
    status: "pending",
    failureReason: null,
    requestedBy: actor.id,
    requestedAt: new Date().toISOString(),
    completedAt: null,
  });

  revalidateLoan(loanId);
  return { ok: true, message: "Disbursement batch prepared and sent to the provider." };
}

/**
 * Stands in for POST /webhooks/vodacom/disbursement-status. The system never
 * assumes success from its own outbound call — only this callback flips the
 * batch, and only a success posts to the ledger (backend §6).
 */
export async function settleDisbursement(loanId: string, success: boolean, failureReason?: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_DISBURSE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "awaiting_disbursement") return { ok: false, message: "This loan has no disbursement in flight." };

  const batch = MOCK_DISBURSEMENT_BATCHES.filter((b) => b.loanId === loanId && b.status === "pending").sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
  if (!batch) return { ok: false, message: "No pending disbursement batch found." };

  batch.completedAt = new Date().toISOString();

  if (!success) {
    batch.status = "failed";
    batch.failureReason = failureReason ?? "Provider rejected the transfer.";
    const result = transition(loanId, "disbursement_failed", actor.id, batch.failureReason);
    if (!result.ok) return result;
    revalidateLoan(loanId);
    return { ok: true, message: "Disbursement failed — you can retry or escalate." };
  }

  batch.status = "success";
  const result = transition(loanId, "active", actor.id, "Disbursement confirmed by provider");
  if (!result.ok) return result;

  const today = new Date();
  loan.disbursementDate = today.toISOString().slice(0, 10);
  const completion = new Date(today);
  completion.setDate(completion.getDate() + loan.tenureDays);
  loan.expectedCompletionDate = completion.toISOString().slice(0, 10);

  // Ledger posts here and nowhere else: Dr Loan Receivable / Cr Principal (§5).
  postEntry({
    date: today.toISOString(),
    description: `Disbursement — ${loan.loanNumber}`,
    sourceType: "loan_disbursement",
    sourceId: loan.id,
    createdBy: actor.id,
    lines: [
      { accountId: LOAN_RECEIVABLE_ACCOUNT_ID, debit: loan.principalAmount, branchId: loan.branchId, customerId: loan.customerId, loanId: loan.id },
      { accountId: PRINCIPAL_ACCOUNT_ID, credit: loan.principalAmount, branchId: loan.branchId, loanId: loan.id },
    ],
  });

  logLoanAudit(AUDIT_ACTIONS.LOAN_DISBURSED, loanId, actor.id);
  revalidateLoan(loanId);
  revalidatePath("/ledger");
  return { ok: true, message: "Disbursement confirmed — loan is now active and posted to the ledger." };
}

export async function retryDisbursement(loanId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_DISBURSE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (loan.status !== "disbursement_failed") return { ok: false, message: "There's no failed disbursement to retry." };

  const attempts = MOCK_DISBURSEMENT_BATCHES.filter((b) => b.loanId === loanId).length;
  if (attempts >= MAX_DISBURSEMENT_ATTEMPTS) {
    const escalated = transition(loanId, "escalated", actor.id, `Escalated after ${attempts} failed attempts`);
    if (!escalated.ok) return escalated;
    revalidateLoan(loanId);
    return { ok: false, message: `Maximum ${MAX_DISBURSEMENT_ATTEMPTS} attempts reached — loan escalated for manual decision.` };
  }

  const result = transition(loanId, "awaiting_disbursement", actor.id, `Retry attempt ${attempts + 1}`);
  if (!result.ok) return result;

  const previous = MOCK_DISBURSEMENT_BATCHES.filter((b) => b.loanId === loanId).sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
  MOCK_DISBURSEMENT_BATCHES.push({
    id: nextId("batch"),
    loanId,
    batchReference: disbursementBatchReference(MOCK_DISBURSEMENT_BATCHES.length + 1, attempts + 1),
    attemptNumber: attempts + 1,
    channel: previous?.channel ?? "vodacom",
    status: "pending",
    failureReason: null,
    requestedBy: actor.id,
    requestedAt: new Date().toISOString(),
    completedAt: null,
  });

  logLoanAudit(AUDIT_ACTIONS.DISBURSEMENT_RETRIED, loanId, actor.id);
  revalidateLoan(loanId);
  return { ok: true, message: `Retry attempt ${attempts + 1} sent to the provider.` };
}

export async function cancelLoan(loanId: string, reason: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_APPROVE);
  if (isDenied(actor)) return actor;
  if (!reason.trim()) return { ok: false, message: "A cancellation reason is required." };

  const result = transition(loanId, "cancelled", actor.id, reason);
  if (!result.ok) return result;
  revalidateLoan(loanId);
  return { ok: true, message: "Loan cancelled." };
}

// ---------------------------------------------------------------------------
// Closure
// ---------------------------------------------------------------------------

export async function closeLoan(loanId: string, freezeDays: number): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LOANS_APPROVE);
  if (isDenied(actor)) return actor;

  const loan = MOCK_LOANS.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: "Loan not found." };

  const outstanding = MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loanId).reduce(
    (sum, s) => sum + (s.principalDue - s.principalPaid) + (s.interestDue - s.interestPaid) + (s.penaltyDue - s.penaltyPaid),
    0
  );
  if (outstanding > 0.01) {
    return { ok: false, message: `Can't close — ${outstanding.toLocaleString()} still outstanding.` };
  }

  const result = transition(loanId, "closed", actor.id, "Loan fully repaid and closed");
  if (!result.ok) return result;

  const today = new Date();
  loan.closedAt = today.toISOString();
  const freezeUntil = new Date(today);
  freezeUntil.setDate(freezeUntil.getDate() + freezeDays);
  loan.frozenUntil = freezeUntil.toISOString().slice(0, 10);

  revalidateLoan(loanId);
  return { ok: true, message: `Loan closed. Customer is in cooldown until ${loan.frozenUntil}.` };
}
