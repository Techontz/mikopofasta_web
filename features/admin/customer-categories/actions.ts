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
  description: true,
  /* The registration form: its heading, its questions, and the documents the
     file must and may contain. Written only by the Registration form dialog. */
  formTitle: true,
  isActive: true,
  sortOrder: true,
  riskTier: true,
  sector: true,
  requiredDocuments: true,
  optionalDocuments: true,
  dynamicFormSchema: true,
  requiresExtraApproval: true,
})
  /*
   * Everything but the name is OPTIONAL, and normally absent.
   *
   * The form asks for a name; the API derives the code and defaults the rest on
   * create, and leaves every field a save does not mention exactly as it was on
   * update. Sending `undefined` is how a rename says "change nothing else".
   */
  .partial()
  .required({ name: true });
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
  return { ok: true, message: "Customer type created." };
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
  return { ok: true, message: "Customer type updated." };
}

export async function deleteCustomerCategory(id: string): Promise<ActionResult> {
  try {
    await deleteCustomerCategoryRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer type deleted." };
}
