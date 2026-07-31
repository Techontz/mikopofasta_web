"use server";

import { revalidatePath } from "next/cache";
import { PenaltySettingFormSchema, type PenaltySettingInput } from "@/types/loan-charge";
import { createPenaltySettingRequest, deletePenaltySettingRequest } from "@/lib/api/loan-charges";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Penalty.
 *
 * Authorization is the API's: LoanChargePolicy gates both writes on
 * `admin.org_settings`. These actions surface its refusal rather than deciding
 * it again.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function savePenaltySetting(input: PenaltySettingInput): Promise<ActionResult> {
  const parsed = PenaltySettingFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createPenaltySettingRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/penalty");
  return { ok: true, message: "Penalty setting saved." };
}

export async function deletePenaltySetting(id: string): Promise<ActionResult> {
  try {
    await deletePenaltySettingRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/penalty");
  return { ok: true, message: "Penalty setting deleted." };
}
