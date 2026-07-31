import { z } from "zod";

/**
 * The five operational modules: Penalty, Loan Fee, Expenses, Headquarters
 * Expenses and Headquarters Transaction.
 *
 * They share two shapes rather than five near-copies. A branch expense and a
 * headquarters expense differ only in whether the money is attributed to a
 * branch or to a member of head-office staff, and a requested transaction and
 * an approved one are the same record at two points in its life — so each is
 * modelled once and filtered per screen. That is what keeps a total on one
 * screen agreeing with the rows on another.
 */

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

export const PenaltySchema = z.object({
  id: z.string(),
  customerName: z.string(),
  branch: z.string(),
  loanAmount: z.number(),
  penaltyAmount: z.number(),
  date: z.string(),
});
export type Penalty = z.infer<typeof PenaltySchema>;

export const PenaltyInputSchema = z.object({
  customerName: z.string().trim().min(2, "Enter the customer name."),
  branch: z.string().min(1, "Choose a branch."),
  loanAmount: z.number().positive("Enter the loan amount."),
  penaltyAmount: z.number().positive("Enter the penalty amount."),
});
export type PenaltyInput = z.infer<typeof PenaltyInputSchema>;

export const PaidPenaltySchema = z.object({
  id: z.string(),
  customerName: z.string(),
  branch: z.string(),
  paidAmount: z.number(),
  date: z.string(),
});
export type PaidPenalty = z.infer<typeof PaidPenaltySchema>;

// ---------------------------------------------------------------------------
// Loan Fee — deducted income
// ---------------------------------------------------------------------------

export const DeductedIncomeSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  branch: z.string(),
  loanApproved: z.number(),
  incomeAmount: z.number(),
  date: z.string(),
});
export type DeductedIncome = z.infer<typeof DeductedIncomeSchema>;

// ---------------------------------------------------------------------------
// Expense categories — the named things a branch or HQ can spend against
// ---------------------------------------------------------------------------

export const ExpenseNameSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Which register this name belongs to: a branch one, or head office's. */
  scope: z.enum(["branch", "headquarters"]),
});
export type ExpenseName = z.infer<typeof ExpenseNameSchema>;

export const ExpenseNameInputSchema = z.object({
  name: z.string().trim().min(2, "Enter an expense name."),
});
export type ExpenseNameInput = z.infer<typeof ExpenseNameInputSchema>;

// ---------------------------------------------------------------------------
// Expense requests — branch and headquarters
// ---------------------------------------------------------------------------

/**
 * One record for both registers. A branch request carries a branch; a
 * headquarters request carries the member of staff who raised it. Both are
 * present on the type so the two screens can share a table, and each screen
 * shows only the column its register has.
 */
export const ExpenseClaimSchema = z.object({
  id: z.string(),
  scope: z.enum(["branch", "headquarters"]),
  branch: z.string(),
  staff: z.string(),
  expense: z.string(),
  amount: z.number(),
  description: z.string(),
  comment: z.string().nullable(),
  status: z.enum(APPROVAL_STATUSES),
  date: z.string(),
});
export type ExpenseClaim = z.infer<typeof ExpenseClaimSchema>;

export const ExpenseClaimInputSchema = z.object({
  expense: z.string().min(1, "Choose an expense."),
  amount: z.number().positive("Enter an amount greater than zero."),
  description: z.string().trim().min(2, "Say what this is for."),
  comment: z.string().trim().max(300, "Keep the comment under 300 characters."),
});
export type ExpenseClaimInput = z.infer<typeof ExpenseClaimInputSchema>;

// ---------------------------------------------------------------------------
// Headquarters transactions
// ---------------------------------------------------------------------------

export const HqTransactionSchema = z.object({
  id: z.string(),
  reference: z.string(),
  branch: z.string(),
  requestedBy: z.string(),
  approvedBy: z.string().nullable(),
  amount: z.number(),
  reason: z.string(),
  status: z.enum(APPROVAL_STATUSES),
  date: z.string(),
  /**
   * "in" adds to the headquarters balance, "out" draws it down, and "internal"
   * moves money between two of the seven head-office accounts without changing
   * how much there is in total.
   *
   * "internal" is the legacy module's original purpose — its transfer screens
   * are titled "From Headquater Transaction - CEO ACC" — and was missing here
   * while this screen ran on fixtures that contained no such row. It is why
   * hqBalance counts only "in" and "out" below.
   */
  direction: z.enum(["in", "out", "internal"]),
});
export type HqTransaction = z.infer<typeof HqTransactionSchema>;

/**
 * The headquarters position, derived from the transaction book.
 *
 * Income and expense are the two directions of approved movement, and the net
 * is their difference — never a stored figure, so the balance card and the
 * table under it cannot disagree.
 */
export function hqBalance(transactions: HqTransaction[]) {
  const approved = transactions.filter((t) => t.status === "approved");
  const income = approved.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const expense = approved.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);
  return { income, expense, net: income - expense, count: approved.length };
}

/** Approved movement per month, oldest first — drives the balance chart. */
export function hqMonthlySeries(transactions: HqTransaction[]) {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const t of transactions) {
    if (t.status !== "approved") continue;
    const month = t.date.slice(0, 7);
    const entry = byMonth.get(month) ?? { income: 0, expense: 0 };
    if (t.direction === "in") entry.income += t.amount;
    else entry.expense += t.amount;
    byMonth.set(month, entry);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));
}
