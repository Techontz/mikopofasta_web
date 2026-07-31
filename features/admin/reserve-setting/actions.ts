"use server";

import { revalidatePath } from "next/cache";
import { ReserveSettingInputSchema, type ReserveSettingInput } from "@/types/loan-charge";
import { updateReserveSettingRequest } from "@/lib/api/loan-charges";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Reserve Setting.
 *
 * Authorization is the API's: LoanChargePolicy gates the write on
 * `admin.org_settings`. This surfaces its refusal rather than deciding again.
 */
export async function saveReserveSetting(input: ReserveSettingInput): Promise<ActionResult> {
  const parsed = ReserveSettingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateReserveSettingRequest(parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
      return { ok: false, message: field ?? error.message };
    }
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/admin/reserve-setting");
  return { ok: true, message: "Reserve setting saved." };
}
