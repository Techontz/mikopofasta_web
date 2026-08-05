"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InterestFormulaSchema } from "@/types/loan-product";
import { updateInterestFormulaRequest } from "@/lib/api/system-configuration";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Interest Formula.
 *
 * Name/description only — `code` is fixed because the backend's
 * InterestStrategyRegistry resolves a pricing strategy by it
 * (app/Domain/Loans/Engine/Strategies); it isn't a free-text CRUD field.
 * Schedules are priced server-side and previewed via /loans/schedule-preview,
 * so nothing in the browser branches on the code at all.
 * The API agrees and routes no create or delete at all, so this is the whole
 * surface of the screen.
 *
 * Authorization is the API's: SystemConfigurationPolicy gates the write on
 * `admin.org_settings` and answers 403 otherwise. This translates that refusal
 * into a message rather than deciding it a second time.
 */
const FormulaInputSchema = InterestFormulaSchema.pick({ name: true, description: true });

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    // A 422 names the field it rejected — a duplicate name, most often.
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function updateInterestFormula(
  id: string,
  input: z.infer<typeof FormulaInputSchema>
): Promise<ActionResult> {
  const parsed = FormulaInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateInterestFormulaRequest(id, {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/interest-formulas");
  // The product form names the formula beside each product.
  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Interest formula updated." };
}
