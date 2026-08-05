import { z } from "zod";
import { ACTIVE_INACTIVE, PENALTY_TYPES } from "@/types/enums";

export const InterestFormulaSchema = z.object({
  id: z.string(),
  name: z.string(),
  /*
   * A plain string, not an enum.
   *
   * The server's formula registry decides what can be priced, and adding a
   * formula there is a row plus a class. A closed enum here would make the
   * loan-product screens fail to parse the moment one was added — refusing to
   * render a page because it did not recognise a NAME.
   */
  code: z.string(),
  description: z.string().nullable(),
  /** Which formula a new product starts on — client Decision 2. */
  isDefault: z.boolean().optional(),
  deletedAt: z.string().nullable(),
});
export type InterestFormula = z.infer<typeof InterestFormulaSchema>;

export const RepaymentScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  frequencyDays: z.number().int().positive(),
  deletedAt: z.string().nullable(),
});
export type RepaymentSchedule = z.infer<typeof RepaymentScheduleSchema>;

/**
 * Fully configurable — backend spec §2.3/§6. Nothing about tenure, amount,
 * interest, mandate, or penalty is ever hardcoded; the loan engine reads
 * this row (plus the two pivots below) for every decision.
 */
export const LoanProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  interestFormulaId: z.string(),
  interestRate: z.number().nonnegative(),
  minAmount: z.number().positive(),
  maxAmount: z.number().positive(),
  minTenureDays: z.number().int().positive(),
  maxTenureDays: z.number().int().positive(),
  penaltyType: z.enum(PENALTY_TYPES),
  penaltyRate: z.number().nonnegative(),
  penaltyGraceDays: z.number().int().nonnegative(),
  penaltyCapAmount: z.number().positive().nullable(),
  requiresMandate: z.boolean(),
  status: z.enum(ACTIVE_INACTIVE),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type LoanProduct = z.infer<typeof LoanProductSchema>;

/** Which repayment schedules a given product allows (backend spec §2.3). */
export const LoanProductRepaymentScheduleSchema = z.object({
  id: z.string(),
  loanProductId: z.string(),
  repaymentScheduleId: z.string(),
});
export type LoanProductRepaymentSchedule = z.infer<typeof LoanProductRepaymentScheduleSchema>;

/** Category -> Product eligibility rule engine (backend spec §2.3). */
export const CategoryProductEligibilitySchema = z.object({
  id: z.string(),
  customerCategoryId: z.string(),
  loanProductId: z.string(),
  maxAmountOverride: z.number().positive().nullable(),
  requiresExtraApproval: z.boolean(),
});
export type CategoryProductEligibility = z.infer<typeof CategoryProductEligibilitySchema>;

export const CreateLoanProductInputSchema = LoanProductSchema.pick({
  name: true,
  code: true,
  interestFormulaId: true,
  interestRate: true,
  minAmount: true,
  maxAmount: true,
  minTenureDays: true,
  maxTenureDays: true,
  penaltyType: true,
  penaltyRate: true,
  penaltyGraceDays: true,
  penaltyCapAmount: true,
  requiresMandate: true,
}).extend({ penaltyCapAmount: z.number().positive().nullable().optional() });
export type CreateLoanProductInput = z.infer<typeof CreateLoanProductInputSchema>;
