"use server";

import { revalidatePath } from "next/cache";
import { ShareholderInputSchema, type ShareholderInput } from "@/types/capital";
import {
  createShareholderRequest,
  deleteShareholderRequest,
  updateShareholderRequest,
} from "@/lib/api/capital";
import { ApiError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Capital → Share Holders.
 *
 * Authorization is CapitalPolicy's; these surface its refusal rather than
 * deciding it again.
 */

const NOT_ALLOWED: ActionResult = {
  ok: false,
  message: "You don't have permission to manage shareholders.",
};

/**
 * The same permission the API enforces (CapitalPolicy::manage), checked first
 * so a stale screen gets a clear answer without a round-trip. The API remains
 * the authority and refuses regardless.
 */
async function canManage(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== undefined && hasPermission(user, PERMISSIONS.TREASURY_MANAGE);
}

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function saveShareholder(input: ShareholderInput, id?: string): Promise<ActionResult> {
  if (!(await canManage())) return NOT_ALLOWED;

  const parsed = ShareholderInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    if (id) await updateShareholderRequest(id, parsed.data);
    else await createShareholderRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/capital/shareholders");
  return { ok: true, message: id ? "Shareholder updated." : "Shareholder registered." };
}

export async function deleteShareholder(id: string): Promise<ActionResult> {
  if (!(await canManage())) return NOT_ALLOWED;

  try {
    await deleteShareholderRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/capital/shareholders");
  return { ok: true, message: "Shareholder deleted." };
}
