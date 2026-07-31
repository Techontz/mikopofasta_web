"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExpenseCategorySchema } from "@/types/expense";
import {
  createExpenseCategoryRequest,
  deleteExpenseCategoryRequest,
  renameExpenseCategoryRequest,
} from "@/lib/api/expenses";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Expense Categories.
 *
 * The same register the two operational "Register Expenses" screens edit, seen
 * whole rather than one scope at a time. Both sets of actions call the same
 * endpoints, so the two screens cannot disagree about what exists.
 *
 * Authorization is ExpensePolicy's — `treasury.manage` or `admin.org_settings`
 * opens the register. Nothing here re-checks it: a permission test on this side
 * is a second answer that can drift from the server's.
 */

const CategoryInputSchema = ExpenseCategorySchema.pick({ name: true, scope: true });

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Both operational registers as well — a rename shows on all three screens. */
function revalidateRegisters(): void {
  for (const path of ["/admin/expense-categories", "/expenses/register", "/hq/expenses/register"]) {
    revalidatePath(path);
  }
}

export async function createExpenseCategory(
  input: z.infer<typeof CategoryInputSchema>
): Promise<ActionResult> {
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    // The ledger account is minted by the backend, in the same transaction —
    // ACCOUNT OVERVIEW §G, "Kila category = Ledger yake".
    await createExpenseCategoryRequest(parsed.data.name, parsed.data.scope);
  } catch (error) {
    return fail(error);
  }

  revalidateRegisters();
  return { ok: true, message: "Expense category created." };
}

export async function updateExpenseCategory(
  id: string,
  input: z.infer<typeof CategoryInputSchema>
): Promise<ActionResult> {
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    /*
     * Only the name. The register a category belongs to is fixed at creation:
     * moving it would silently re-file every request already under it and
     * change historical Branch P&L. The form still shows the scope on edit,
     * disabled, because a reader needs to know which register they are in.
     */
    await renameExpenseCategoryRequest(id, parsed.data.name);
  } catch (error) {
    return fail(error);
  }

  revalidateRegisters();
  return { ok: true, message: "Expense category updated." };
}

export async function deleteExpenseCategory(id: string): Promise<ActionResult> {
  try {
    await deleteExpenseCategoryRequest(id);
  } catch (error) {
    // Refused while a request is still pending. The backend's message names
    // the category, which is more use here than a generic one.
    return fail(error);
  }

  revalidateRegisters();
  return { ok: true, message: "Expense category deleted." };
}
