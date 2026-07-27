import type { CashDeposit, PenaltyRun } from "@/types/repayment";
import { dateOnlyDaysAgo, daysAgo } from "@/lib/domain/rng";
import { MOCK_PAYMENTS } from "@/lib/mock-data/payments";

/**
 * Teller cash-in-hand and bank-confirmed cash are two different trust states
 * (backend §7) — a cash payment stays `pending_verification` until a deposit
 * slip is matched to it here.
 */
const cashPayments = MOCK_PAYMENTS.filter((p) => p.channel === "cash");

export const MOCK_CASH_DEPOSITS: CashDeposit[] = [
  {
    id: "dep-1",
    tellerId: "u-teller",
    branchId: "br-lindi",
    amount: 250_000,
    bankAccountId: "bank-nmb",
    depositSlipPath: "/mock-documents/deposits/dep-1.jpg",
    status: "confirmed",
    matchedPaymentIds: cashPayments.slice(0, 1).map((p) => p.id),
    reconciledBy: "u-finance",
    reconciledAt: daysAgo(6),
  },
  {
    id: "dep-2",
    tellerId: "u-teller",
    branchId: "br-lindi",
    amount: 180_000,
    bankAccountId: "bank-nmb",
    depositSlipPath: null,
    status: "pending",
    matchedPaymentIds: null,
    reconciledBy: null,
    reconciledAt: null,
  },
];

export const MOCK_PENALTY_RUNS: PenaltyRun[] = [
  {
    id: "prun-1",
    runDate: dateOnlyDaysAgo(1),
    loansProcessed: 4,
    totalPenaltyApplied: 68_500,
    triggeredBy: "cron",
    createdAt: daysAgo(1),
  },
];
