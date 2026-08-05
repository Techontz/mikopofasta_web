"use server";

import { revalidatePath } from "next/cache";
import {
  CashDepositInputSchema,
  ClosePeriodInputSchema,
  RecoveryInputSchema,
  ReserveUtilisationInputSchema,
  WriteOffInputSchema,
  type CashDepositInput,
  type ClosePeriodInput,
  type RecoveryInput,
  type PeriodPreview,
  type ReserveUtilisationInput,
  type WriteOffInput,
} from "@/types/accounting";
import {
  approveReserveUtilisation as approveReserveRequest,
  closePeriodRequest,
  getPeriodPreview,
  recordCashDepositRequest,
  recordRecoveryRequest,
  reconcileCashDepositRequest,
  rejectReserveUtilisation as rejectReserveRequest,
  requestReserveUtilisation as raiseReserveRequest,
  writeOffLoanRequest,
} from "@/lib/api/accounting";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Month-end close, the Reserve fund, bank reconciliation and bad debt.
 *
 * Authorization, ledger posting, the balance guard and §14's separation of
 * duties all live in the API. These surface its refusal; nothing is re-decided
 * here, which is why an operator sees the same answer whether they use the
 * screen or call the endpoint.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/* -------------------------------------------------------------------------- */
/* Month-end close                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What closing a period WOULD recognise.
 *
 * A Server Action rather than a prop threaded down from the page, because the
 * dialog decides when to ask — the period is typed into it, and the page has
 * already rendered by then. Returns the error as data so the dialog can show it
 * inline rather than toasting a thrown exception.
 */
export async function previewPeriod(period: string): Promise<PeriodPreview | { error: string }> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return { error: "Give the period as YYYY-MM, for example 2026-07." };
  }

  try {
    return await getPeriodPreview(period);
  } catch (error) {
    const failure = fail(error);
    return { error: failure.message ?? "Could not read this period." };
  }
}

/**
 * Closing recognises the period's profit and appropriates its reserve.
 *
 * There is no reopen — D1 puts the appropriation inside the close, and
 * reopening would mean un-appropriating reserve Admin may already have
 * released. The screen asks for confirmation for exactly that reason.
 */
export async function closePeriod(input: ClosePeriodInput): Promise<ActionResult> {
  const parsed = ClosePeriodInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await closePeriodRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/treasury/periods");
  revalidatePath("/treasury");
  return { ok: true, message: `Period ${parsed.data.period} closed.` };
}

/* -------------------------------------------------------------------------- */
/* Reserve                                                                     */
/* -------------------------------------------------------------------------- */

function revalidateReserve(): void {
  revalidatePath("/treasury/reserve");
  // The overview carries the reserve balance and the pending-approvals count.
  revalidatePath("/treasury");
}

export async function requestReserveUtilisation(
  input: ReserveUtilisationInput
): Promise<ActionResult> {
  const parsed = ReserveUtilisationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await raiseReserveRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateReserve();
  // Nothing has left the fund yet, and saying so prevents the requester from
  // assuming the money is spent.
  return { ok: true, message: "Reserve request raised for Admin approval." };
}

export async function approveReserveUtilisation(id: string): Promise<ActionResult> {
  try {
    await approveReserveRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateReserve();
  return { ok: true, message: "Reserve released to Capital." };
}

export async function rejectReserveUtilisation(id: string, reason: string): Promise<ActionResult> {
  try {
    await rejectReserveRequest(id, reason);
  } catch (error) {
    return fail(error);
  }

  revalidateReserve();
  return { ok: true, message: "Reserve request rejected. Nothing left the fund." };
}

/* -------------------------------------------------------------------------- */
/* Bank reconciliation                                                         */
/* -------------------------------------------------------------------------- */

function revalidateDeposits(): void {
  revalidatePath("/treasury/reconciliation");
  revalidatePath("/treasury");
}

export async function recordCashDeposit(input: CashDepositInput): Promise<ActionResult> {
  const parsed = CashDepositInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await recordCashDepositRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateDeposits();
  // Nothing posts here: the cash was ledgered into the till at the counter, and
  // it does not move until the bank confirms receipt.
  return { ok: true, message: "Deposit recorded. It awaits Finance verification." };
}

export async function reconcileCashDeposit(depositId: string): Promise<ActionResult> {
  try {
    await reconcileCashDepositRequest(depositId);
  } catch (error) {
    return fail(error);
  }

  revalidateDeposits();
  revalidatePath("/teller");
  return { ok: true, message: "Deposit confirmed and the payments marked confirmed." };
}

/* -------------------------------------------------------------------------- */
/* Write-off and recovery                                                      */
/* -------------------------------------------------------------------------- */

function revalidateBadDebt(loanId: string): void {
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/treasury/write-offs");
  revalidatePath("/loans");
}

export async function writeOffLoan(loanId: string, input: WriteOffInput): Promise<ActionResult> {
  const parsed = WriteOffInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await writeOffLoanRequest(loanId, parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateBadDebt(loanId);
  // Only principal reached the ledger; the screen shows the rest as forgone.
  return { ok: true, message: "Loan written off. The outstanding principal is off the book." };
}

export async function recordRecovery(
  loanId: string,
  input: RecoveryInput,
  /**
   * Distinguishes one instalment from the next.
   *
   * A written-off loan may be recovered in instalments, and two of the same
   * amount are two genuine recoveries — so the idempotency key cannot be the
   * loan alone. The caller supplies a token per submission.
   */
  idempotencyToken: string
): Promise<ActionResult> {
  const parsed = RecoveryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await recordRecoveryRequest(loanId, parsed.data, idempotencyToken);
  } catch (error) {
    return fail(error);
  }

  revalidateBadDebt(loanId);
  return { ok: true, message: "Recovery recorded against the written-off loan." };
}
