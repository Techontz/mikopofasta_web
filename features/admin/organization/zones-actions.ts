"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ZoneSchema } from "@/types/branch";
import { ZONES } from "@/lib/mock-data/zones";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const ZoneInputSchema = ZoneSchema.pick({ name: true, zoneManagerId: true });

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createZone(input: z.infer<typeof ZoneInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ZoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(ZONES, { id: nextId("zone"), name: parsed.data.name, zoneManagerId: parsed.data.zoneManagerId, deletedAt: null });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone created." };
}

export async function updateZone(id: string, input: z.infer<typeof ZoneInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = ZoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  upsert(ZONES, { id, name: parsed.data.name, zoneManagerId: parsed.data.zoneManagerId, deletedAt: null });
  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone updated." };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;

  if (MOCK_BRANCHES.some((b) => b.zoneId === id)) {
    return { ok: false, message: "Can't delete — one or more branches are assigned to this zone." };
  }
  removeById(ZONES, id);
  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone deleted." };
}
