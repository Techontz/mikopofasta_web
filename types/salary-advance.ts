import { z } from "zod";

/**
 * The Salary Advance module's shapes.
 *
 * One advance record carries every column the six screens show; each screen is
 * a filter over it plus the columns that stage cares about. Modelling it once
 * is what keeps "Principal + Interest" and "Remaining Amount" identical on the
 * Requested, Approved, Active and Repayment screens — they are the same advance
 * at four points in its life, not four different things.
 *
 * Derived money is derived, never stored: see advanceTotals.
 */

export const ADVANCE_STATUSES = ["requested", "approved", "active", "repaid", "rejected"] as const;
export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number];

export const SalaryAdvanceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Percent of the principal, e.g. 10 = 10%. */
  interestRate: z.number(),
  fromAmount: z.number(),
  toAmount: z.number(),
  chargeFee: z.number(),
});
export type SalaryAdvanceCategory = z.infer<typeof SalaryAdvanceCategorySchema>;

export const SalaryAdvanceCategoryInputSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a category name."),
    interestRate: z.number().min(0, "Interest cannot be negative.").max(100, "Interest cannot exceed 100%."),
    fromAmount: z.number().nonnegative("Enter the lower bound."),
    toAmount: z.number().positive("Enter the upper bound."),
    chargeFee: z.number().nonnegative("A charge fee cannot be negative."),
  })
  /* A band whose ceiling is below its floor matches nothing and would silently
     never be offered, so it is refused where the user would have to fix it. */
  .refine((v) => v.toAmount > v.fromAmount, {
    message: "The upper bound must be greater than the lower bound.",
    path: ["toAmount"],
  });
export type SalaryAdvanceCategoryInput = z.infer<typeof SalaryAdvanceCategoryInputSchema>;

export const SalaryAdvanceSchema = z.object({
  id: z.string(),
  reference: z.string(),
  customerName: z.string(),
  phone: z.string(),
  branch: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  loanAmount: z.number(),
  /** Interest in money, as the original screens print it — not a rate. */
  interest: z.number(),
  paidAmount: z.number(),
  chargeFee: z.number(),
  status: z.enum(ADVANCE_STATUSES),
  date: z.string(),
  /** Days past the due date; 0 means current. Drives the Alert column. */
  overdueDays: z.number(),
});
export type SalaryAdvance = z.infer<typeof SalaryAdvanceSchema>;

/**
 * Principal + interest, and what is left.
 *
 * Both are computed from the loan amount, the interest and what has been paid,
 * so a row cannot show a remaining balance that disagrees with its own columns.
 * Remaining is floored at zero: an overpayment is a credit, not a negative
 * debt, and printing a minus in that column reads as an error.
 */
export function advanceTotals(advance: SalaryAdvance) {
  const principalPlusInterest = advance.loanAmount + advance.interest;
  const remaining = Math.max(0, principalPlusInterest - advance.paidAmount);
  return { principalPlusInterest, remaining };
}

/** Sums a set of advances for a table's totals row. */
export function sumAdvances(advances: SalaryAdvance[]) {
  return advances.reduce(
    (acc, a) => {
      const { principalPlusInterest, remaining } = advanceTotals(a);
      return {
        loanAmount: acc.loanAmount + a.loanAmount,
        interest: acc.interest + a.interest,
        principalPlusInterest: acc.principalPlusInterest + principalPlusInterest,
        paidAmount: acc.paidAmount + a.paidAmount,
        remaining: acc.remaining + remaining,
        chargeFee: acc.chargeFee + a.chargeFee,
      };
    },
    { loanAmount: 0, interest: 0, principalPlusInterest: 0, paidAmount: 0, remaining: 0, chargeFee: 0 }
  );
}

/** Mirrors the Request Salary Advance form, in the order the screen lists it. */
export const SalaryAdvanceRequestInputSchema = z.object({
  branch: z.string().min(1, "Choose a branch."),
  customerName: z.string().min(1, "Choose a customer."),
  categoryId: z.string().min(1, "Choose a salary advance category."),
  loanAmount: z.number().positive("Enter an amount greater than zero."),
});
export type SalaryAdvanceRequestInput = z.infer<typeof SalaryAdvanceRequestInputSchema>;

/** A single repayment, for the Salary Advance Paid List. */
export const SalaryAdvancePaymentSchema = z.object({
  id: z.string(),
  branch: z.string(),
  customerName: z.string(),
  amount: z.number(),
  date: z.string(),
});
export type SalaryAdvancePayment = z.infer<typeof SalaryAdvancePaymentSchema>;
