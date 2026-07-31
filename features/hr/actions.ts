"use server";

import { revalidatePath } from "next/cache";
import {
  approveAdvanceRequest,
  approvePayrollRequest,
  decideStaffLoanRequest,
  disburseAdvanceRequest,
  finalizePayrollRequest,
  generateCommissionRequest,
  generatePayrollRequest,
  payPayrollRequest,
  recordPerformanceRequest,
  registerStaffRequest,
  rejectAdvanceRequest,
  requestAdvanceRequest,
  requestStaffLoanRequest,
  updateStaffRequest,
  type RegisterStaffInput,
  type UpdateStaffInput,
} from "@/lib/api/hr";
import { describeError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/domain/money";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * HR, Payroll & Commission writes — backend §11 / §15.5.
 *
 * The payroll and commission engines have left the frontend entirely. Line
 * computation, the allowance and deduction rules, loan and advance recovery,
 * the two ledger entries a finalized run posts, the payment entry, and §11's
 * "a branch that made a loss pays no commission" are all the API's — each one
 * has to happen inside the same transaction as the rows it touches, and a
 * second implementation here could only ever disagree with the books.
 *
 * §14's separation of duties is enforced there too: HR generates a draft that
 * posts nothing, Finance finalizes and pays, and disbursing an advance is
 * never HR's to execute.
 */

function revalidateHr() {
  revalidatePath("/hr");
  revalidatePath("/hr/staff");
  revalidatePath("/hr/payroll");
  revalidatePath("/hr/commission");
  revalidatePath("/hr/staff-advances");
  revalidatePath("/hr/performance");
  revalidatePath("/hr/staff-loans");
  // Bank → Payroll reads the same runs from the payslip side.
  revalidatePath("/treasury/payroll");
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function registerStaff(input: RegisterStaffInput): Promise<ActionResult & { staffId?: string }> {
  let staff;

  try {
    staff = await registerStaffRequest(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: `${staff.name ?? staff.employeeNumber} added to the staff book.`, staffId: staff.id };
}

export async function updateStaff(id: string, input: UpdateStaffInput): Promise<ActionResult> {
  try {
    await updateStaffRequest(id, input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  revalidatePath(`/hr/staff/${id}`);
  return { ok: true, message: "Staff record updated." };
}

/** Employment status is one field of the same update endpoint — there is no separate route. */
export async function setStaffEmploymentStatus(id: string, employmentStatus: string): Promise<ActionResult> {
  try {
    await updateStaffRequest(id, { employmentStatus });
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  revalidatePath(`/hr/staff/${id}`);
  return { ok: true, message: `Employment status set to ${employmentStatus}.` };
}

// ---------------------------------------------------------------------------
// Payroll — HR generates (draft, no ledger), Finance finalizes (posts). §14
// ---------------------------------------------------------------------------

export async function generatePayroll(period: string): Promise<ActionResult & { runId?: string }> {
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, message: "Period must be in YYYY-MM format." };

  let run;

  try {
    run = await generatePayrollRequest(period);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return {
    ok: true,
    message: `Draft payroll generated for ${period}. Finance must finalize it before anything posts.`,
    runId: run.id,
  };
}

/**
 * HR signs the figures off — §16.7.
 *
 * §16.1: "Salary haiwezi kubadilishwa baada ya approval." From here the period
 * is closed to regeneration and to any allowance or penalty change, which is
 * what makes that sentence enforceable rather than a statement of intent.
 *
 * It posts nothing. Finance still finalizes, and finalizing is what reaches the
 * ledger — §14's separation, unchanged.
 */
export async function approvePayroll(runId: string): Promise<ActionResult> {
  let run;

  try {
    run = await approvePayrollRequest(runId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return {
    ok: true,
    message: `Payroll ${run.period} approved — ${run.lineCount} staff. Finance can now post it.`,
  };
}

export async function finalizePayroll(runId: string): Promise<ActionResult> {
  let run;

  try {
    run = await finalizePayrollRequest(runId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: `Payroll ${run.period} finalized and posted — ${run.lineCount} staff.` };
}

export async function payPayroll(runId: string): Promise<ActionResult> {
  let run;

  try {
    run = await payPayrollRequest(runId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: `Payroll ${run.period} paid out to ${run.lineCount} staff.` };
}

// ---------------------------------------------------------------------------
// Staff loans — §14, and §16.7–16.8's approval/disbursement split
// ---------------------------------------------------------------------------

/**
 * Raising a loan against the Staff Fund.
 *
 * `recoveryPeriods` is the whole reason this is not a two-field form: the
 * instalment is the principal spread over the agreed term, and the flat figure
 * it replaced was never capped — a loan went on being deducted after it was
 * fully repaid, because nothing ever closed one.
 */
export async function requestStaffLoan(input: {
  staffProfileId: string;
  amount: number;
  recoveryPeriods: number;
}): Promise<ActionResult> {
  if (!input.staffProfileId) return { ok: false, message: "Choose a staff member." };
  if (!(input.amount > 0)) return { ok: false, message: "Enter an amount greater than zero." };
  if (!(input.recoveryPeriods >= 1)) {
    return { ok: false, message: "A loan is recovered over at least one payslip." };
  }

  let loan;

  try {
    loan = await requestStaffLoanRequest(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: `Staff loan ${loan.reference} requested.` };
}

export async function decideStaffLoan(
  action: "approve" | "reject" | "disburse",
  loanId: string,
  reason?: string
): Promise<ActionResult> {
  let loan;

  try {
    /*
     * Disbursement is Finance's alone — §16.8. An HR user calling it gets a 403
     * from the API, which is surfaced rather than pre-empted: the control
     * belongs where it cannot be bypassed.
     */
    loan = await decideStaffLoanRequest(action, loanId, reason);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();

  const verb = { approve: "approved", reject: "rejected", disburse: "disbursed" }[action];
  return { ok: true, message: `Staff loan ${loan.reference} ${verb}.` };
}

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

export async function generateCommission(period: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, message: "Period must be in YYYY-MM format." };

  let result;

  try {
    result = await generateCommissionRequest(period);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return {
    ok: true,
    message:
      result.blockedByLoss > 0
        ? `Commission pools built for ${period} — ${result.blockedByLoss} branch pool(s) blocked by a branch loss.`
        : `Commission pools built for ${period}: ${formatMoney(result.totalPool)} across ${result.pools.length} branch(es).`,
  };
}

// ---------------------------------------------------------------------------
// Staff advances — HR approves, Finance disburses (never HR). §11
// ---------------------------------------------------------------------------

export async function requestStaffAdvance(staffProfileId: string, amount: number): Promise<ActionResult> {
  if (amount <= 0) return { ok: false, message: "Amount must be greater than zero." };

  try {
    await requestAdvanceRequest(staffProfileId, amount);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: "Advance requested — awaiting HR approval." };
}

export async function decideStaffAdvance(advanceId: string, approve: boolean): Promise<ActionResult> {
  try {
    if (approve) await approveAdvanceRequest(advanceId);
    else await rejectAdvanceRequest(advanceId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: approve ? "Advance approved — Finance will disburse it." : "Advance rejected." };
}

/**
 * Finance-only. §11 is explicit that disbursement is never HR's to execute, and
 * the API checks the Finance money-movement grant rather than `hr.manage`.
 */
export async function disburseStaffAdvance(advanceId: string): Promise<ActionResult> {
  try {
    await disburseAdvanceRequest(advanceId);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: "Advance disbursed — it will be recovered automatically from payroll." };
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export async function recordPerformance(input: {
  staffProfileId: string;
  period: string;
  targets: Record<string, number>;
  achieved: Record<string, number>;
  rating?: string | null;
}): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}$/.test(input.period)) return { ok: false, message: "Period must be in YYYY-MM format." };
  if (Object.keys(input.targets).length === 0) return { ok: false, message: "At least one target is required." };

  try {
    await recordPerformanceRequest(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidateHr();
  return { ok: true, message: "Performance recorded." };
}
