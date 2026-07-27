import { formatMoney, round2 } from "@/lib/domain/money";
import { scheduleOutstanding, type LoanSchedule } from "@/types/loan";
import type { LoanProduct } from "@/types/loan-product";
import type { PenaltyType } from "@/types/enums";

/**
 * penalty_rate's unit depends on penalty_type (backend §2.3) — a flat_fee
 * rate is an amount in TZS, the percentage types are percentages. Rendering
 * it always as "%" would show a TZS 10,000 flat fee as "10000%".
 */
export function formatPenaltyRate(penaltyType: PenaltyType, rate: number): string {
  switch (penaltyType) {
    case "flat_fee":
      return `${formatMoney(rate)} flat`;
    case "percentage_per_day":
      return `${rate}% per day`;
    case "percentage_of_overdue":
    default:
      return `${rate}% of overdue`;
  }
}

export function daysPastDue(schedule: LoanSchedule, asOf: Date): number {
  const due = new Date(schedule.dueDate);
  const diff = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

/**
 * Applies a product's penalty configuration (type/rate/grace/cap) to one
 * overdue installment — the cron-equivalent logic behind
 * `POST /loans/overdue/process` (backend §7).
 */
export function computePenalty(schedule: LoanSchedule, product: LoanProduct, asOf: Date): number {
  const dpd = daysPastDue(schedule, asOf);
  if (dpd <= product.penaltyGraceDays) return 0;

  const outstanding = scheduleOutstanding(schedule);
  let penalty: number;
  switch (product.penaltyType) {
    case "flat_fee":
      penalty = product.penaltyRate;
      break;
    case "percentage_per_day":
      penalty = outstanding.total * (product.penaltyRate / 100) * (dpd - product.penaltyGraceDays);
      break;
    case "percentage_of_overdue":
    default:
      penalty = outstanding.total * (product.penaltyRate / 100);
      break;
  }

  if (product.penaltyCapAmount !== null) penalty = Math.min(penalty, product.penaltyCapAmount);
  return round2(penalty);
}
