import { formatMoney } from "@/lib/domain/money";
import type { PenaltyType } from "@/types/enums";

/**
 * What is left of the frontend's penalty code.
 *
 * `computePenalty` and its `daysPastDue` helper applied a product's
 * type/rate/grace/cap to an overdue installment — the cron-equivalent of
 * `POST /loans/overdue/process`. That endpoint now does it, inside the same
 * transaction as the schedule rows it penalises and with the run recorded, so a
 * second implementation here could only ever produce a figure the books
 * disagree with.
 *
 * This one function stays because it is presentation, not calculation.
 */

/**
 * `penaltyRate`'s unit depends on `penaltyType` (backend §2.3) — a flat_fee
 * rate is an amount in TZS, the percentage types are percentages. Rendering it
 * always as "%" would show a TZS 10,000 flat fee as "10000%".
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
