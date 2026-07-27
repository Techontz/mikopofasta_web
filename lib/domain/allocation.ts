import { round2 } from "@/lib/domain/money";
import { scheduleOutstanding, type LoanSchedule } from "@/types/loan";
import type { PaymentAllocation } from "@/types/repayment";

/**
 * The one and only allocation order in the system — Penalty -> Interest ->
 * Principal — per the finalized Decision 2 (resolves the conflict between
 * the original Ledger doc and Repayment doc). Walks a loan's oldest unpaid
 * installments first, exactly as backend spec §7 describes.
 */
export function allocatePayment(
  paymentId: string,
  amount: number,
  schedules: LoanSchedule[]
): { updatedSchedules: LoanSchedule[]; allocations: Omit<PaymentAllocation, "id" | "createdAt">[]; unallocatedRemainder: number } {
  const ordered = [...schedules].sort((a, b) => a.installmentNumber - b.installmentNumber);
  let remaining = amount;
  const allocations: Omit<PaymentAllocation, "id" | "createdAt">[] = [];
  const updatedSchedules: LoanSchedule[] = [];

  for (const schedule of ordered) {
    if (remaining <= 0) {
      updatedSchedules.push(schedule);
      continue;
    }
    const outstanding = scheduleOutstanding(schedule);
    if (outstanding.total <= 0) {
      updatedSchedules.push(schedule);
      continue;
    }

    const penaltyPortion = Math.min(remaining, outstanding.penalty);
    remaining = round2(remaining - penaltyPortion);
    const interestPortion = Math.min(remaining, outstanding.interest);
    remaining = round2(remaining - interestPortion);
    const principalPortion = Math.min(remaining, outstanding.principal);
    remaining = round2(remaining - principalPortion);

    if (penaltyPortion + interestPortion + principalPortion > 0) {
      allocations.push({
        paymentId,
        loanScheduleId: schedule.id,
        penaltyAllocated: penaltyPortion,
        interestAllocated: interestPortion,
        principalAllocated: principalPortion,
      });
    }

    const newPenaltyPaid = round2(schedule.penaltyPaid + penaltyPortion);
    const newInterestPaid = round2(schedule.interestPaid + interestPortion);
    const newPrincipalPaid = round2(schedule.principalPaid + principalPortion);
    const fullyPaid =
      newPenaltyPaid >= schedule.penaltyDue && newInterestPaid >= schedule.interestDue && newPrincipalPaid >= schedule.principalDue;

    updatedSchedules.push({
      ...schedule,
      penaltyPaid: newPenaltyPaid,
      interestPaid: newInterestPaid,
      principalPaid: newPrincipalPaid,
      status: fullyPaid ? "paid" : penaltyPortion + interestPortion + principalPortion > 0 ? "partial" : schedule.status,
    });
  }

  return { updatedSchedules, allocations, unallocatedRemainder: round2(remaining) };
}
