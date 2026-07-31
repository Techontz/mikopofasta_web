import { z } from "zod";

export const ExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  /**
   * `headquarters`, not `hq`.
   *
   * This screen and the six operational expense screens describe the same
   * record, and they used to spell its two registers differently — `hq` here,
   * `headquarters` in types/operations.ts. The backend enum is
   * `branch | headquarters` and six screens read it against one that did not,
   * so the odd one out is corrected rather than translated at the boundary.
   */
  scope: z.enum(["branch", "headquarters"]),
  /** The 6xxx ledger account this category owns — one each, never shared. */
  chartAccountId: z.string(),
  createdBy: z.string().nullable(),
  deletedAt: z.string().nullable(),
});
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

/**
 * A single expense transaction (Dr Expense · Cr Cash/Bank, backend §5).
 * Not its own backend table in the original 54 — expenses are journal
 * entries against a dynamic expense account — but the frontend/domain layer
 * needs one row per transaction to list/filter "Expenses" as its own module.
 */
export const ExpenseSchema = z.object({
  id: z.string(),
  expenseCategoryId: z.string(),
  branchId: z.string().nullable(),
  amount: z.number().positive(),
  description: z.string(),
  incurredAt: z.string(),
  journalEntryId: z.string(),
  createdBy: z.string().nullable(),
});
export type Expense = z.infer<typeof ExpenseSchema>;

export const CreateExpenseInputSchema = ExpenseSchema.pick({
  expenseCategoryId: true,
  branchId: true,
  amount: true,
  description: true,
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseInputSchema>;
