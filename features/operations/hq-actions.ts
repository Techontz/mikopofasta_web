"use server";

import { revalidatePath } from "next/cache";
import { decideHqTransaction, raiseHqTransaction, type RaiseHqTransactionInput } from "@/lib/api/headquarters";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import type { ApprovalStatus } from "@/types/operations";

/**
 * Headquarters Transaction → Requested Transactions / Approved Transactions.
 *
 * Authorization is CapitalPolicy's. Approval in particular is gated on §14
 * separation of duties — the requester may not approve their own movement —
 * and that check needs the identity on the record, which only the server has.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * All three screens together.
 *
 * A decision moves a row from the requested list to the approved one and
 * changes an account balance, so revalidating only the page that was acted on
 * would leave the other two showing figures that are no longer true.
 */
function revalidateHq(): void {
  for (const path of [
    "/hq/transactions/balance",
    "/hq/transactions/requests",
    "/hq/transactions/approved",
  ]) {
    revalidatePath(path);
  }
}

export async function raiseHqMovement(input: RaiseHqTransactionInput): Promise<ActionResult> {
  try {
    /*
     * Which account fields are required depends on the direction, and that
     * rule lives in the backend's RequestHqTransactionAction — it is a
     * property of the record rather than of one form, and the seeder obeys it
     * too. Restating it here would be a second copy to keep in step.
     */
    await raiseHqTransaction(input);
  } catch (error) {
    return fail(error);
  }

  revalidateHq();
  return { ok: true, message: "Transaction raised." };
}

export async function decideHqMovement(
  id: string,
  decision: Exclude<ApprovalStatus, "pending">,
  reference: string
): Promise<ActionResult> {
  try {
    await decideHqTransaction(id, decision);
  } catch (error) {
    // Covers the overdraw refusal too: a pot cannot be taken below zero,
    // and the backend's message names the account and what it actually holds.
    return fail(error);
  }

  revalidateHq();
  return { ok: true, message: `${reference} ${decision}.` };
}
