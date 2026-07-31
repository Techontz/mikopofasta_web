"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RepaymentScheduleSchema } from "@/types/loan-product";
import {
  createRepaymentScheduleRequest,
  deleteRepaymentScheduleRequest,
  updateRepaymentScheduleRequest,
} from "@/lib/api/system-configuration";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Settings → Repayment Schedules.
 *
 * The two guards that used to be checked here against fixtures — loans running
 * on a schedule, and products offering it — are the API's, and have to be: only
 * the server can see every loan. It refuses with a 409 naming what is in the
 * way, and that message is shown rather than replaced.
 *
 * The frequency is guarded too, and that one is new: changing it on a schedule
 * loans are already running would leave those loans with a cadence their own
 * configuration no longer explains, since `frequencyDays` is what generated
 * every one of their instalment dates.
 */
const ScheduleInputSchema = RepaymentScheduleSchema.pick({ name: true, code: true, frequencyDays: true });

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * The schedules screen and everything that reads the cadence list.
 *
 * A product's form offers schedules, and the loan application form picks one,
 * so a schedule added or retired here changes both.
 */
function revalidateSchedules(): void {
  revalidatePath("/admin/repayment-schedules");
  revalidatePath("/admin/loan-products");
  revalidatePath("/loans/apply");
}

export async function createRepaymentSchedule(
  input: z.infer<typeof ScheduleInputSchema>
): Promise<ActionResult> {
  const parsed = ScheduleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createRepaymentScheduleRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateSchedules();
  return { ok: true, message: "Repayment schedule created." };
}

export async function updateRepaymentSchedule(
  id: string,
  input: z.infer<typeof ScheduleInputSchema>
): Promise<ActionResult> {
  const parsed = ScheduleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    // A 409 here means the frequency was changed on a schedule loans are
    // running on. The name and code may still be corrected at any time.
    await updateRepaymentScheduleRequest(id, parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidateSchedules();
  return { ok: true, message: "Repayment schedule updated." };
}

export async function deleteRepaymentSchedule(id: string): Promise<ActionResult> {
  try {
    await deleteRepaymentScheduleRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidateSchedules();
  return { ok: true, message: "Repayment schedule deleted." };
}
