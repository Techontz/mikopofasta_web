import { z } from "zod";

export const ExpenseCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(["branch", "hq"]),
  /** 1:1 auto-created ledger account — backend §2.2. */
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
