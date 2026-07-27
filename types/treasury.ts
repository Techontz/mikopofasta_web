import { z } from "zod";
import { ACTIVE_INACTIVE } from "@/types/enums";

export const BankAccountSchema = z.object({
  id: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  /** 1:1 auto-created ledger account — backend §2.2. */
  chartAccountId: z.string(),
  status: z.enum(ACTIVE_INACTIVE),
  deletedAt: z.string().nullable(),
});
export type BankAccount = z.infer<typeof BankAccountSchema>;

export const CapitalContributionSchema = z.object({
  id: z.string(),
  contributorName: z.string(),
  amount: z.number().positive(),
  bankAccountId: z.string(),
  journalEntryId: z.string(),
  contributedAt: z.string(),
});
export type CapitalContribution = z.infer<typeof CapitalContributionSchema>;

/** 70% reinvestment / 30% shareholders, per backend §5. */
export const DividendSchema = z.object({
  id: z.string(),
  period: z.string(),
  totalProfit: z.number().nonnegative(),
  reinvestmentAmount: z.number().nonnegative(),
  shareholderAmount: z.number().nonnegative(),
  journalEntryId: z.string(),
  distributedAt: z.string(),
});
export type Dividend = z.infer<typeof DividendSchema>;
