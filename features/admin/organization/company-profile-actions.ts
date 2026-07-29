"use server";

import { revalidatePath } from "next/cache";
import { UpdateCompanyProfileInputSchema, type UpdateCompanyProfileInput } from "@/types/organization";
import { updateCompanyProfileRequest } from "@/lib/api/organization";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Company profile — `PUT /api/v1/company-profile`.
 *
 * A singleton, so there is no id in the path. `updatedBy` and `updatedAt` are
 * stamped by the API from the authenticated user rather than sent from here —
 * a client-supplied "who changed this" is not evidence of anything.
 */
export async function updateCompanyProfile(input: UpdateCompanyProfileInput): Promise<ActionResult> {
  const parsed = UpdateCompanyProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await updateCompanyProfileRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Company profile updated." };
}
