import { z } from "zod";
import {
  DISBURSEMENT_CHANNELS,
  DISBURSEMENT_STATUSES,
  E_MANDATE_STATUSES,
  LOAN_SCHEDULE_STATUSES,
  LOAN_STATUSES,
  TELCO_VERIFICATION_STATUSES,
} from "@/types/enums";

/** The loan aggregate — backend spec §2.5. */
export const LoanSchema = z.object({
  id: z.string(),
  loanNumber: z.string(),
  customerId: z.string(),
  loanProductId: z.string(),
  repaymentScheduleId: z.string(),
  groupId: z.string().nullable(),
  branchId: z.string(),
  officerId: z.string(),
  principalAmount: z.number().positive(),
  /** Copied from the product at application time — immune to later product edits. */
  interestRateSnapshot: z.number().nonnegative(),
  penaltyRateSnapshot: z.number().nonnegative(),
  tenureDays: z.number().int().positive(),
  requiresMandateSnapshot: z.boolean(),
  status: z.enum(LOAN_STATUSES),
  disbursementDate: z.string().nullable(),
  expectedCompletionDate: z.string().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedReason: z.string().nullable(),
  closedAt: z.string().nullable(),
  frozenUntil: z.string().nullable(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),

  /**
   * Early settlement — client Decision 1, Option B.
   *
   * Always present, because they describe the loan itself: `earlySettledAt` is
   * null and `interestWaived` is 0 on a loan that simply ran its course, which
   * is what tells a settlement apart from an ordinary closure.
   */
  earlySettledAt: z.string().nullable(),
  interestWaived: z.number().nonnegative(),
});
export type Loan = z.infer<typeof LoanSchema>;

/**
 * The settlement record, served whole.
 *
 * Every figure here is the backend's. `amountPaid` especially is not
 * recoverable in the browser: the waiver reduced the balance before the money
 * was taken, so subtracting outstanding from payable would give what was owed
 * before forgiveness rather than what the customer actually handed over.
 *
 * `amountPaid` and `reference` are null when the waiver alone settled the loan
 * — a balance made entirely of unearned interest takes no cash, so there is no
 * payment to reference. The officer is recorded either way.
 */
export const EarlySettlementRecordSchema = z.object({
  settledAt: z.string(),
  interestWaived: z.number().nonnegative(),
  amountPaid: z.number().nonnegative().nullable(),
  reference: z.string().nullable(),
  officerId: z.string().nullable(),
  officerName: z.string().nullable(),
});
export type EarlySettlementRecord = z.infer<typeof EarlySettlementRecordSchema>;

export const LoanStatusHistorySchema = z.object({
  id: z.string(),
  loanId: z.string(),
  fromStatus: z.enum(LOAN_STATUSES).nullable(),
  toStatus: z.enum(LOAN_STATUSES),
  changedBy: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: z.string(),
});
export type LoanStatusHistory = z.infer<typeof LoanStatusHistorySchema>;

export const LoanScheduleSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  installmentNumber: z.number().int().positive(),
  dueDate: z.string(),
  principalDue: z.number().nonnegative(),
  interestDue: z.number().nonnegative(),
  penaltyDue: z.number().nonnegative(),
  principalPaid: z.number().nonnegative(),
  interestPaid: z.number().nonnegative(),
  penaltyPaid: z.number().nonnegative(),
  status: z.enum(LOAN_SCHEDULE_STATUSES),
});
export type LoanSchedule = z.infer<typeof LoanScheduleSchema>;

export function scheduleOutstanding(s: LoanSchedule) {
  return {
    principal: s.principalDue - s.principalPaid,
    interest: s.interestDue - s.interestPaid,
    penalty: s.penaltyDue - s.penaltyPaid,
    total: s.principalDue + s.interestDue + s.penaltyDue - (s.principalPaid + s.interestPaid + s.penaltyPaid),
  };
}

export const EMandateSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  bankName: z.string(),
  otpReference: z.string().nullable(),
  status: z.enum(E_MANDATE_STATUSES),
  failureReason: z.string().nullable(),
  verifiedAt: z.string().nullable(),
});
export type EMandate = z.infer<typeof EMandateSchema>;

export const TelcoVerificationSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  provider: z.string(),
  requestPayload: z.record(z.string(), z.unknown()),
  responsePayload: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(TELCO_VERIFICATION_STATUSES),
  verifiedAt: z.string().nullable(),
});
export type TelcoVerification = z.infer<typeof TelcoVerificationSchema>;

export const DisbursementBatchSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  batchReference: z.string(),
  attemptNumber: z.number().int().positive(),
  channel: z.enum(DISBURSEMENT_CHANNELS),
  status: z.enum(DISBURSEMENT_STATUSES),
  failureReason: z.string().nullable(),
  requestedBy: z.string(),
  requestedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type DisbursementBatch = z.infer<typeof DisbursementBatchSchema>;

export const LoanTopupSchema = z.object({
  id: z.string(),
  originalLoanId: z.string(),
  newLoanId: z.string(),
  eligibilitySnapshot: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
export type LoanTopup = z.infer<typeof LoanTopupSchema>;

// ---------------------------------------------------------------------------
// Request-shape schemas — one per distinct lifecycle action (backend §15.2).
// ---------------------------------------------------------------------------

/** POST /loans */
export const LoanApplicationInputSchema = z.object({
  customerId: z.string(),
  loanProductId: z.string(),
  repaymentScheduleId: z.string(),
  principalAmount: z.number().positive(),
  tenureDays: z.number().int().positive(),
  groupId: z.string().nullable().optional(),
});
export type LoanApplicationInput = z.infer<typeof LoanApplicationInputSchema>;

/** POST /loans/{id}/approve-manager */
export const LoanApprovalInputSchema = z.object({
  loanId: z.string(),
  decision: z.enum(["approve", "reject", "modify"]),
  reason: z.string().optional(),
});
export type LoanApprovalInput = z.infer<typeof LoanApprovalInputSchema>;

/** POST /loans/{id}/prepare-disbursement */
export const PrepareDisbursementInputSchema = z.object({
  loanId: z.string(),
  channel: z.enum(DISBURSEMENT_CHANNELS),
});
export type PrepareDisbursementInput = z.infer<typeof PrepareDisbursementInputSchema>;

/** POST /loans/{id}/retry-disbursement — max 3 attempts (backend §6). */
export const RetryDisbursementInputSchema = z.object({
  loanId: z.string(),
  previousBatchId: z.string(),
});
export type RetryDisbursementInput = z.infer<typeof RetryDisbursementInputSchema>;

/** POST /loans/{id}/close */
export const CloseLoanInputSchema = z.object({
  loanId: z.string(),
  freezeDays: z.number().int().nonnegative().default(30),
});
export type CloseLoanInput = z.infer<typeof CloseLoanInputSchema>;
