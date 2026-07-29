"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RegionSchema } from "@/types/branch";
import {
  createRegionRequest,
  deleteRegionRequest,
  updateRegionRequest,
} from "@/lib/api/organization";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

const RegionInputSchema = RegionSchema.pick({ name: true });

/**
 * Regions — `POST/PUT/DELETE /api/v1/regions`.
 *
 * The permission check is the API's: `admin.org_settings` is enforced there,
 * and a 403 comes back as an ApiError we surface. Checking it here as well
 * would be a second, drifting copy of the rule — and one that could disagree
 * with the server once the permission matrix is edited at runtime.
 *
 * The referential guards are the API's too. Deleting a region that branches
 * still reference returns 409 RESOURCE_IN_USE with its own message; the mock
 * used to re-derive that by scanning an in-memory array.
 */
export async function createRegion(input: z.infer<typeof RegionInputSchema>): Promise<ActionResult> {
  const parsed = RegionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createRegionRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Region created." };
}

export async function updateRegion(
  id: string,
  input: z.infer<typeof RegionInputSchema>
): Promise<ActionResult> {
  const parsed = RegionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateRegionRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Region updated." };
}

export async function deleteRegion(id: string): Promise<ActionResult> {
  try {
    await deleteRegionRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Region deleted." };
}
