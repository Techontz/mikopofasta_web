"use server";

import { revalidatePath } from "next/cache";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Assign or remove one branch for one loan product.
 *
 * Single-row calls against the existing pivot endpoints — the administrator
 * ticks a branch and only that row moves; nothing about the product itself is
 * resent.
 */
function revalidate(productId: string): void {
  revalidatePath(`/admin/loan-products/${productId}/branches`);
  revalidatePath("/admin/loan-products");
}

export async function assignBranch(productId: string, branchId: string): Promise<ActionResult> {
  try {
    await apiData(`/api/v1/loan-products/${productId}/branches`, {
      method: "POST",
      body: { branchId: Number(branchId) },
      token: await getApiToken(),
    });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidate(productId);
  return { ok: true, message: "Branch assigned." };
}

export async function removeBranch(productId: string, branchId: string): Promise<ActionResult> {
  try {
    await apiData(`/api/v1/loan-products/${productId}/branches/${branchId}`, {
      method: "DELETE",
      token: await getApiToken(),
    });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidate(productId);
  return { ok: true, message: "Branch removed." };
}
