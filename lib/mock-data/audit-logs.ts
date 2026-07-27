import type { AuditLog } from "@/types/audit";
import { AUDIT_ACTIONS } from "@/types/audit";
import { MOCK_LOANS, MOCK_DISBURSEMENT_BATCHES } from "@/lib/mock-data/loans";
import { MOCK_PAYROLL_RUNS } from "@/lib/mock-data/payroll";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";

let seq = 0;
function log(action: string, auditableType: string, auditableId: string, userId: string | null, createdAt: string): AuditLog {
  seq++;
  return {
    id: `audit-${seq}`,
    userId,
    action,
    auditableType,
    auditableId,
    beforeJson: null,
    afterJson: null,
    ipAddress: null,
    userAgent: null,
    createdAt,
  };
}

export const MOCK_AUDIT_LOGS: AuditLog[] = [];

for (const loan of MOCK_LOANS) {
  if (loan.status === "draft") continue;
  MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.LOAN_APPLIED, "loan", loan.id, "u-loan-officer", new Date().toISOString()));
  if (loan.status === "rejected") {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.LOAN_REJECTED, "loan", loan.id, "u-branch-manager", new Date().toISOString()));
  } else if (loan.approvedAt) {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.LOAN_APPROVED, "loan", loan.id, "u-branch-manager", loan.approvedAt));
  }
  if (loan.disbursementDate) {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.LOAN_DISBURSED, "loan", loan.id, "u-finance", new Date(loan.disbursementDate).toISOString()));
  }
}

for (const batch of MOCK_DISBURSEMENT_BATCHES) {
  if (batch.attemptNumber > 1) {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.DISBURSEMENT_RETRIED, "disbursement_batch", batch.id, "u-finance", batch.requestedAt));
  }
}

for (const run of MOCK_PAYROLL_RUNS) {
  if (run.status === "finalized" && run.finalizedAt) {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.PAYROLL_FINALIZED, "payroll_run", run.id, "u-finance", run.finalizedAt));
  }
}

for (const advance of MOCK_STAFF_ADVANCES) {
  if (advance.approvedAt) {
    MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.STAFF_ADVANCE_APPROVED, "staff_advance", advance.id, advance.approvedBy, advance.approvedAt));
  }
}

const frozenLoan = MOCK_LOANS.find((l) => l.status === "closed" && l.frozenUntil);
if (frozenLoan) {
  MOCK_AUDIT_LOGS.push(log(AUDIT_ACTIONS.CUSTOMER_FROZEN, "customer", frozenLoan.customerId, "u-branch-manager", frozenLoan.closedAt ?? new Date().toISOString()));
}
