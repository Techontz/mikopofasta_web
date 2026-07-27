"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomerCategorySchema } from "@/types/customer";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
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

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createCustomerCategory(input: CategoryInputValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const actor = await getCurrentUser();
  upsert(MOCK_CUSTOMER_CATEGORIES, { id: nextId("cat"), ...parsed.data, createdBy: actor?.id ?? null, deletedAt: null });
  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category created." };
}

export async function updateCustomerCategory(id: string, input: CategoryInputValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_CUSTOMER_CATEGORIES.find((c) => c.id === id);
  if (!existing) return { ok: false, message: "Category not found." };
  upsert(MOCK_CUSTOMER_CATEGORIES, { ...existing, ...parsed.data });
  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category updated." };
}

export async function deleteCustomerCategory(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_CUSTOMERS.some((c) => c.customerCategoryId === id)) {
    return { ok: false, message: "Can't delete — customers are assigned to this category." };
  }
  removeById(MOCK_CUSTOMER_CATEGORIES, id);
  revalidatePath("/admin/customer-categories");
  return { ok: true, message: "Customer category deleted." };
}
