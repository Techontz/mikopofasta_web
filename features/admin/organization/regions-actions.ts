"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RegionSchema } from "@/types/branch";
import { REGIONS } from "@/lib/mock-data/regions";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const RegionInputSchema = RegionSchema.pick({ name: true });

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createRegion(input: z.infer<typeof RegionInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = RegionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(REGIONS, { id: nextId("region"), name: parsed.data.name });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Region created." };
}

export async function updateRegion(id: string, input: z.infer<typeof RegionInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = RegionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(REGIONS, { id, name: parsed.data.name });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Region updated." };
}

export async function deleteRegion(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_BRANCHES.some((b) => b.regionId === id)) {
    return { ok: false, message: "Can't delete — one or more branches are assigned to this region." };
  }
  removeById(REGIONS, id);
  revalidatePath("/admin/organization");
  return { ok: true, message: "Region deleted." };
}
