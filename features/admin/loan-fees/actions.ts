"use server";

import { revalidatePath } from "next/cache";
import { LoanFeeFormSchema, type LoanFeeInput } from "@/types/loan-charge";
import { deleteLoanFeeRequest, upsertLoanFeeRequest } from "@/lib/api/loan-charges";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Loan Fee.
 *
 * Authorization is the API's: LoanChargePolicy gates both writes on
 * `admin.org_settings` and answers 403 otherwise. These actions translate that
 * refusal into a message rather than deciding it a second time.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    // A 422 names the field it rejected; showing that beats a generic failure.
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function saveLoanFee(loanProductId: string, input: LoanFeeInput): Promise<ActionResult> {
  const parsed = LoanFeeFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await upsertLoanFeeRequest(loanProductId, parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/loan-fees");
  return { ok: true, message: "Loan fee saved." };
}

export async function clearLoanFee(loanProductId: string): Promise<ActionResult> {
  try {
    await deleteLoanFeeRequest(loanProductId);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/loan-fees");
  return { ok: true, message: "Loan fee cleared." };
}
