"use server";

import { revalidatePath } from "next/cache";
import {
  CapitalContributionInputSchema,
  FloatTransferInputSchema,
  type CapitalContributionInput,
  type FloatTransferInput,
} from "@/types/capital";
import {
  approveFloatTransferRequest,
  deleteCapitalRequest,
  deleteFloatTransferRequest,
  recordCapitalRequest,
  rejectFloatTransferRequest,
  requestFloatTransferRequest,
} from "@/lib/api/capital";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Capital → Add Capitals and the three float screens.
 *
 * Authorization, ledger posting and the §14 approval rule all live in the API;
 * CapitalPolicy decides and these surface its refusal. Nothing is re-decided
 * here.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/** Every float screen reads the same collection, so all of them revalidate. */
function revalidateFloat(): void {
  for (const path of ["/capital/float", "/capital/float-branch", "/capital/float-approved", "/capital/float-accounts"]) {
    revalidatePath(path);
  }
}

export async function recordCapital(input: CapitalContributionInput): Promise<ActionResult> {
  const parsed = CapitalContributionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await recordCapitalRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/capital/contributions");
  return { ok: true, message: "Capital recorded." };
}

export async function deleteCapital(id: string): Promise<ActionResult> {
  try {
    await deleteCapitalRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/capital/contributions");
  // The API reverses the posting rather than deleting it; say so.
  return { ok: true, message: "Capital removed and the entry reversed." };
}

export async function requestFloatTransfer(input: FloatTransferInput): Promise<ActionResult> {
  const parsed = FloatTransferInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await requestFloatTransferRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateFloat();
  return {
    ok: true,
    // Branch-to-branch waits for a second person; the other kinds apply at once.
    message: parsed.data.kind === "branch_to_branch" ? "Transfer raised for approval." : "Float transferred.",
  };
}

export async function approveFloatTransfer(id: string): Promise<ActionResult> {
  try {
    await approveFloatTransferRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateFloat();
  return { ok: true, message: "Transfer approved and posted." };
}

export async function rejectFloatTransfer(id: string, reason: string): Promise<ActionResult> {
  try {
    await rejectFloatTransferRequest(id, reason);
  } catch (error) {
    return fail(error);
  }

  revalidateFloat();
  return { ok: true, message: "Transfer rejected." };
}

export async function deleteFloatTransfer(id: string): Promise<ActionResult> {
  try {
    await deleteFloatTransferRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateFloat();
  return { ok: true, message: "Transfer deleted." };
}
