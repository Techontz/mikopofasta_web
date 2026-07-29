import type { LoanStatus } from "@/types/enums";

/**
 * The loan lifecycle state machine — backend spec §10, encoded once so both
 * the UI (which actions to offer) and the Server Actions (whether a
 * transition is legal) read from the same table rather than each
 * re-deriving the rules.
 */
/*
 * The §10 transition table and `canTransition` used to live here, and
 * `MAX_DISBURSEMENT_ATTEMPTS` with them. Every transition is now decided by the
 * API — an illegal one comes back as a 409 naming both states, and the attempt
 * ceiling is enforced where the attempts are counted. What remains below is
 * presentation: the labels, tones and the two lifecycle groupings the loans
 * list uses for its tiles.
 */

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  draft: "Draft",
  pending_manager_approval: "Pending Manager Approval",
  rejected: "Rejected",
  mandate_pending_otp: "Mandate — Pending OTP",
  mandate_failed: "Mandate Failed",
  mandate_active: "Mandate Active",
  pending_credit_review: "Pending Credit Review",
  pending_finance: "Pending Finance",
  awaiting_disbursement: "Awaiting Disbursement",
  disbursement_failed: "Disbursement Failed",
  escalated: "Escalated",
  active: "Active",
  arrears: "In Arrears",
  defaulted: "Defaulted",
  written_off: "Written Off",
  recovered: "Recovered",
  closed: "Closed",
  frozen: "Frozen",
  cancelled: "Cancelled",
};

export type LoanStatusTone = "neutral" | "progress" | "good" | "warn" | "bad";

export const LOAN_STATUS_TONE: Record<LoanStatus, LoanStatusTone> = {
  draft: "neutral",
  pending_manager_approval: "progress",
  rejected: "bad",
  mandate_pending_otp: "progress",
  mandate_failed: "bad",
  mandate_active: "progress",
  pending_credit_review: "progress",
  pending_finance: "progress",
  awaiting_disbursement: "progress",
  disbursement_failed: "bad",
  escalated: "bad",
  active: "good",
  arrears: "warn",
  defaulted: "bad",
  written_off: "bad",
  recovered: "good",
  closed: "neutral",
  frozen: "warn",
  cancelled: "neutral",
};

/** Statuses where the loan is still working its way toward disbursement. */
export const ORIGINATION_STATUSES: LoanStatus[] = [
  "draft",
  "pending_manager_approval",
  "mandate_pending_otp",
  "mandate_failed",
  "mandate_active",
  "pending_credit_review",
  "pending_finance",
  "awaiting_disbursement",
  "disbursement_failed",
  "escalated",
];

/** Statuses where money is out and a live balance exists. */
export const OPEN_BOOK_STATUSES: LoanStatus[] = ["active", "arrears", "defaulted", "frozen"];

