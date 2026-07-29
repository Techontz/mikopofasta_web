"use server";

import { revalidatePath } from "next/cache";
import {
  approveAdvanceRequest,
  disburseAdvanceRequest,
  finalizePayrollRequest,
  generateCommissionRequest,
  generatePayrollRequest,
  payPayrollRequest,
  recordPerformanceRequest,
  registerStaffRequest,
  rejectAdvanceRequest,
  requestAdvanceRequest,
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
  revalidatePath("/ledger");
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
