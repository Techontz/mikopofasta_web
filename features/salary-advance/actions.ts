"use server";

import { revalidatePath } from "next/cache";
import {
  approveSalaryAdvance,
  createSalaryAdvanceCategory,
  deleteSalaryAdvanceCategory,
  disburseSalaryAdvance,
  rejectSalaryAdvance,
  requestSalaryAdvance,
  updateSalaryAdvanceCategory,
  type SalaryAdvanceCategoryPayload,
} from "@/lib/api/salary-advance";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import {
  SalaryAdvanceCategoryInputSchema,
  type SalaryAdvanceCategoryInput,
} from "@/types/salary-advance";

/**
 * The six Salary Advance screens.
 *
 * Authorization is the HR policy's, and §11's separation of duties is enforced
 * server-side: HR approves, Finance disburses, and the two are different
 * grants. Nothing here re-checks that — a permission test on this side is a
 * second answer that can drift from the server's, and this is the rule the
 * specification is most emphatic about.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * All six screens together.
 *
 * An advance moves between them as it is decided — a request becomes an
 * approved one, an approved one becomes active — so revalidating only the page
 * that was acted on would leave the others showing a stage the advance has
 * already left. The categories screen is included because retiring a band is
 * refused while an advance under it is in flight, and that answer depends on
 * this queue.
 */
function revalidateSalaryAdvance(): void {
  for (const path of [
    "/salary-advance/categories",
    "/salary-advance/requests",
    "/salary-advance/approved",
    "/salary-advance/active",
    "/salary-advance/repayments",
    "/salary-advance/paid",
    "/hr/staff-advances",
  ]) {
    revalidatePath(path);
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveAdvanceCategory(
  values: SalaryAdvanceCategoryInput & { recoveryPeriods: number },
  id?: string
): Promise<ActionResult> {
  const parsed = SalaryAdvanceCategoryInputSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const payload: SalaryAdvanceCategoryPayload = {
    ...parsed.data,
    recoveryPeriods: values.recoveryPeriods,
  };

  try {
    /*
     * Whether the band overlaps another is checked server-side and surfaced
     * here. Only the server can see the neighbours, and two bands covering one
     * amount would price the same request two ways depending on which was
     * matched first.
     */
    if (id) await updateSalaryAdvanceCategory(id, payload);
    else await createSalaryAdvanceCategory(payload);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: id ? `${parsed.data.name} updated.` : `${parsed.data.name} added.` };
}

export async function removeAdvanceCategory(id: string, name: string): Promise<ActionResult> {
  try {
    // Refused while an advance under it is still in flight.
    await deleteSalaryAdvanceCategory(id);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: `${name} deleted.` };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function raiseAdvanceRequest(input: {
  staffProfileId: string;
  amount: number;
}): Promise<ActionResult> {
  if (!input.staffProfileId) return { ok: false, message: "Choose a staff member." };
  if (!(input.amount > 0)) return { ok: false, message: "Enter an amount greater than zero." };

  try {
    /*
     * The band — and so the interest, fee and recovery term — is resolved from
     * the amount server-side. A request that falls outside every band is
     * refused rather than priced by the nearest one.
     */
    await requestSalaryAdvance(input);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: "Salary advance requested." };
}

export async function approveAdvance(id: string, reference: string): Promise<ActionResult> {
  try {
    await approveSalaryAdvance(id);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: `${reference} approved.` };
}

export async function rejectAdvance(
  id: string,
  reference: string,
  reason?: string
): Promise<ActionResult> {
  try {
    await rejectSalaryAdvance(id, reason);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: `${reference} rejected.` };
}

export async function disburseAdvance(id: string, reference: string): Promise<ActionResult> {
  try {
    /*
     * Finance only. An HR user calling this gets a 403 from the server, which
     * is surfaced rather than pre-empted — §11 makes this the control that
     * matters most in the module, and it belongs where it cannot be bypassed.
     */
    await disburseSalaryAdvance(id);
  } catch (error) {
    return fail(error);
  }

  revalidateSalaryAdvance();
  return { ok: true, message: `${reference} disbursed.` };
}
