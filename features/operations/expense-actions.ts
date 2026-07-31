"use server";

import { revalidatePath } from "next/cache";
import {
  commentOnExpenseRequest,
  createExpenseCategoryRequest,
  decideExpenseRequest,
  deleteExpenseCategoryRequest,
  fileExpenseRequest,
  renameExpenseCategoryRequest,
  withdrawExpenseRequest,
} from "@/lib/api/expenses";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import {
  ExpenseClaimInputSchema,
  ExpenseNameInputSchema,
  type ApprovalStatus,
  type ExpenseClaimInput,
  type ExpenseName,
  type ExpenseNameInput,
} from "@/types/operations";

/**
 * Expenses → Register Branch Expenses / All Expenses Request / All Approved
 * Expenses, and the three headquarters equivalents.
 *
 * Authorization is ExpensePolicy's; these surface its refusal rather than
 * deciding it again. That matters here more than usual: approval is gated on
 * §14 separation of duties — the requester may not approve their own request —
 * and that check needs the identity on the request, which only the server has.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * Both registers and all four queues, refreshed together.
 *
 * A rename shows on the queue screens as well as the register, and a decision
 * moves a row from the requests screen to the approved one — so revalidating
 * only the page that was acted on would leave the others stale.
 */
function revalidateExpenses(): void {
  for (const path of [
    "/expenses/register",
    "/expenses/requests",
    "/expenses/approved",
    "/hq/expenses/register",
    "/hq/expenses/requests",
    "/hq/expenses/approved",
    "/admin/expense-categories",
  ]) {
    revalidatePath(path);
  }
}

// ---------------------------------------------------------------------------
// The register
// ---------------------------------------------------------------------------

export async function saveExpenseName(
  values: ExpenseNameInput,
  scope: ExpenseName["scope"],
  id?: string
): Promise<ActionResult> {
  const parsed = ExpenseNameInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    if (id) await renameExpenseCategoryRequest(id, parsed.data.name);
    else await createExpenseCategoryRequest(parsed.data.name, scope);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: id ? `${parsed.data.name} updated.` : `${parsed.data.name} added.` };
}

export async function deleteExpenseName(id: string, name: string): Promise<ActionResult> {
  try {
    await deleteExpenseCategoryRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: `${name} deleted.` };
}

// ---------------------------------------------------------------------------
// The queues
// ---------------------------------------------------------------------------

export async function fileExpense(
  values: ExpenseClaimInput & { expenseCategoryId: string; branchId?: string },
  scope: ExpenseName["scope"]
): Promise<ActionResult> {
  const parsed = ExpenseClaimInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await fileExpenseRequest({
      expenseCategoryId: values.expenseCategoryId,
      branchId: values.branchId,
      amount: parsed.data.amount,
      description: parsed.data.description,
      comment: parsed.data.comment || null,
      // Stated, not authoritative: the backend refuses a category from the
      // other register rather than re-scoping the request silently.
      scope: scope === "branch" ? "branch" : "headquarters",
    });
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: "Expense request filed." };
}

export async function decideExpense(
  id: string,
  decision: Exclude<ApprovalStatus, "pending">,
  expense: string,
  comment?: string
): Promise<ActionResult> {
  try {
    await decideExpenseRequest(id, decision, comment ?? null);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: `${expense} request ${decision}.` };
}

export async function saveExpenseComment(id: string, comment: string): Promise<ActionResult> {
  try {
    await commentOnExpenseRequest(id, comment.trim() || null);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: "Comment saved." };
}

export async function deleteExpenseClaim(id: string, expense: string): Promise<ActionResult> {
  try {
    await withdrawExpenseRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateExpenses();
  return { ok: true, message: `${expense} request deleted.` };
}
