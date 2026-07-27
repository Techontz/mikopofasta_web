"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LoanProductSchema } from "@/types/loan-product";
import { MOCK_LOAN_PRODUCTS, MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES } from "@/lib/mock-data/loan-products";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";
import type { LoanProductRepaymentSchedule } from "@/types/loan-product";

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

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

function syncSchedulePivot(loanProductId: string, scheduleIds: string[]) {
  for (let i = MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES.length - 1; i >= 0; i--) {
    if (MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES[i].loanProductId === loanProductId) MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES.splice(i, 1);
  }
  for (const repaymentScheduleId of scheduleIds) {
    const row: LoanProductRepaymentSchedule = { id: nextId("lprs"), loanProductId, repaymentScheduleId };
    MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES.push(row);
  }
}

export async function createLoanProduct(input: ProductInputValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { repaymentScheduleIds, ...product } = parsed.data;
  const actor = await getCurrentUser();
  const id = nextId("prod");
  upsert(MOCK_LOAN_PRODUCTS, { id, ...product, createdBy: actor?.id ?? null, deletedAt: null });
  syncSchedulePivot(id, repaymentScheduleIds);
  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product created." };
}

export async function updateLoanProduct(id: string, input: ProductInputValues): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ProductInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_LOAN_PRODUCTS.find((p) => p.id === id);
  if (!existing) return { ok: false, message: "Loan product not found." };

  const { repaymentScheduleIds, ...product } = parsed.data;
  upsert(MOCK_LOAN_PRODUCTS, { ...existing, ...product });
  syncSchedulePivot(id, repaymentScheduleIds);
  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product updated." };
}

export async function deleteLoanProduct(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_LOANS.some((l) => l.loanProductId === id)) {
    return { ok: false, message: "Can't delete — loans exist against this product." };
  }
  removeById(MOCK_LOAN_PRODUCTS, id);
  syncSchedulePivot(id, []);
  revalidatePath("/admin/loan-products");
  return { ok: true, message: "Loan product deleted." };
}
