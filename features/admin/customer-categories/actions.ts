"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomerCategorySchema } from "@/types/customer";
import {
  createCustomerCategoryRequest,
  deleteCustomerCategoryRequest,
  updateCustomerCategoryRequest,
} from "@/lib/api/customers";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

const CategoryInputSchema = CustomerCategorySchema.pick({
  name: true,
  code: true,
  riskTier: true,
  sector: true,
  requiredDocuments: true,
  dynamicFormSchema: true,
  requiresExtraApproval: true,
});
export type CategoryInputValues = z.infer<typeof CategoryInputSchema>;

/**
 * Customer categories — `POST/PUT/DELETE /api/v1/customer-categories`.
 *
 * `admin.org_settings` is checked by the API, and so is "can't delete a
 * category customers are assigned to": it returns RESOURCE_IN_USE naming the
 * category, which beats a local scan of one in-memory array that could not see
 * the whole book anyway.
 */
export async function createCustomerCategory(input: CategoryInputValues): Promise<ActionResult> {
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createCustomerCategoryRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category created." };
}

export async function updateCustomerCategory(id: string, input: CategoryInputValues): Promise<ActionResult> {
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateCustomerCategoryRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category updated." };
}

export async function deleteCustomerCategory(id: string): Promise<ActionResult> {
  try {
    await deleteCustomerCategoryRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category deleted." };
}
