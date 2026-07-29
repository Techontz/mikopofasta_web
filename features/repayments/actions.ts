"use server";

import { revalidatePath } from "next/cache";
import { CashPaymentInputSchema, type CashPaymentInput } from "@/types/repayment";
import {
  allocateSuspenseRequest,
  investigateSuspenseRequest,
  recordCashPaymentRequest,
  recordUnmatchedPaymentRequest,
  runOverdueProcessRequest,
} from "@/lib/api/payments";
import { describeError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/domain/money";
import type { ActionResult } from "@/lib/domain/action-result";
import type { PaymentChannel } from "@/types/enums";

/**
 * Repayments writes — backend §7 / §15.3.
 *
 * The allocation engine has left the frontend entirely. Penalty → Interest →
 * Principal ordering, the ledger entry that follows it, the arrears-cleared and
 * fully-repaid loan transitions, penalty computation and duplicate detection
 * are all the API's, because every one of them has to happen inside the same
 * database transaction as the schedule rows it touches. A second implementation
 * here could only ever disagree with the books.
 *
 * The UI contract is unchanged: the same ActionResult, the same toasts.
 */

function revalidateAll() {
  revalidatePath("/repayments");
  revalidatePath("/repayments/suspense");
  revalidatePath("/repayments/cash-entry");
  revalidatePath("/loans");
  revalidatePath("/ledger");
}

// ---------------------------------------------------------------------------
// Teller cash entry
// ---------------------------------------------------------------------------

/**
 * `POST /payments/cash` sits behind the idempotency middleware, so a
 * double-submitted form replays the first result instead of taking the
 * customer's money twice. The key must be stable for *that* submission and
 * different for a genuine second payment of the same amount, which is why the
 * form supplies a token rather than it being derived from the amount alone.
 */
export async function recordCashPayment(
  input: CashPaymentInput & { idempotencyKey?: string }
): Promise<ActionResult & { paymentId?: string }> {
  const parsed = CashPaymentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const key = input.idempotencyKey?.trim();
  if (!key) return { ok: false, message: "Missing submission token — reload the page and try again." };

  let payment;

  try {
    payment = await recordCashPaymentRequest(parsed.data.loanId, parsed.data.amount, key);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateAll();

  const allocated = payment.allocations.reduce((sum, a) => sum + a.total, 0);
  const unallocated = Math.max(0, payment.amount - allocated);

  return {
    ok: true,
    message:
      unallocated > 0.01
        ? `Cash recorded — ${formatMoney(allocated)} allocated, ${formatMoney(unallocated)} exceeded the outstanding balance.`
        : "Cash recorded, allocated and posted to the ledger.",
    paymentId: payment.id,
  };
}

// ---------------------------------------------------------------------------
// Unmatched receipts
// ---------------------------------------------------------------------------

/**
 * Money that arrived without a usable reference. The API receives it, posts it
 * to Suspense and opens a suspense item — nothing is dropped (§7).
 *
 * This replaces the old "simulate inbound webhook" action: the real provider
 * callback authenticates with an HMAC signature this app does not hold, and a
 * BFF able to forge one would defeat the point of signing it.
 */
export async function recordUnmatchedPayment(input: {
  amount: number;
  channel: PaymentChannel;
  transactionId?: string | null;
  reason: string;
  branchId?: string | null;
}): Promise<ActionResult & { paymentId?: string }> {
  if (!(input.amount > 0)) return { ok: false, message: "Amount must be greater than zero." };
  if (!input.reason?.trim()) return { ok: false, message: "A reason is required." };

  let payment;

  try {
    payment = await recordUnmatchedPaymentRequest(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateAll();
  return {
    ok: true,
    message: `Receipt ${payment.paymentReference} recorded and parked in Suspense.`,
    paymentId: payment.id,
  };
}

// ---------------------------------------------------------------------------
// Suspense resolution
// ---------------------------------------------------------------------------

export async function allocateSuspenseItem(suspenseItemId: string, loanId: string): Promise<ActionResult> {
  if (!loanId) return { ok: false, message: "Pick a loan to allocate this to." };

  try {
    await allocateSuspenseRequest(suspenseItemId, loanId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateAll();
  return { ok: true, message: "Suspense item allocated." };
}

export async function markSuspenseInvestigating(suspenseItemId: string): Promise<ActionResult> {
  try {
    await investigateSuspenseRequest(suspenseItemId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateAll();
  return { ok: true, message: "Marked as under investigation." };
}

// ---------------------------------------------------------------------------
// Overdue / penalty run
// ---------------------------------------------------------------------------

export async function runOverdueProcess(): Promise<ActionResult> {
  let run;

  try {
    run = await runOverdueProcessRequest();
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateAll();
  return {
    ok: true,
    message:
      run.installmentsPenalised === 0
        ? "Run complete — no new penalties were due."
        : `Run complete — ${formatMoney(run.totalPenaltyApplied)} penalty applied across ${run.loansProcessed} loan(s), ${run.installmentsPenalised} installment(s).`,
  };
}
