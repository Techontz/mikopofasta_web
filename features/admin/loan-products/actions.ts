"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LoanProductSchema } from "@/types/loan-product";
import {
  createLoanProductRequest,
  deleteLoanProductRequest,
  updateLoanProductRequest,
} from "@/lib/api/loans";
import { describeError } from "@/lib/api/errors";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { getCategoryEligibility } from "@/lib/api/loans";
import { getCustomerCategories } from "@/lib/api/customers";
import type { ActionResult } from "@/lib/domain/action-result";

const ProductInputSchema = LoanProductSchema.pick({
  name: true,
  code: true,
  interestFormulaId: true,
  interestRate: true,
  minAmount: true,
  maxAmount: true,
  minTenureDays: true,
  maxTenureDays: true,
  penaltyType: true,
  penaltyRate: true,
  penaltyGraceDays: true,
  penaltyCapAmount: true,
  requiresMandate: true,
  status: true,
}).extend({
  repaymentScheduleIds: z.array(z.string()).min(1, "Select at least one repayment schedule"),
  /* The Loan Category screen's own terms. All optional — a product may state
     none of them, and every product created before they existed states none. */
  minRepayments: z.number().int().min(1).max(600).nullable().optional(),
  maxRepayments: z.number().int().min(1).max(600).nullable().optional(),
  allowsDeduction: z.boolean().optional(),
  approvalStageId: z.string().nullable().optional(),
  topupPercent: z.number().min(0).max(100).nullable().optional(),
  takeHomePercent: z.number().min(0).max(100).nullable().optional(),
  /* Availability. Written through the existing per-customer-type eligibility
     endpoint, not a column on the product — the pivot is where the loan gate
     already reads it from. */
  customerTypeIds: z.array(z.string()).optional(),
})
  .refine((v) => v.maxAmount >= v.minAmount, { message: "Max amount must be at least the min amount", path: ["maxAmount"] })
  .refine((v) => v.maxTenureDays >= v.minTenureDays, { message: "Max tenure must be at least the min tenure", path: ["maxTenureDays"] });

export type ProductInputValues = z.infer<typeof ProductInputSchema>;

/**
 * Loan products — `POST/PUT/DELETE /api/v1/loan-products`.
 *
 * The rules these functions used to carry now sit with the API, which can see
 * the whole book: `admin.org_settings`, the unique product code, and "can't
 * delete a product loans exist against" — a 409 RESOURCE_IN_USE that names the
 * product. The allowed-cadence pivot travels inside the same request rather
 * than being a second array kept in step by hand.
 */

/**
 * Make this product available to exactly the chosen Customer Types.
 *
 * Availability lives in the eligibility pivot — the same rows the loan gate
 * already reads and the Registration & Eligibility screen already edits — so
 * this writes through the EXISTING per-type endpoint rather than adding a
 * second place the same fact could be stored.
 *
 * Each type's list is read, this product added or removed, and the list written
 * back whole. Only the types that actually change are written, so an
 * administrator who edits a product's interest rate does not rewrite every
 * type's rules as a side effect.
 *
 * Best-effort and non-fatal: the product itself is already saved by the time
 * this runs, and failing to reach one type's rules must not report the save as
 * failed. Anything that goes wrong is returned so the caller can say so.
 */
async function syncAvailability(productId: string, chosen: string[]): Promise<string | null> {
  try {
    const types = await getCustomerCategories();
    const failures: string[] = [];

    for (const type of types) {
      const rules = await getCategoryEligibility(type.id);
      const has = rules.some((r) => r.loanProductId === productId);
      const wants = chosen.includes(type.id);

      if (has === wants) continue;

      const next = wants
        ? [
            ...rules.map((r) => ({
              loanProductId: r.loanProductId,
              maxAmountOverride: r.maxAmountOverride,
              requiresExtraApproval: r.requiresExtraApproval,
            })),
            /* The product's own ceiling applies unless a per-type one is set
               later on the Registration & Eligibility screen. */
            { loanProductId: productId, maxAmountOverride: null, requiresExtraApproval: false },
          ]
        : rules
            .filter((r) => r.loanProductId !== productId)
            .map((r) => ({
              loanProductId: r.loanProductId,
              maxAmountOverride: r.maxAmountOverride,
              requiresExtraApproval: r.requiresExtraApproval,
            }));

      try {
        await apiData(`/api/v1/customer-categories/${type.id}/eligibility`, {
          method: "PUT",
          body: { rules: next },
          token: await getApiToken(),
        });
      } catch {
        failures.push(type.name);
      }
    }

    return failures.length === 0 ? null : `Saved, but availability could not be updated for: ${failures.join(", ")}.`;
  } catch (error) {
    return `Saved, but customer type availability could not be updated: ${describeError(error)}`;
  }
}

export async function createLoanProduct(input: ProductInputValues): Promise<ActionResult> {
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { customerTypeIds, ...product } = parsed.data;

  let created;
  try {
    created = await createLoanProductRequest(product);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  const warning = customerTypeIds === undefined ? null : await syncAvailability(created.id, customerTypeIds);

  revalidatePath("/admin/loan-products");
  revalidatePath("/admin/registration-rules");
  return warning ? { ok: true, message: warning } : { ok: true, message: "Loan product created." };
}

export async function updateLoanProduct(id: string, input: ProductInputValues): Promise<ActionResult> {
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { customerTypeIds, ...product } = parsed.data;

  try {
    await updateLoanProductRequest(id, product);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  const warning = customerTypeIds === undefined ? null : await syncAvailability(id, customerTypeIds);

  revalidatePath("/admin/loan-products");
  revalidatePath("/admin/registration-rules");
  return warning ? { ok: true, message: warning } : { ok: true, message: "Loan product updated." };
}

export async function deleteLoanProduct(id: string): Promise<ActionResult> {
  try {
    await deleteLoanProductRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product deleted." };
}
