import type { CustomerRiskScore } from "@/types/report";
import type { PerformanceRating } from "@/types/enums";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { MOCK_LOANS } from "@/lib/mock-data/loans";

/**
 * Derived from each customer's worst loan status, since the seed's payment
 * simulation pays every installment exactly on its due date (see
 * lib/mock-data/payments.ts) — real delay-day stats would all read zero.
 * This gives the Repayment Behavior report something meaningful to show
 * without fabricating payment timestamps that would contradict the ledger.
 */
const RATING_BY_STATUS: Record<string, { rating: PerformanceRating; avgDelayDays: number; onTimePct: number }> = {
  closed: { rating: "A", avgDelayDays: 0, onTimePct: 100 },
  recovered: { rating: "B", avgDelayDays: 4, onTimePct: 78 },
  active: { rating: "A", avgDelayDays: 0.5, onTimePct: 96 },
  arrears: { rating: "C", avgDelayDays: 12, onTimePct: 55 },
  defaulted: { rating: "D", avgDelayDays: 45, onTimePct: 20 },
  written_off: { rating: "D", avgDelayDays: 60, onTimePct: 10 },
};

const byCustomer = new Map<string, { rating: PerformanceRating; avgDelayDays: number; onTimePct: number }>();
for (const loan of MOCK_LOANS) {
  const scored = RATING_BY_STATUS[loan.status];
  if (!scored) continue;
  const existing = byCustomer.get(loan.customerId);
  // Worst rating wins if a customer has multiple loans.
  if (!existing || scored.rating > existing.rating) byCustomer.set(loan.customerId, scored);
}

export const MOCK_CUSTOMER_RISK_SCORES: CustomerRiskScore[] = [...byCustomer.entries()].map(([customerId, s], i) => ({
  id: `risk-${i + 1}`,
  customerId,
  rating: s.rating,
  avgDelayDays: s.avgDelayDays,
  onTimePct: s.onTimePct,
  latePct: Math.round((100 - s.onTimePct) * 100) / 100,
  computedAt: dateOnlyDaysAgo(1),
}));
