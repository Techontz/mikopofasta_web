"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RepaymentScheduleSchema } from "@/types/loan-product";
import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES } from "@/lib/mock-data/loan-products";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const ScheduleInputSchema = RepaymentScheduleSchema.pick({ name: true, code: true, frequencyDays: true });

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createRepaymentSchedule(input: z.infer<typeof ScheduleInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ScheduleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(MOCK_REPAYMENT_SCHEDULES, { id: nextId("rs"), ...parsed.data, deletedAt: null });
  revalidatePath("/admin/repayment-schedules");
  return { ok: true, message: "Repayment schedule created." };
}

export async function updateRepaymentSchedule(id: string, input: z.infer<typeof ScheduleInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ScheduleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_REPAYMENT_SCHEDULES.find((s) => s.id === id);
  if (!existing) return { ok: false, message: "Repayment schedule not found." };
  upsert(MOCK_REPAYMENT_SCHEDULES, { ...existing, ...parsed.data });
  revalidatePath("/admin/repayment-schedules");
  return { ok: true, message: "Repayment schedule updated." };
}

export async function deleteRepaymentSchedule(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_LOANS.some((l) => l.repaymentScheduleId === id)) {
    return { ok: false, message: "Can't delete — loans exist using this schedule." };
  }
  if (MOCK_LOAN_PRODUCT_REPAYMENT_SCHEDULES.some((p) => p.repaymentScheduleId === id)) {
    return { ok: false, message: "Can't delete — a loan product allows this schedule. Remove it there first." };
  }
  removeById(MOCK_REPAYMENT_SCHEDULES, id);
  revalidatePath("/admin/repayment-schedules");
  return { ok: true, message: "Repayment schedule deleted." };
}
