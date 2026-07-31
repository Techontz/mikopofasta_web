"use server";

import { revalidatePath } from "next/cache";
import {
  decideExpenseRequest,
  fileExpenseRequest,
  withdrawExpenseRequest,
} from "@/lib/api/expenses";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import type { ExpenseStatus } from "@/types/bank";

/**
 * Bank → Register Bank Expenses and Request Expenses.
 *
 * These call the **Expenses** endpoints, not bank-specific ones, because a
 * bank-paid expense is not a different kind of record: same table, same
 * approval, same debit. Only the credit side of the posting differs, and that
 * is decided by naming a bank account on the request.
 *
 * Two expense systems would have meant two Expense Tagging Reports and two
 * chances for them to disagree about what the company spent.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * The bank screens and the expense screens both, since they are one queue.
 *
 * An expense filed from the Bank menu appears on Expenses → All Expenses
 * Request as well, and approving it there changes what the Bank screen shows.
 */
function revalidateExpenseScreens(): void {
  for (const path of [
    "/treasury/expenses",
    "/treasury/expenses/requests",
    "/expenses/requests",
    "/expenses/approved",
    "/hq/expenses/requests",
    "/hq/expenses/approved",
  ]) {
    revalidatePath(path);
  }
}

export interface FileBankExpenseInput {
  /** The category's id — it owns the ledger account the cost is debited to. */
  expenseCategoryId: string;
  /** The account the money left. This is what makes it a bank expense. */
  bankAccountId: string;
  amount: number;
  description: string;
}

export async function fileBankExpense(input: FileBankExpenseInput): Promise<ActionResult> {
  if (!input.expenseCategoryId) return { ok: false, message: "Choose a category." };
  if (!input.bankAccountId) return { ok: false, message: "Choose an account." };
  if (!(input.amount > 0)) return { ok: false, message: "Enter an amount greater than zero." };

  try {
    await fileExpenseRequest({
      expenseCategoryId: input.expenseCategoryId,
      bankAccountId: input.bankAccountId,
      amount: input.amount,
      description: input.description,
      /*
       * Head office's register. A bank account is the company's rather than a
       * branch's, so a cost paid from one is head office's to account for —
       * which is also why the category picker on this screen offers the
       * headquarters register.
       */
      scope: "headquarters",
    });
  } catch (error) {
    return fail(error);
  }

  revalidateExpenseScreens();
  return { ok: true, message: "Expense recorded." };
}

export async function withdrawBankExpense(id: string, category: string): Promise<ActionResult> {
  try {
    // Refused once approved: the cost has posted, and §2's no-delete rule
    // makes a reversal the only way back.
    await withdrawExpenseRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenseScreens();
  return { ok: true, message: `${category} expense removed.` };
}

export async function decideBankExpense(
  id: string,
  decision: Exclude<ExpenseStatus, "pending">,
  category: string,
  comment?: string
): Promise<ActionResult> {
  try {
    await decideExpenseRequest(id, decision, comment ?? null);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenseScreens();
  return { ok: true, message: `${category} request ${decision}.` };
}
