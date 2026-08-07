"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BranchSchema } from "@/types/branch";
import {
  createBranchRequest,
  deleteBranchRequest,
  setHeadOfficeRequest,
  updateBranchApprovalRouteRequest,
  updateBranchRequest,
} from "@/lib/api/organization";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

const BranchInputSchema = BranchSchema.pick({
  name: true,
  code: true,
  regionId: true,
  zoneId: true,
  phone: true,
  type: true,
  parentBranchId: true,
  status: true,
}).extend({
  /**
   * Optional: the API derives one from the name when it is blank. It is offered
   * because the code appears in every customer payment reference the branch
   * issues, and that is a choice worth letting an administrator make
   * deliberately rather than inheriting from a naming accident.
   */
  code: z.string().optional().nullable(),
});

/**
 * Branches — `POST/PUT/DELETE /api/v1/branches` and §12's head-office move.
 *
 * Every rule that used to be re-implemented here now lives where it belongs:
 *
 *   - `admin.org_settings` is checked by the API.
 *   - "can't delete a branch with customers or loans" is a 409 from the API,
 *     which can see the whole book rather than one in-memory array.
 *   - "can't delete the Head Office" is likewise the API's, and its message
 *     names the branch.
 *   - Setting a new head office is a single endpoint, so the "exactly one HQ"
 *     invariant is one transaction rather than a loop over a local array that
 *     could half-apply.
 */
export async function createBranch(input: z.infer<typeof BranchInputSchema>): Promise<ActionResult> {
  const parsed = BranchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createBranchRequest(parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch created." };
}

export async function updateBranch(
  id: string,
  input: z.infer<typeof BranchInputSchema>
): Promise<ActionResult> {
  const parsed = BranchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateBranchRequest(id, parsed.data);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch updated." };
}

export async function setHeadOffice(id: string): Promise<ActionResult> {
  let branch;

  try {
    branch = await setHeadOfficeRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: `${branch.name} is now the Head Office.` };
}

export async function deleteBranch(id: string): Promise<ActionResult> {
  try {
    await deleteBranchRequest(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Branch deleted." };
}

/**
 * D4 — pins or unpins which approval stages a branch's applications must clear.
 *
 * Sends the complete picture the dialog is showing, including the nulls: a
 * stage sent as null has its pin removed and goes back to following the default
 * rule, which is otherwise inexpressible.
 *
 * Changes nothing about loans already raised — the API reads this configuration
 * at application time only, so a loan in flight keeps the route it was given.
 */
export async function updateBranchApprovalRoute(
  id: string,
  overrides: { stageId: string; required: boolean | null }[]
): Promise<ActionResult> {
  try {
    await updateBranchApprovalRouteRequest(id, overrides);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath("/admin/organization");
  return { ok: true, message: "Approval routing updated. Loans already in progress keep their existing route." };
}
