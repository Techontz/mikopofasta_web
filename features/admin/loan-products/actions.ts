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
}).extend({ repaymentScheduleIds: z.array(z.string()).min(1, "Select at least one repayment schedule") })
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
export async function createLoanProduct(input: ProductInputValues): Promise<ActionResult> {
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createLoanProductRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product created." };
}

export async function updateLoanProduct(id: string, input: ProductInputValues): Promise<ActionResult> {
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateLoanProductRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product updated." };
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
