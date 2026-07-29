"use server";

import { revalidatePath } from "next/cache";
import { MOCK_PAYMENTS, MOCK_PAYMENT_ALLOCATIONS, MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_CASH_DEPOSITS } from "@/lib/mock-data/cash-deposits";
import { MOCK_LOANS, MOCK_LOAN_STATUS_HISTORY } from "@/lib/mock-data/loans";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { postEntry } from "@/lib/mock-data/journal-entries";
import {
  LOAN_RECEIVABLE_ACCOUNT_ID,
  INTEREST_INCOME_ACCOUNT_ID,
  PENALTY_INCOME_ACCOUNT_ID,
  RESERVE_ACCOUNT_ID,
  SUSPENSE_ACCOUNT_ID,
  tellerCashAccountId,
} from "@/lib/mock-data/chart-of-accounts";
import { allocatePayment } from "@/lib/domain/allocation";
import { buildRepaymentLines, buildSuspenseResolutionLines, sumAllocations, isCashChannel } from "@/lib/domain/repayment-posting";
import { round2 } from "@/lib/domain/money";
import { nextId } from "@/lib/domain/mock-store";
import { AUDIT_ACTIONS } from "@/types/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";
import type { LoanSchedule } from "@/types/loan";
import type { PaymentChannel } from "@/types/enums";

/**
 * Cash deposits and bank reconciliation — STILL ON MOCK DATA, deliberately.
 *
 * Module 5 replaced the repayments layer with the real API, but this flow has
 * no API to move to: there is no cash-deposit endpoint, no bank-reconciliation
 * endpoint, and `PaymentPolicy::reconcile` exists without a controller action
 * behind it. Rather than delete a working screen or leave buttons that 404,
 * the original mock implementation is preserved here verbatim, isolated in its
 * own file so the boundary is obvious.
 *
 * Consequence worth knowing: these functions read and write the mock arrays,
 * which no longer have anything to do with the payments the API now records.
 * Reconciling here does not touch real money. Expect this file to be deleted
 * whole when Treasury is integrated and the endpoints exist.
 */

async function requirePermission(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]): Promise<AuthenticatedUser | ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return { ok: false, message: "You don't have permission to do that." };
  return user;
}
function isDenied(v: AuthenticatedUser | ActionResult): v is ActionResult {
  return "ok" in v;
}

function commitSchedules(updated: LoanSchedule[]): void {
  for (const s of updated) {
    const index = MOCK_LOAN_SCHEDULES.findIndex((x) => x.id === s.id);
    if (index >= 0) MOCK_LOAN_SCHEDULES[index] = s;
  }
}

function cashAccountFor(channel: PaymentChannel, branchId: string | null): string {
  if (isCashChannel(channel) && branchId) return tellerCashAccountId(branchId);
  return MOCK_BANK_ACCOUNTS[0].chartAccountId;
}

function allocateAndPost(params: {
  paymentId: string;
  loanId: string;
  amount: number;
  channel: PaymentChannel;
  postedBy: string;
  description: string;
  viaSuspense: boolean;
}): { allocatedTotal: number; remainder: number } {
  const loan = MOCK_LOANS.find((l) => l.id === params.loanId)!;
  const schedules = MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === params.loanId);
  const result = allocatePayment(params.paymentId, params.amount, schedules);
  commitSchedules(result.updatedSchedules);

  const now = new Date().toISOString();
  for (const alloc of result.allocations) {
    MOCK_PAYMENT_ALLOCATIONS.push({ ...alloc, id: nextId("pa"), createdAt: now });
  }

  const totals = sumAllocations(result.allocations);
  const allocatedTotal = round2(totals.penalty + totals.interest + totals.principal);

  if (allocatedTotal > 0) {
    const shared = {
      penaltyIncomeAccountId: PENALTY_INCOME_ACCOUNT_ID,
      interestIncomeAccountId: INTEREST_INCOME_ACCOUNT_ID,
      loanReceivableAccountId: LOAN_RECEIVABLE_ACCOUNT_ID,
      reserveAccountId: RESERVE_ACCOUNT_ID,
      amount: allocatedTotal,
      totals,
      branchId: loan.branchId,
      customerId: loan.customerId,
      loanId: loan.id,
    };
    const lines = params.viaSuspense
      ? buildSuspenseResolutionLines({ ...shared, suspenseAccountId: SUSPENSE_ACCOUNT_ID })
      : buildRepaymentLines({ ...shared, cashAccountId: cashAccountFor(params.channel, loan.branchId) });

    postEntry({
      date: now,
      description: params.description,
      sourceType: "repayment",
      sourceId: params.paymentId,
      createdBy: params.postedBy,
      lines,
    });
  }

  // A loan that just cleared its arrears goes back to active — §10.
  const stillOverdue = MOCK_LOAN_SCHEDULES.some(
    (s) => s.loanId === params.loanId && s.status === "overdue" && s.principalDue + s.interestDue + s.penaltyDue > s.principalPaid + s.interestPaid + s.penaltyPaid
  );
  if (loan.status === "arrears" && !stillOverdue) {
    loan.status = "active";
    MOCK_LOAN_STATUS_HISTORY.push({
      id: nextId("lsh"),
      loanId: loan.id,
      fromStatus: "arrears",
      toStatus: "active",
      changedBy: params.postedBy,
      reason: "Arrears cleared by repayment",
      createdAt: now,
    });
  }

  return { allocatedTotal, remainder: result.unallocatedRemainder };
}

function logAudit(action: string, type: string, id: string, userId: string | null): void {
  MOCK_AUDIT_LOGS.push({
    id: nextId("audit"),
    userId,
    action,
    auditableType: type,
    auditableId: id,
    beforeJson: null,
    afterJson: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  });
}

function revalidateAll() {
  revalidatePath("/repayments");
  revalidatePath("/repayments/suspense");
  revalidatePath("/repayments/reconciliation");
  revalidatePath("/repayments/cash-entry");
  revalidatePath("/loans");
  revalidatePath("/ledger");
}

export async function createCashDeposit(amount: number, bankAccountId: string, slipReference: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_CASH_ENTRY);
  if (isDenied(actor)) return actor;
  if (amount <= 0) return { ok: false, message: "Deposit amount must be greater than zero." };
  if (!actor.branchId) return { ok: false, message: "You aren't assigned to a branch." };

  MOCK_CASH_DEPOSITS.push({
    id: nextId("dep"),
    tellerId: actor.id,
    branchId: actor.branchId,
    amount,
    bankAccountId,
    depositSlipPath: slipReference ? `/mock-documents/deposits/${slipReference}` : null,
    status: "pending",
    matchedPaymentIds: null,
    reconciledBy: null,
    reconciledAt: null,
  });

  revalidateAll();
  return { ok: true, message: "Cash deposit logged — Finance will reconcile it against the bank statement." };
}

export async function reconcileDeposit(depositId: string, paymentIds: string[]): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_RECONCILE);
  if (isDenied(actor)) return actor;

  const deposit = MOCK_CASH_DEPOSITS.find((d) => d.id === depositId);
  if (!deposit) return { ok: false, message: "Deposit not found." };
  if (deposit.status === "confirmed") return { ok: false, message: "This deposit is already reconciled." };
  if (paymentIds.length === 0) return { ok: false, message: "Select at least one payment to match." };

  const payments = MOCK_PAYMENTS.filter((p) => paymentIds.includes(p.id));
  const matchedTotal = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  if (Math.abs(matchedTotal - deposit.amount) > 0.01) {
    // Mismatches surface as flagged rows, never auto-corrected (backend §8).
    return {
      ok: false,
      message: `Matched payments total ${matchedTotal.toLocaleString()} but the deposit is ${deposit.amount.toLocaleString()} — investigate the difference.`,
    };
  }

  let confirmed = 0;
  for (const payment of payments) {
    if (payment.status !== "pending_verification" || !payment.loanId) continue;
    const loan = MOCK_LOANS.find((l) => l.id === payment.loanId)!;
    allocateAndPost({
      paymentId: payment.id,
      loanId: payment.loanId,
      amount: payment.amount,
      channel: payment.channel,
      postedBy: actor.id,
      description: `Repayment — ${loan.loanNumber} (${payment.paymentReference})`,
      viaSuspense: false,
    });
    payment.status = "confirmed";
    payment.confirmedAt = new Date().toISOString();
    logAudit(AUDIT_ACTIONS.PAYMENT_ALLOCATED, "payment", payment.id, actor.id);
    confirmed++;
  }

  deposit.status = "confirmed";
  deposit.matchedPaymentIds = paymentIds;
  deposit.reconciledBy = actor.id;
  deposit.reconciledAt = new Date().toISOString();

  revalidateAll();
  return { ok: true, message: `Deposit reconciled — ${confirmed} payment${confirmed === 1 ? "" : "s"} confirmed and posted.` };
}
