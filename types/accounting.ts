import { z } from "zod";

/**
 * Month-end close, the Reserve fund, and bad debt.
 *
 * Mirrors the API's Accounting resources and Decision Register D1: reserve is
 * calculated from realised profit during the close, spending it requires Admin
 * approval, and the fund belongs to Headquarters rather than to any branch.
 *
 * Money arrives as decimal strings and is coerced once, at the API boundary —
 * the same discipline every other module here follows.
 */

export const PERIOD_STATUSES = ["open", "closed"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const PeriodBranchResultSchema = z.object({
  branchId: z.string(),
  branchName: z.string().nullable(),
  incomeTotal: z.number(),
  expenseTotal: z.number(),
  /** Signed: a branch in loss carries a negative figure. */
  realisedProfit: z.number(),
  /** Never negative — a loss-making branch appropriates no reserve. */
  reserveAppropriated: z.number(),
});
export type PeriodBranchResult = z.infer<typeof PeriodBranchResultSchema>;

export const AccountingPeriodSchema = z.object({
  id: z.string(),
  /** `YYYY-MM`. */
  period: z.string(),
  status: z.enum(PERIOD_STATUSES),
  incomeTotal: z.number(),
  expenseTotal: z.number(),
  realisedProfit: z.number(),
  /**
   * The rate at the moment of close, not the current setting. A period closed
   * at one rate and read after the rate changed would otherwise look like bad
   * arithmetic.
   */
  reservePercentage: z.number(),
  reserveAppropriated: z.number(),
  profitJournalEntryId: z.string().nullable(),
  reserveJournalEntryId: z.string().nullable(),
  closedAt: z.string().nullable(),
  closedByName: z.string().nullable().optional(),
  notes: z.string().nullable(),
  branchResults: z.array(PeriodBranchResultSchema).optional(),
});
export type AccountingPeriod = z.infer<typeof AccountingPeriodSchema>;

/**
 * What closing a period WOULD produce, without producing it.
 *
 * The preview exists because there is no reopen: D1 puts reserve appropriation
 * inside the close, and reopening would mean un-appropriating reserve Admin may
 * already have released.
 */
export const PeriodPreviewSchema = z.object({
  period: z.string(),
  alreadyClosed: z.boolean(),
  incomeTotal: z.number(),
  expenseTotal: z.number(),
  realisedProfit: z.number(),
  branches: z.array(
    z.object({
      branchId: z.string().nullable(),
      incomeTotal: z.number(),
      expenseTotal: z.number(),
      realisedProfit: z.number(),
    })
  ),
});
export type PeriodPreview = z.infer<typeof PeriodPreviewSchema>;

export const ClosePeriodInputSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Give the period as YYYY-MM, for example 2026-07."),
  notes: z.string().max(500).optional(),
});
export type ClosePeriodInput = z.infer<typeof ClosePeriodInputSchema>;

/* -------------------------------------------------------------------------- */
/* Reserve                                                                     */
/* -------------------------------------------------------------------------- */

export const RESERVE_PURPOSES = [
  "return_to_capital",
  "new_branch",
  "new_department",
  "other",
] as const;
export type ReservePurpose = (typeof RESERVE_PURPOSES)[number];

export const RESERVE_PURPOSE_LABELS: Record<ReservePurpose, string> = {
  return_to_capital: "Return to Capital",
  new_branch: "Open New Branch",
  new_department: "Start New Department",
  other: "Other",
};

export const RESERVE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReserveStatus = (typeof RESERVE_STATUSES)[number];

export const ReserveUtilisationSchema = z.object({
  id: z.string(),
  reference: z.string(),
  purpose: z.enum(RESERVE_PURPOSES),
  purposeLabel: z.string(),
  amount: z.number(),
  narrative: z.string(),
  status: z.enum(RESERVE_STATUSES),
  decisionReason: z.string().nullable(),
  createdAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  /**
   * Null while pending or rejected. Reserve moves on approval, so its absence
   * is how a screen knows nothing has left the fund.
   */
  journalEntryId: z.string().nullable(),
  requestedBy: z.string(),
  targetBranchName: z.string().nullable().optional(),
  requesterName: z.string().nullable().optional(),
  approverName: z.string().nullable().optional(),
});
export type ReserveUtilisation = z.infer<typeof ReserveUtilisationSchema>;

/**
 * Mirrors the API's StoreReserveUtilisationRequest.
 *
 * There is no destination account. Every purpose posts `Dr Reserve · Cr
 * Capital` — the reserve is a control account holding no cash, so a release
 * un-reserves equity rather than moving money, and the branch or department is
 * then funded from capital.
 */
export const ReserveUtilisationInputSchema = z.object({
  purpose: z.enum(RESERVE_PURPOSES),
  amount: z.number({ message: "Enter an amount." }).gt(0, "Enter an amount greater than zero."),
  narrative: z.string().min(10, "Explain what the reserve is being used for.").max(500),
  targetBranchId: z.string().optional(),
});
export type ReserveUtilisationInput = z.infer<typeof ReserveUtilisationInputSchema>;

/* -------------------------------------------------------------------------- */
/* Bad debt                                                                    */
/* -------------------------------------------------------------------------- */

export const WriteOffSchema = z.object({
  id: z.string(),
  loanId: z.string(),
  loanNumber: z.string().nullable().optional(),
  /** The only figure that reached the ledger. */
  principalWrittenOff: z.number(),
  /**
   * Recorded, never posted: interest and penalty are recognised on collection,
   * so uncollected amounts were never income and there is nothing to reverse.
   * The recovery officer still needs to know what the borrower owed.
   */
  interestForgone: z.number(),
  penaltyForgone: z.number(),
  recoveredToDate: z.number(),
  outstanding: z.number(),
  reason: z.string(),
  journalEntryId: z.string().nullable(),
  approvedByName: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
});
export type WriteOff = z.infer<typeof WriteOffSchema>;

export const RecoverySchema = z.object({
  id: z.string(),
  loanId: z.string(),
  loanNumber: z.string().nullable().optional(),
  writeOffId: z.string(),
  amount: z.number(),
  narrative: z.string().nullable(),
  journalEntryId: z.string().nullable(),
  recordedByName: z.string().nullable().optional(),
  createdAt: z.string().nullable(),
});
export type Recovery = z.infer<typeof RecoverySchema>;

export const WriteOffInputSchema = z.object({
  reason: z.string().min(10, "Explain why this loan is being written off.").max(500),
});
export type WriteOffInput = z.infer<typeof WriteOffInputSchema>;

export const RecoveryInputSchema = z.object({
  amount: z.number({ message: "Enter an amount." }).gt(0, "Enter an amount greater than zero."),
  bankAccountId: z.string().optional(),
  narrative: z.string().max(500).optional(),
});
export type RecoveryInput = z.infer<typeof RecoveryInputSchema>;

/* -------------------------------------------------------------------------- */
/* Cash deposits — bank reconciliation                                         */
/* -------------------------------------------------------------------------- */

export const CASH_DEPOSIT_STATUSES = ["pending", "matched", "confirmed"] as const;
export type CashDepositStatus = (typeof CASH_DEPOSIT_STATUSES)[number];

export const CashDepositSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  branchName: z.string().nullable().optional(),
  bankAccountId: z.string(),
  bankAccountName: z.string().nullable().optional(),
  tellerName: z.string().nullable().optional(),
  amount: z.number(),
  status: z.enum(CASH_DEPOSIT_STATUSES),
  paymentIds: z.array(z.string()),
  /**
   * Whether a slip exists, never where it is — the path is on a private disk
   * and a URL here would invite a caller to fetch it directly.
   */
  hasSlip: z.boolean(),
  reconciledAt: z.string().nullable(),
  journalEntryId: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type CashDeposit = z.infer<typeof CashDepositSchema>;

export const CashDepositInputSchema = z.object({
  branchId: z.string().min(1, "Select a branch."),
  bankAccountId: z.string().min(1, "Select the bank account."),
  amount: z.number({ message: "Enter an amount." }).gt(0, "Enter an amount greater than zero."),
  paymentIds: z.array(z.string()).min(1, "Select at least one payment."),
});
export type CashDepositInput = z.infer<typeof CashDepositInputSchema>;
