"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ZoneSchema } from "@/types/branch";
import { createZoneRequest, deleteZoneRequest, updateZoneRequest } from "@/lib/api/organization";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

const ZoneInputSchema = ZoneSchema.pick({ name: true, zoneManagerId: true });

/**
 * Zones — `POST/PUT/DELETE /api/v1/zones`.
 *
 * Permission and referential integrity are the API's: deleting a zone that
 * branches are assigned to returns 409 with its own wording.
 */
export async function createZone(input: z.infer<typeof ZoneInputSchema>): Promise<ActionResult> {
  const parsed = ZoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createZoneRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone created." };
}

export async function updateZone(
  id: string,
  input: z.infer<typeof ZoneInputSchema>
): Promise<ActionResult> {
  const parsed = ZoneInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateZoneRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone updated." };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  try {
    await deleteZoneRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Zone deleted." };
}
