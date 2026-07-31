"use server";

import { revalidatePath } from "next/cache";
import {
  closeBankAccountRequest,
  decideBankTransaction,
  makeBankTransfer,
  raiseBankTransaction,
  registerBankAccount,
  updateBankAccountRequest,
  type MakeBankTransferInput,
  type RaiseBankTransactionInput,
} from "@/lib/api/bank";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import {
  BankAccountInputSchema,
  type BankAccountInput,
  type TransactionStatus,
} from "@/types/bank";

/**
 * Bank — Register Account, Bank Transaction, Approved Transaction and the two
 * Transfer Balance screens.
 *
 * Authorization is CapitalPolicy's. Two of its rules cannot be checked here at
 * all and are surfaced rather than duplicated: the requester may not approve
 * their own transaction, and no account may be overdrawn — both need the
 * ledger, which only the server has.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * Every Bank screen together.
 *
 * A transaction changes an account balance, and a transfer changes two — so
 * revalidating only the page that was acted on would leave the balance screen
 * showing a figure that is no longer true.
 */
function revalidateBank(): void {
  for (const path of [
    "/treasury/accounts",
    "/treasury/bank-accounts",
    "/treasury/transactions",
    "/treasury/transactions/approved",
    "/treasury/transfers/branch",
    "/treasury/transfers/salary-advance",
  ]) {
    revalidatePath(path);
  }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function saveBankAccount(input: BankAccountInput, id?: string): Promise<ActionResult> {
  const parsed = BankAccountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    if (id) await updateBankAccountRequest(id, parsed.data);
    else await registerBankAccount(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateBank();
  return { ok: true, message: id ? "Account updated." : "Account registered." };
}

export async function closeBankAccount(id: string, accountName: string): Promise<ActionResult> {
  try {
    // Refused while the account still holds money or has a pending movement;
    // the backend's message says which.
    await closeBankAccountRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateBank();
  return { ok: true, message: `${accountName} closed.` };
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function raiseBankMovement(input: RaiseBankTransactionInput): Promise<ActionResult> {
  try {
    await raiseBankTransaction(input);
  } catch (error) {
    return fail(error);
  }

  revalidateBank();
  return { ok: true, message: "Transaction raised." };
}

export async function decideBankMovement(
  id: string,
  decision: Exclude<TransactionStatus, "pending">,
  reference: string,
  note?: string
): Promise<ActionResult> {
  try {
    await decideBankTransaction(id, decision, note ?? null);
  } catch (error) {
    // Covers the overdraw refusal, which is only knowable from the ledger.
    return fail(error);
  }

  revalidateBank();
  return { ok: true, message: `${reference} ${decision}.` };
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export async function transferBankBalance(input: MakeBankTransferInput): Promise<ActionResult> {
  try {
    /*
     * A transfer applies immediately — the legacy screens show no approval
     * step, and both kinds are one person moving the company's own money
     * between its own accounts. So this either moved the money or it did not;
     * there is no queued state to report.
     */
    await makeBankTransfer(input);
  } catch (error) {
    return fail(error);
  }

  revalidateBank();
  return { ok: true, message: "Transfer completed." };
}
