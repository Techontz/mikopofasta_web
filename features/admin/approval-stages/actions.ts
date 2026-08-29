"use server";

import { revalidatePath } from "next/cache";
import {
  createApprovalStage,
  deleteApprovalStage,
  updateApprovalStage,
  type ApprovalStageInput,
} from "@/lib/api/approval-stages";
import { describeError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";

const PATH = "/admin/approval-stages";

export async function saveStage(id: string | null, input: ApprovalStageInput): Promise<ActionResult> {
  try {
    if (id) await updateApprovalStage(id, input);
    else await createApprovalStage(input);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(PATH);

  return { ok: true, message: id ? `${input.name} updated.` : `${input.name} added.` };
}

export async function removeStage(id: string): Promise<ActionResult> {
  try {
    await deleteApprovalStage(id);
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  revalidatePath(PATH);

  return { ok: true };
}
