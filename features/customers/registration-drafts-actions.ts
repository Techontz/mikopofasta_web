"use server";

import { revalidatePath } from "next/cache";
import {
  deleteRegistrationDraftRequest,
  getRegistrationDraft,
  markDraftSubmittedRequest,
  saveRegistrationDraftRequest,
  type RegistrationDraft,
  type RegistrationDraftSummary,
} from "@/lib/api/registration";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Save and resume, against the real backend.
 *
 * The wizard also keeps a `localStorage` copy that is rewritten on every
 * keystroke — that is what survives an accidental refresh between two server
 * saves, and it is deliberately kept. What it could never do is survive the
 * device, hold more than one registration at a time, or let a supervisor see
 * that a customer had been half-registered and abandoned. Those need a row.
 *
 * Every one of these fails soft. A draft save is a convenience layered over a
 * form that already works; a save endpoint being briefly unreachable must
 * report itself and leave the officer typing, never interrupt them.
 */

export async function saveRegistrationDraft(input: {
  id?: string | null;
  branchId: string;
  label: string;
  phone: string | null;
  step: number;
  payload: Record<string, unknown>;
}): Promise<ActionResult & { draft?: RegistrationDraftSummary }> {
  try {
    const draft = await saveRegistrationDraftRequest(input);
    revalidatePath("/customers/new");
    return { ok: true, message: "Draft saved.", draft };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

export async function loadRegistrationDraft(
  id: string
): Promise<ActionResult & { draft?: RegistrationDraft }> {
  try {
    return { ok: true, message: "Draft loaded.", draft: await getRegistrationDraft(id) };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

/**
 * Marks a draft as having become a customer.
 *
 * A failure here is reported and no more: the customer has already been
 * created, and a draft that stays open is a stale row somebody can discard,
 * not a lost registration.
 */
export async function markRegistrationDraftSubmitted(
  draftId: string,
  customerId: string
): Promise<ActionResult> {
  try {
    await markDraftSubmittedRequest(draftId, customerId);
    revalidatePath("/customers/new");
    return { ok: true, message: "Draft closed." };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

export async function discardRegistrationDraft(id: string): Promise<ActionResult> {
  try {
    await deleteRegistrationDraftRequest(id);
    revalidatePath("/customers/new");
    return { ok: true, message: "Draft discarded." };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}
