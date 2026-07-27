import { z } from "zod";
import { ACCOUNT_TYPES, ACTIVE_INACTIVE, JOURNAL_SOURCE_TYPES, REVERSAL_STATUSES } from "@/types/enums";

/**
 * Backend spec §2.7/§5 — the ledger is the single source of truth. Customer,
 * Loan, Staff, and Branch "ledgers" are NOT separate tables/types here
 * either — they're just journalEntryLines filtered by the matching id, per
 * the backend's own modeling choice.
 */
export const ChartOfAccountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  parentAccountId: z.string().nullable(),
  /** true for the 19 fixed system accounts; false for dynamic (expense/bank/branch-cash). */
  isSystem: z.boolean(),
  branchId: z.string().nullable(),
  status: z.enum(ACTIVE_INACTIVE),
  deletedAt: z.string().nullable(),
});
export type ChartOfAccount = z.infer<typeof ChartOfAccountSchema>;

export const JournalEntrySchema = z.object({
  id: z.string(),
  entryNumber: z.string(),
  entryDate: z.string(),
  description: z.string(),
  sourceType: z.enum(JOURNAL_SOURCE_TYPES),
  sourceId: z.string().nullable(),
  isReversal: z.boolean(),
  reversedEntryId: z.string().nullable(),
  createdBy: z.string(),
  postedAt: z.string(),
});
export type JournalEntry = z.infer<typeof JournalEntrySchema>;

/** Immutable — no deletedAt, never mutated post-insert (backend §8). */
export const JournalEntryLineSchema = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  accountId: z.string(),
  debitAmount: z.number().nonnegative(),
  creditAmount: z.number().nonnegative(),
  branchId: z.string().nullable(),
  customerId: z.string().nullable(),
  loanId: z.string().nullable(),
  staffProfileId: z.string().nullable(),
});
export type JournalEntryLine = z.infer<typeof JournalEntryLineSchema>;

export const AccountBalanceSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  branchId: z.string().nullable(),
  balance: z.number(),
  lastUpdatedAt: z.string(),
});
export type AccountBalance = z.infer<typeof AccountBalanceSchema>;

export const ReversalRequestSchema = z.object({
  id: z.string(),
  journalEntryId: z.string(),
  requestedBy: z.string(),
  reason: z.string(),
  approvedBy: z.string().nullable(),
  status: z.enum(REVERSAL_STATUSES),
});
export type ReversalRequest = z.infer<typeof ReversalRequestSchema>;

/** POST /ledger/{entry}/reverse */
export const ReverseEntryInputSchema = z.object({
  journalEntryId: z.string(),
  reason: z.string().min(3),
});
export type ReverseEntryInput = z.infer<typeof ReverseEntryInputSchema>;

/** The 18 fixed system account codes (backend §5) — used by seed data and the posting engine. */
export const SYSTEM_ACCOUNT_CODES = {
  CAPITAL: "1000",
  PRINCIPAL: "1100",
  LOAN_RECEIVABLE: "1200",
  OUTSTANDING_LOAN: "1300",
  OUTSTANDING_INTEREST: "1400",
  INTEREST_INCOME: "2000",
  FEE_INCOME: "2100",
  PENALTY_INCOME: "2200",
  RESERVE: "3000",
  PROFIT: "3100",
  LOAN_ARREARS: "4000",
  DEFAULT_LOAN: "4100",
  WRITE_OFF: "4200",
  RECOVERED_LOANS: "4300",
  SUSPENSE: "5000",
  STAFF_FUND: "7000",
  DIVIDEND: "7100",
  OFFSET: "7200",
} as const;
