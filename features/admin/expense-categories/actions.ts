"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExpenseCategorySchema } from "@/types/expense";
import { MOCK_EXPENSE_CATEGORIES } from "@/lib/mock-data/expense-categories";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_EXPENSES } from "@/lib/mock-data/journal-entries";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const CategoryInputSchema = ExpenseCategorySchema.pick({ name: true, scope: true });

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

function nextExpenseAccountCode(): string {
  const codes = CHART_OF_ACCOUNTS.filter((a) => a.code.startsWith("6")).map((a) => Number(a.code));
  return String(Math.max(...codes, 6000) + 100);
}

export async function createExpenseCategory(input: z.infer<typeof CategoryInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const actor = await getCurrentUser();
  const chartAccountId = nextId("acct-expense");
  CHART_OF_ACCOUNTS.push({
    id: chartAccountId,
    code: nextExpenseAccountCode(),
    name: `${parsed.data.name} Expense`,
    type: "expense",
    parentAccountId: null,
    isSystem: false,
    branchId: null,
    status: "active",
    deletedAt: null,
  });
  upsert(MOCK_EXPENSE_CATEGORIES, { id: nextId("exp-cat"), ...parsed.data, chartAccountId, createdBy: actor?.id ?? null, deletedAt: null });
  revalidatePath("/admin/expense-categories");
  return { ok: true, message: "Expense category created." };
}

export async function updateExpenseCategory(id: string, input: z.infer<typeof CategoryInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = CategoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_EXPENSE_CATEGORIES.find((c) => c.id === id);
  if (!existing) return { ok: false, message: "Expense category not found." };
  upsert(MOCK_EXPENSE_CATEGORIES, { ...existing, ...parsed.data });
  revalidatePath("/admin/expense-categories");
  return { ok: true, message: "Expense category updated." };
}

export async function deleteExpenseCategory(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_EXPENSES.some((e) => e.expenseCategoryId === id)) {
    return { ok: false, message: "Can't delete — expense transactions exist in this category." };
  }
  removeById(MOCK_EXPENSE_CATEGORIES, id);
  revalidatePath("/admin/expense-categories");
  return { ok: true, message: "Expense category deleted." };
}
