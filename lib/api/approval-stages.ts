import "server-only";
import { apiData } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";

/**
 * Administration → Loan Approval Chain.
 *
 * The chain was always data — `loan_approval_stages`, read by the workflow and
 * snapshotted onto each loan when it is raised — but nothing reached it, which
 * made "configurable" indistinguishable from hardcoded.
 */

const token = async () => getApiToken();

export interface ApprovalStageRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sequence: number;
  loanStatus: string;
  requiredPermission: string;
  requiresMandateBefore: boolean;
  requiresBranchZone: boolean;
  issuesPaymentReference: boolean;
  isActive: boolean;
}

export interface ApprovalStageInput {
  code: string;
  name: string;
  description?: string | null;
  sequence: number;
  loanStatus: string;
  requiredPermission: string;
  requiresMandateBefore?: boolean;
  requiresBranchZone?: boolean;
  issuesPaymentReference?: boolean;
  isActive?: boolean;
}

export async function getApprovalStages(): Promise<{
  stages: ApprovalStageRecord[];
  /** The loan statuses a stage may hold, from the schema. */
  availableStatuses: string[];
}> {
  return apiData("/api/v1/loan-approval-stages", { token: await token() });
}

export async function createApprovalStage(input: ApprovalStageInput) {
  return apiData<ApprovalStageRecord>("/api/v1/loan-approval-stages", {
    method: "POST",
    body: input,
    token: await token(),
  });
}

export async function updateApprovalStage(id: string, input: ApprovalStageInput) {
  return apiData<ApprovalStageRecord>(`/api/v1/loan-approval-stages/${id}`, {
    method: "PUT",
    body: input,
    token: await token(),
  });
}

export async function deleteApprovalStage(id: string) {
  return apiData<{ removed: boolean }>(`/api/v1/loan-approval-stages/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}
