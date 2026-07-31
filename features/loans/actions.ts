"use server";

import { revalidatePath } from "next/cache";
import { LoanApplicationInputSchema, type LoanApplicationInput } from "@/types/loan";
import type { DisbursementChannel } from "@/types/enums";
import {
  applyForLoanRequest,
  cancelLoanRequest,
  checkEligibilityRequest,
  closeLoanRequest,
  decideLoanRequest,
  prepareDisbursementRequest,
  retryDisbursementRequest,
  retryMandateRequest,
  settleDisbursementRequest,
  telcoVerifyRequest,
  verifyMandateRequest,
  type EligibilityViolation,
} from "@/lib/api/loans";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Loan Origination writes — backend §10's workflow, in order.
 *
 * Everything these functions used to enforce against in-memory arrays is now
 * the API's, which is the only party that can enforce it correctly:
 *
 *   - The §10 state machine. An illegal transition is a 409
 *     ILLEGAL_LOAN_TRANSITION naming both states, not a local guess about what
 *     the loan's status was when the page last rendered.
 *   - §14 separation of duties, including "the officer who submitted an
 *     application can never approve it".
 *   - §13 branch scoping, and the cross-branch grant credit review needs.
 *   - Schedule generation on approval, the e-mandate lifecycle, disbursement
 *     attempt limits, and the ledger posting that follows a confirmed
 *     disbursement — all consequences the server owns.
 *
 * The UI contract is unchanged: same ActionResult, same messages, same toasts,
 * so features/loans/loan-actions-panel.tsx needed no edit.
 */

function revalidateLoan(loanId: string) {
  revalidatePath("/loans");
  revalidatePath(`/loans/${loanId}`);
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

/**
 * The same gates `applyForLoan` applies, without creating anything — used by
 * the application form to show violations before the officer submits.
 */
export async function checkLoanEligibility(
  input: LoanApplicationInput
): Promise<ActionResult & { eligible?: boolean; violations?: EligibilityViolation[] }> {
  const parsed = LoanApplicationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const result = await checkEligibilityRequest(parsed.data);
    return { ok: true, eligible: result.eligible, violations: result.violations };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

export async function applyForLoan(input: LoanApplicationInput): Promise<ActionResult & { loanId?: string }> {
  const parsed = LoanApplicationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  let loan;

  try {
    loan = await applyForLoanRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/loans");
  return { ok: true, message: "Loan application submitted for manager approval.", loanId: loan.id };
}

// ---------------------------------------------------------------------------
// Manager approval — separation of duties (backend §14)
// ---------------------------------------------------------------------------

export async function decideLoanApproval(
  loanId: string,
  decision: "approve" | "reject",
  reason?: string
): Promise<ActionResult> {
  if (decision === "reject" && !reason?.trim()) {
    return { ok: false, message: "A rejection reason is required." };
  }

  let loan;

  try {
    loan = await decideLoanRequest(loanId, decision, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);

  if (decision === "reject") return { ok: true, message: "Loan application rejected." };

  // Which of the two the API chose is visible in the status it returns, so the
  // message describes what actually happened rather than predicting it.
  return {
    ok: true,
    message:
      loan.status === "mandate_pending_otp"
        ? "Approved — E-Mandate OTP required next."
        : "Approved — sent to credit review.",
  };
}

// ---------------------------------------------------------------------------
// E-Mandate
// ---------------------------------------------------------------------------

/**
 * A wrong OTP is not an error to this endpoint: it records the failed attempt,
 * moves the loan to `mandate_failed` and returns 200 with that loan. So the
 * outcome has to be read from the status that comes back — trusting the HTTP
 * code alone would toast "verified" at an officer whose customer just failed
 * verification.
 */
export async function verifyMandateOtp(loanId: string, otp: string): Promise<ActionResult> {
  let loan;

  try {
    loan = await verifyMandateRequest(loanId, otp);
  } catch (error) {
    revalidateLoan(loanId);
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);

  if (loan.status === "mandate_failed") {
    return { ok: false, message: "Incorrect OTP — mandate marked failed. You can retry." };
  }

  return { ok: true, message: "E-Mandate verified — sent to credit review." };
}

export async function retryMandate(loanId: string): Promise<ActionResult> {
  try {
    await retryMandateRequest(loanId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return { ok: true, message: "New mandate OTP sent to the customer." };
}

// ---------------------------------------------------------------------------
// Credit review — telco verification
// ---------------------------------------------------------------------------

export async function runTelcoVerification(loanId: string, pass: boolean): Promise<ActionResult> {
  try {
    await telcoVerifyRequest(loanId, pass);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return {
    ok: true,
    message: pass ? "Telco verification passed — sent to Finance." : "Telco verification failed — loan rejected.",
  };
}

// ---------------------------------------------------------------------------
// Disbursement — Finance only (backend §14)
// ---------------------------------------------------------------------------

export async function prepareDisbursement(loanId: string, channel: DisbursementChannel): Promise<ActionResult> {
  try {
    await prepareDisbursementRequest(loanId, channel);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return { ok: true, message: "Disbursement batch prepared and sent to the provider." };
}

/**
 * The authenticated twin of the provider callback. The system never assumes its
 * own outbound call succeeded — only this settles the batch, and only a success
 * posts to the ledger (§6).
 */
export async function settleDisbursement(
  loanId: string,
  success: boolean,
  failureReason?: string
): Promise<ActionResult> {
  try {
    await settleDisbursementRequest(loanId, success, failureReason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return {
    ok: true,
    message: success
      ? "Disbursement confirmed — loan is now active and posted to the ledger."
      : "Disbursement failed — you can retry or escalate.",
  };
}

export async function retryDisbursement(loanId: string): Promise<ActionResult> {
  try {
    await retryDisbursementRequest(loanId);
  } catch (error) {
    // Hitting the attempt ceiling escalates the loan server-side, so the page
    // must refresh to show that even though the call came back an error.
    revalidateLoan(loanId);
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return { ok: true, message: "Retry sent to the provider." };
}

export async function cancelLoan(loanId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return { ok: false, message: "A cancellation reason is required." };

  try {
    await cancelLoanRequest(loanId, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return { ok: true, message: "Loan cancelled." };
}

// ---------------------------------------------------------------------------
// Closure
// ---------------------------------------------------------------------------

export async function closeLoan(loanId: string, freezeDays: number): Promise<ActionResult> {
  let loan;

  try {
    loan = await closeLoanRequest(loanId, freezeDays);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateLoan(loanId);
  return {
    ok: true,
    message: loan.frozenUntil
      ? `Loan closed. Customer is in cooldown until ${loan.frozenUntil}.`
      : "Loan closed.",
  };
}
