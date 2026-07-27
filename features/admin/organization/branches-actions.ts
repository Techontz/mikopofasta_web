"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BranchSchema } from "@/types/branch";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const BranchInputSchema = BranchSchema.pick({
  name: true,
  regionId: true,
  zoneId: true,
  phone: true,
  type: true,
  parentBranchId: true,
  status: true,
});

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createBranch(input: z.infer<typeof BranchInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = BranchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(MOCK_BRANCHES, { id: nextId("branch"), ...parsed.data, isHeadOffice: false, createdBy: null, deletedAt: null });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch created." };
}

export async function updateBranch(id: string, input: z.infer<typeof BranchInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = BranchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_BRANCHES.find((b) => b.id === id);
  if (!existing) return { ok: false, message: "Branch not found." };

  upsert(MOCK_BRANCHES, { ...existing, ...parsed.data });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch updated." };
}

export async function setHeadOffice(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const target = MOCK_BRANCHES.find((b) => b.id === id);
  if (!target) return { ok: false, message: "Branch not found." };

  for (const branch of MOCK_BRANCHES) branch.isHeadOffice = branch.id === id;
  revalidatePath("/admin/organization");
  return { ok: true, message: `${target.name} is now the Head Office.` };
}

export async function deleteBranch(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  const branch = MOCK_BRANCHES.find((b) => b.id === id);
  if (branch?.isHeadOffice) return { ok: false, message: "Can't delete the Head Office branch." };
  if (MOCK_CUSTOMERS.some((c) => c.branchId === id) || MOCK_LOANS.some((l) => l.branchId === id)) {
    return { ok: false, message: "Can't delete — this branch has customers or loans on record." };
  }
  removeById(MOCK_BRANCHES, id);
  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch deleted." };
}
