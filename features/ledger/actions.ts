"use server";

import { revalidatePath } from "next/cache";
import { ReverseEntryInputSchema } from "@/types/ledger";
import {
  approveReversalRequest,
  getSubLedger,
  rejectReversalRequest,
  requestReversalRequest,
  type SubLedgerDimensionSlug,
} from "@/lib/api/ledger";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Ledger writes — backend §5 / §8 / §15.4.
 *
 * There is exactly one, and it is a reversal. Nothing here posts an entry
 * directly: an entry is a consequence of a business event and LedgerService is
 * its only writer. Even approving a reversal does not edit anything — the API
 * posts a *new* entry with the sides swapped and points it at the original,
 * which is the property that makes the ledger auditable.
 *
 * The rules this file used to re-implement are now the API's, where they can
 * see the whole book: "a reversal can't itself be reversed", "this entry is
 * already reversed", "a request is already pending", and §14's separation of
 * duties — the requester can never approve their own reversal.
 */

function revalidateLedger() {
  revalidatePath("/ledger");
  revalidatePath("/ledger/entries");
  revalidatePath("/ledger/reversals");
  revalidatePath("/treasury");
}

/**
 * One subject's sub-ledger, fetched on demand.
 *
 * `GET /ledger/{dimension}/{id}` answers for a single subject, so the explorer
 * asks for the one that is selected rather than the page shipping every posted
 * line to the browser and filtering there — which is what it used to do, and
 * which would now mean downloading the whole journal to look at one loan.
 */
export interface SubLedgerLines {
  lines: {
    id: string;
    entryId: string;
    accountCode: string | null;
    accountName: string | null;
    debit: number;
    credit: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  net: number;
}

export async function fetchSubLedger(
  dimension: SubLedgerDimensionSlug,
  id: string
): Promise<ActionResult & { data?: SubLedgerLines }> {
  if (!id) return { ok: false, message: "Pick a subject first." };

  try {
    const result = await getSubLedger(dimension, id);
    return {
      ok: true,
      data: {
        lines: result.lines.map((l) => ({
          id: l.id,
          entryId: l.journalEntryId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: l.debitAmount,
          credit: l.creditAmount,
        })),
        totalDebits: result.totalDebits,
        totalCredits: result.totalCredits,
        net: result.net,
      },
    };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

export async function requestReversal(journalEntryId: string, reason: string): Promise<ActionResult> {
  const parsed = ReverseEntryInputSchema.safeParse({ journalEntryId, reason });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "A reason is required." };

  try {
    await requestReversalRequest(parsed.data.journalEntryId, parsed.data.reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLedger();
  return { ok: true, message: "Reversal requested — awaiting approval." };
}

export async function approveReversal(reversalRequestId: string): Promise<ActionResult> {
  let reversal;

  try {
    reversal = await approveReversalRequest(reversalRequestId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLedger();
  return {
    ok: true,
    message: reversal.entryNumber
      ? `Reversal posted as a new entry against ${reversal.entryNumber}.`
      : "Reversal posted as a new entry.",
  };
}

export async function rejectReversal(reversalRequestId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, message: "A reason is required." };

  try {
    await rejectReversalRequest(reversalRequestId, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLedger();
  return { ok: true, message: "Reversal request rejected." };
}
