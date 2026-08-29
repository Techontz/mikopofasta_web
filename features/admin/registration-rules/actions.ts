"use server";

import { revalidatePath } from "next/cache";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import type { AccountTypeRequirementProfile } from "@/lib/api/registration";

const PATH = "/admin/registration-rules";

/**
 * The KYC and guarantor rules for one account type, and the two settings that
 * govern whether a category's documents block.
 */
export async function saveRequirements(
  accountTypeId: string,
  input: Omit<AccountTypeRequirementProfile, "accountTypeId" | "isDefault">,
): Promise<ActionResult> {
  try {
    await apiData(`/api/v1/registration/requirements/${accountTypeId}`, {
      method: "PUT",
      body: input,
      token: await getApiToken(),
    });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(PATH);
  revalidatePath("/customers/new");

  return { ok: true, message: "Registration rules saved." };
}

export interface EligibilityRuleInput {
  loanProductId: string;
  maxAmountOverride?: string | null;
  requiresExtraApproval?: boolean;
}

/**
 * Which products a category may borrow, and the ceiling on each.
 *
 * The API replaces the whole set for the category in one transaction, so the
 * screen sends every rule it wants to survive — a partial send would delete
 * the rest.
 */
export async function saveEligibility(
  categoryId: string,
  rules: EligibilityRuleInput[],
): Promise<ActionResult> {
  try {
    await apiData(`/api/v1/customer-categories/${categoryId}/eligibility`, {
      method: "PUT",
      body: { rules },
      token: await getApiToken(),
    });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(PATH);

  return { ok: true, message: "Eligibility saved." };
}
