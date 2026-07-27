"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InterestFormulaSchema } from "@/types/loan-product";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";
import { upsert } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

// Name/description only — `code` is fixed because lib/domain/loan-schedule.ts
// branches on SIMPLE/FLAT/REDUCING by code; it isn't a free-text CRUD field.
const FormulaInputSchema = InterestFormulaSchema.pick({ name: true, description: true });

export async function updateInterestFormula(id: string, input: z.infer<typeof FormulaInputSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  const parsed = FormulaInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_INTEREST_FORMULAS.find((f) => f.id === id);
  if (!existing) return { ok: false, message: "Interest formula not found." };
  upsert(MOCK_INTEREST_FORMULAS, { ...existing, ...parsed.data });
  revalidatePath("/admin/interest-formulas");
  return { ok: true, message: "Interest formula updated." };
}
