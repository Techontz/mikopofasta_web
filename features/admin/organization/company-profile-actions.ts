"use server";

import { revalidatePath } from "next/cache";
import { UpdateCompanyProfileInputSchema, type UpdateCompanyProfileInput } from "@/types/organization";
import { MOCK_COMPANY_PROFILE } from "@/lib/mock-data/company-profile";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

export async function updateCompanyProfile(input: UpdateCompanyProfileInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }

  const parsed = UpdateCompanyProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  Object.assign(MOCK_COMPANY_PROFILE, parsed.data, { updatedBy: user.id, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Company profile updated." };
}
