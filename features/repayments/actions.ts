"use server";

import { revalidatePath } from "next/cache";
import { InboundPaymentWebhookSchema, CashPaymentInputSchema, type InboundPaymentWebhook, type CashPaymentInput } from "@/types/repayment";
import { MOCK_PAYMENTS, MOCK_PAYMENT_ALLOCATIONS, MOCK_LOAN_SCHEDULES, MOCK_SUSPENSE_ITEMS } from "@/lib/mock-data/payments";
import { MOCK_CASH_DEPOSITS, MOCK_PENALTY_RUNS } from "@/lib/mock-data/cash-deposits";
import { MOCK_LOANS, MOCK_LOAN_STATUS_HISTORY } from "@/lib/mock-data/loans";
import { MOCK_LOAN_PRODUCTS } from "@/lib/mock-data/loan-products";
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
import { computePenalty } from "@/lib/domain/penalty";
import { round2 } from "@/lib/domain/money";
import { paymentReference as formatPaymentReference } from "@/lib/domain/id-generators";
import { nextId } from "@/lib/domain/mock-store";
import { AUDIT_ACTIONS } from "@/types/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";
import type { LoanSchedule } from "@/types/loan";
import type { PaymentChannel } from "@/types/enums";

async function requirePermission(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]): Promise<AuthenticatedUser | ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return { ok: false, message: "You don't have permission to do that." };
  return user;
}
function isDenied(v: AuthenticatedUser | ActionResult): v is ActionResult {
  return "ok" in v;
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

/** Writes allocation results back into the live schedule array in place. */
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

/**
 * Runs the shared allocation core and posts the resulting ledger entry.
 * Every intake channel funnels through here — backend §7's "exactly one
 * implementation of the Penalty→Interest→Principal rule".
 */
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

// ---------------------------------------------------------------------------
// Channel 1 — inbound provider payment (stands in for POST /webhooks/payments)
// ---------------------------------------------------------------------------

export async function recordInboundPayment(input: InboundPaymentWebhook): Promise<ActionResult & { paymentId?: string }> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_MANAGE);
  if (isDenied(actor)) return actor;

  const parsed = InboundPaymentWebhookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid payload." };
  const values = parsed.data;

  // Duplicate detection — unique transaction_id (backend §7).
  if (MOCK_PAYMENTS.some((p) => p.transactionId === values.transactionId)) {
    return { ok: false, message: `Duplicate transaction ${values.transactionId} — ignored.` };
  }

  const loan = MOCK_LOANS.find((l) => l.loanNumber === values.reference && l.deletedAt === null);
  const paymentId = nextId("pay");
  const now = new Date().toISOString();

  // Reference miss: the payment is still received and still ledgered — to
  // Suspense — never dropped (backend §7).
  if (!loan) {
    MOCK_PAYMENTS.push({
      id: paymentId,
      paymentReference: formatPaymentReference(MOCK_PAYMENTS.length + 1),
      loanId: null,
      customerId: null,
      amount: values.amount,
      channel: values.channel,
      transactionId: values.transactionId,
      status: "unmatched",
      branchId: null,
      tellerId: null,
      receivedAt: now,
      confirmedAt: null,
      createdBy: actor.id,
    });
    MOCK_SUSPENSE_ITEMS.push({
      id: nextId("susp"),
      paymentId,
      reason: `Reference not found: ${values.reference}`,
      amount: values.amount,
      status: "unallocated",
      resolvedBy: null,
      resolvedAt: null,
    });
    postEntry({
      date: now,
      description: `Unmatched payment received (${values.transactionId})`,
      sourceType: "repayment",
      sourceId: paymentId,
      createdBy: actor.id,
      lines: [
        { accountId: MOCK_BANK_ACCOUNTS[0].chartAccountId, debit: values.amount },
        { accountId: SUSPENSE_ACCOUNT_ID, credit: values.amount },
      ],
    });
    revalidateAll();
    return { ok: true, message: "Payment received but unmatched — parked in Suspense.", paymentId };
  }

  MOCK_PAYMENTS.push({
    id: paymentId,
    paymentReference: formatPaymentReference(MOCK_PAYMENTS.length + 1),
    loanId: loan.id,
    customerId: loan.customerId,
    amount: values.amount,
    channel: values.channel,
    transactionId: values.transactionId,
    status: "allocated",
    branchId: loan.branchId,
    tellerId: null,
    receivedAt: now,
    confirmedAt: now,
    createdBy: actor.id,
  });

  const { allocatedTotal, remainder } = allocateAndPost({
    paymentId,
    loanId: loan.id,
    amount: values.amount,
    channel: values.channel,
    postedBy: actor.id,
    description: `Repayment — ${loan.loanNumber} (${values.transactionId})`,
    viaSuspense: false,
  });

  const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId)!;
  payment.status = "confirmed";
  logAudit(AUDIT_ACTIONS.PAYMENT_ALLOCATED, "payment", paymentId, actor.id);

  // Overpayment: the excess is NOT silently absorbed into a schedule row —
  // it goes to Suspense for a Finance refund-or-apply decision (backend §7).
  if (remainder > 0.01) {
    MOCK_SUSPENSE_ITEMS.push({
      id: nextId("susp"),
      paymentId,
      reason: `Overpayment on ${loan.loanNumber} — exceeds outstanding balance`,
      amount: remainder,
      status: "unallocated",
      resolvedBy: null,
      resolvedAt: null,
    });
    postEntry({
      date: now,
      description: `Overpayment to Suspense — ${loan.loanNumber}`,
      sourceType: "repayment",
      sourceId: paymentId,
      createdBy: actor.id,
      lines: [
        { accountId: MOCK_BANK_ACCOUNTS[0].chartAccountId, debit: remainder, branchId: loan.branchId },
        { accountId: SUSPENSE_ACCOUNT_ID, credit: remainder, branchId: loan.branchId },
      ],
    });
  }

  revalidateAll();
  return {
    ok: true,
    message:
      remainder > 0.01
        ? `Allocated ${allocatedTotal.toLocaleString()}; ${remainder.toLocaleString()} overpayment sent to Suspense.`
        : "Payment allocated and confirmed.",
    paymentId,
  };
}

// ---------------------------------------------------------------------------
// Channel 2 — teller cash entry
// ---------------------------------------------------------------------------

export async function recordCashPayment(input: CashPaymentInput): Promise<ActionResult & { paymentId?: string }> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_CASH_ENTRY);
  if (isDenied(actor)) return actor;

  const parsed = CashPaymentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  const values = parsed.data;

  const loan = MOCK_LOANS.find((l) => l.id === values.loanId && l.deletedAt === null);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (!loan.disbursementDate) return { ok: false, message: "This loan hasn't been disbursed — there's nothing to repay yet." };

  const paymentId = nextId("pay");
  const now = new Date().toISOString();

  // Cash sits in a lower trust state until a deposit slip is reconciled
  // against it (backend §7) — so no ledger posting happens yet.
  MOCK_PAYMENTS.push({
    id: paymentId,
    paymentReference: formatPaymentReference(MOCK_PAYMENTS.length + 1),
    loanId: loan.id,
    customerId: loan.customerId,
    amount: values.amount,
    channel: "cash",
    transactionId: null,
    status: "pending_verification",
    branchId: values.branchId,
    tellerId: actor.id,
    receivedAt: now,
    confirmedAt: null,
    createdBy: actor.id,
  });

  revalidateAll();
  return { ok: true, message: "Cash payment recorded — awaiting bank reconciliation before it posts.", paymentId };
}

/** POST /payments/confirm — Finance confirms a pending-verification payment. */
export async function confirmPayment(paymentId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_MANAGE);
  if (isDenied(actor)) return actor;

  const payment = MOCK_PAYMENTS.find((p) => p.id === paymentId);
  if (!payment) return { ok: false, message: "Payment not found." };
  if (payment.status !== "pending_verification") return { ok: false, message: "This payment is not awaiting confirmation." };
  if (!payment.loanId) return { ok: false, message: "This payment isn't matched to a loan." };

  const loan = MOCK_LOANS.find((l) => l.id === payment.loanId)!;
  const { remainder } = allocateAndPost({
    paymentId,
    loanId: payment.loanId,
    amount: payment.amount,
    channel: payment.channel,
    postedBy: actor.id,
    description: `Repayment — ${loan.loanNumber} (${payment.paymentReference})`,
    viaSuspense: false,
  });

  payment.status = "confirmed";
  payment.confirmedAt = new Date().toISOString();
  logAudit(AUDIT_ACTIONS.PAYMENT_ALLOCATED, "payment", paymentId, actor.id);

  revalidateAll();
  return {
    ok: true,
    message: remainder > 0.01 ? `Confirmed — ${remainder.toLocaleString()} remained unallocated.` : "Payment confirmed and posted.",
  };
}

// ---------------------------------------------------------------------------
// Channel 3 — suspense resolution
// ---------------------------------------------------------------------------

export async function allocateSuspenseItem(suspenseItemId: string, loanId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_MANAGE);
  if (isDenied(actor)) return actor;

  const item = MOCK_SUSPENSE_ITEMS.find((s) => s.id === suspenseItemId);
  if (!item) return { ok: false, message: "Suspense item not found." };
  if (item.status === "allocated") return { ok: false, message: "This item has already been allocated." };

  const loan = MOCK_LOANS.find((l) => l.id === loanId && l.deletedAt === null);
  if (!loan) return { ok: false, message: "Loan not found." };
  if (!loan.disbursementDate) return { ok: false, message: "That loan hasn't been disbursed yet." };

  const { allocatedTotal, remainder } = allocateAndPost({
    paymentId: item.paymentId,
    loanId,
    amount: item.amount,
    channel: "api",
    postedBy: actor.id,
    description: `Suspense resolved to ${loan.loanNumber}`,
    viaSuspense: true,
  });

  if (allocatedTotal <= 0) {
    return { ok: false, message: "That loan has nothing outstanding — pick another loan." };
  }

  item.status = "allocated";
  item.resolvedBy = actor.id;
  item.resolvedAt = new Date().toISOString();

  const payment = MOCK_PAYMENTS.find((p) => p.id === item.paymentId);
  if (payment) {
    payment.loanId = loanId;
    payment.customerId = loan.customerId;
    payment.branchId = loan.branchId;
    payment.status = "confirmed";
    payment.confirmedAt = new Date().toISOString();
  }
  logAudit(AUDIT_ACTIONS.PAYMENT_ALLOCATED, "payment", item.paymentId, actor.id);

  revalidateAll();
  return {
    ok: true,
    message: remainder > 0.01 ? `Allocated; ${remainder.toLocaleString()} still unallocated.` : `Suspense item allocated to ${loan.loanNumber}.`,
  };
}

export async function markSuspenseInvestigating(suspenseItemId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_MANAGE);
  if (isDenied(actor)) return actor;
  const item = MOCK_SUSPENSE_ITEMS.find((s) => s.id === suspenseItemId);
  if (!item) return { ok: false, message: "Suspense item not found." };
  if (item.status === "allocated") return { ok: false, message: "Already allocated." };
  item.status = "investigating";
  item.resolvedBy = actor.id;
  revalidateAll();
  return { ok: true, message: "Marked as under investigation." };
}

// ---------------------------------------------------------------------------
// Cash deposits & bank reconciliation
// ---------------------------------------------------------------------------

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

/**
 * POST /finance/bank-reconciliation — matches a deposit slip to the teller's
 * pending cash payments and confirms them, which is what actually posts them
 * to the ledger (backend §7).
 */
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

// ---------------------------------------------------------------------------
// Overdue / penalty run — POST /loans/overdue/process
// ---------------------------------------------------------------------------

/**
 * TODO(OSC-1): §7 says this job should also post "Dr Loan Arrears / Cr
 * Expected Schedule", but "Expected Schedule" is not one of the accounts
 * defined in §5, and §5 already credits Penalty Income when a penalty is
 * *collected* — so posting on accrual as well would double-count penalty
 * income. Deliberately posting nothing here: penalty income is recognised on
 * collection only, and no undefined ledger account is invented. See
 * docs/backend-architecture-specification.md → "Open Specification
 * Conflicts" → OSC-1. Resolve with the backend team before integration.
 */
export async function runOverdueProcess(): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.REPAYMENTS_MANAGE);
  if (isDenied(actor)) return actor;

  const today = new Date();
  const touchedLoans = new Set<string>();
  let totalPenalty = 0;

  for (const schedule of MOCK_LOAN_SCHEDULES) {
    if (schedule.status === "paid") continue;
    const loan = MOCK_LOANS.find((l) => l.id === schedule.loanId);
    if (!loan || !loan.disbursementDate || loan.deletedAt !== null) continue;
    const product = MOCK_LOAN_PRODUCTS.find((p) => p.id === loan.loanProductId);
    if (!product) continue;

    if (new Date(schedule.dueDate) < today && schedule.status !== "overdue") {
      schedule.status = "overdue";
    }

    const penalty = computePenalty(schedule, product, today);
    // Only top up to the computed figure — re-running the job must not
    // stack penalties on the same installment.
    if (penalty > schedule.penaltyDue) {
      totalPenalty = round2(totalPenalty + (penalty - schedule.penaltyDue));
      schedule.penaltyDue = penalty;
      touchedLoans.add(loan.id);
    }
  }

  for (const loanId of touchedLoans) {
    const loan = MOCK_LOANS.find((l) => l.id === loanId)!;
    if (loan.status === "active") {
      loan.status = "arrears";
      MOCK_LOAN_STATUS_HISTORY.push({
        id: nextId("lsh"),
        loanId,
        fromStatus: "active",
        toStatus: "arrears",
        changedBy: actor.id,
        reason: "Overdue installment penalised",
        createdAt: new Date().toISOString(),
      });
    }
  }

  MOCK_PENALTY_RUNS.push({
    id: nextId("prun"),
    runDate: today.toISOString().slice(0, 10),
    loansProcessed: touchedLoans.size,
    totalPenaltyApplied: totalPenalty,
    triggeredBy: "manual",
    createdAt: today.toISOString(),
  });

  revalidateAll();
  return {
    ok: true,
    message:
      touchedLoans.size === 0
        ? "Run complete — no new penalties were due."
        : `Run complete — ${totalPenalty.toLocaleString()} penalty applied across ${touchedLoans.size} loan(s).`,
  };
}
