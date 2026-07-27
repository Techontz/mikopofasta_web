import type { Payment, PaymentAllocation, SuspenseItem } from "@/types/repayment";
import type { LoanSchedule } from "@/types/loan";
import { allocatePayment } from "@/lib/domain/allocation";
import { paymentReference, transactionId } from "@/lib/domain/id-generators";
import { round2 } from "@/lib/domain/money";
import { createRng, pick } from "@/lib/domain/rng";
import { MOCK_LOANS, MOCK_RAW_LOAN_SCHEDULES } from "@/lib/mock-data/loans";

const rng = createRng(20260703);

/**
 * Simulates realistic repayment history per loan. Schedules feed forward
 * (each payment sees the previous payment's result) exactly as the real
 * allocation engine (lib/domain/allocation.ts) would process a sequence of
 * incoming payments — this file, not loans.ts, is the authoritative source
 * for loan schedule state, since "paid" only makes sense post-payment.
 */
const PAID_FRACTION_BY_STATUS: Record<string, number> = {
  active: 0.55,
  arrears: 0.35,
  defaulted: 0.25,
  written_off: 0.2,
  recovered: 1,
  closed: 1,
};

const CHANNELS = ["mobile_money", "bank", "cash"] as const;

let paymentSeq = 0;
let allocationSeq = 0;

export const MOCK_PAYMENTS: Payment[] = [];
export const MOCK_PAYMENT_ALLOCATIONS: PaymentAllocation[] = [];
export const MOCK_LOAN_SCHEDULES: LoanSchedule[] = [];

const TODAY = new Date();

for (const loan of MOCK_LOANS) {
  const schedules = MOCK_RAW_LOAN_SCHEDULES.filter((s) => s.loanId === loan.id).sort((a, b) => a.installmentNumber - b.installmentNumber);
  if (schedules.length === 0) continue;

  const paidFraction = PAID_FRACTION_BY_STATUS[loan.status] ?? 0;
  const dueCount = schedules.filter((s) => new Date(s.dueDate) <= TODAY).length;
  const numToPay = Math.min(Math.round(schedules.length * paidFraction), dueCount);

  let running = schedules;
  for (let i = 0; i < numToPay; i++) {
    const installment = running.find((s) => s.installmentNumber === i + 1)!;
    const amount = round2(installment.principalDue + installment.interestDue);
    if (amount <= 0) continue;

    paymentSeq++;
    const paymentId = `pay-${loan.id}-${i + 1}`;
    const receivedAt = installment.dueDate; // on-time, for simplicity of the seed narrative

    const result = allocatePayment(paymentId, amount, running);
    running = result.updatedSchedules;

    MOCK_PAYMENTS.push({
      id: paymentId,
      paymentReference: paymentReference(paymentSeq),
      loanId: loan.id,
      customerId: loan.customerId,
      amount,
      channel: pick(rng, CHANNELS),
      transactionId: transactionId(paymentSeq),
      status: "confirmed",
      branchId: loan.branchId,
      tellerId: null,
      receivedAt: new Date(receivedAt).toISOString(),
      confirmedAt: new Date(receivedAt).toISOString(),
      createdBy: null,
    });

    for (const alloc of result.allocations) {
      allocationSeq++;
      MOCK_PAYMENT_ALLOCATIONS.push({ ...alloc, id: `pa-${allocationSeq}`, createdAt: new Date(receivedAt).toISOString() });
    }
  }

  // Anything still outstanding past its due date is genuinely overdue now.
  running = running.map((s) => {
    const isFullyPaid = s.status === "paid";
    const isPastDue = new Date(s.dueDate) < TODAY;
    if (!isFullyPaid && isPastDue) return { ...s, status: "overdue" as const };
    return s;
  });

  MOCK_LOAN_SCHEDULES.push(...running);
}

// Two unmatched payments parked in Suspense — backend §7.
export const MOCK_SUSPENSE_ITEMS: SuspenseItem[] = [
  { id: "susp-1", paymentId: "pay-unmatched-1", reason: "Reference not found: LN-2026-999999", amount: 45_000, status: "unallocated", resolvedBy: null, resolvedAt: null },
  { id: "susp-2", paymentId: "pay-unmatched-2", reason: "Wrong reference format", amount: 120_000, status: "investigating", resolvedBy: "u-finance", resolvedAt: null },
];

MOCK_PAYMENTS.push(
  {
    id: "pay-unmatched-1",
    paymentReference: paymentReference(++paymentSeq),
    loanId: null,
    customerId: null,
    amount: 45_000,
    channel: "mobile_money",
    transactionId: transactionId(paymentSeq),
    status: "unmatched",
    branchId: null,
    tellerId: null,
    receivedAt: new Date().toISOString(),
    confirmedAt: null,
    createdBy: null,
  },
  {
    id: "pay-unmatched-2",
    paymentReference: paymentReference(++paymentSeq),
    loanId: null,
    customerId: null,
    amount: 120_000,
    channel: "bank",
    transactionId: transactionId(paymentSeq),
    status: "unmatched",
    branchId: null,
    tellerId: null,
    receivedAt: new Date().toISOString(),
    confirmedAt: null,
    createdBy: null,
  }
);
