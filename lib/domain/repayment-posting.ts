import { round2 } from "@/lib/domain/money";
import type { LedgerLineDraft } from "@/lib/domain/ledger";
import type { PaymentAllocation } from "@/types/repayment";
import type { PaymentChannel } from "@/types/enums";

/**
 * Reserve cut taken from every interest collection in real time — backend
 * §5 ("Reserve cut: Dr Interest Income · Cr Reserve Account"). Kept here
 * next to the posting builder so the seed and the runtime path can never
 * drift to different rates.
 */
export const RESERVE_RATE = 0.1;

export interface AllocationTotals {
  penalty: number;
  interest: number;
  principal: number;
}

export function sumAllocations(allocations: Pick<PaymentAllocation, "penaltyAllocated" | "interestAllocated" | "principalAllocated">[]): AllocationTotals {
  return {
    penalty: round2(allocations.reduce((s, a) => s + a.penaltyAllocated, 0)),
    interest: round2(allocations.reduce((s, a) => s + a.interestAllocated, 0)),
    principal: round2(allocations.reduce((s, a) => s + a.principalAllocated, 0)),
  };
}

export interface RepaymentPostingParams {
  /** Where the money landed: teller cash for cash, a bank account otherwise. */
  cashAccountId: string;
  penaltyIncomeAccountId: string;
  interestIncomeAccountId: string;
  loanReceivableAccountId: string;
  reserveAccountId: string;
  amount: number;
  totals: AllocationTotals;
  branchId: string | null;
  customerId: string | null;
  loanId: string;
}

/**
 * Builds the journal lines for one allocated repayment — the single shape
 * used by every intake channel (direct/webhook, teller cash, and suspense
 * resolution), mirroring backend §7's "three intake channels, one
 * allocation core". Returns lines only; posting stays behind postEntry().
 */
export function buildRepaymentLines(params: RepaymentPostingParams): LedgerLineDraft[] {
  const { totals, branchId, customerId, loanId } = params;
  const reserveCut = round2(totals.interest * RESERVE_RATE);

  const lines: LedgerLineDraft[] = [
    { accountId: params.cashAccountId, debit: params.amount, branchId, customerId, loanId },
  ];
  if (totals.penalty > 0) lines.push({ accountId: params.penaltyIncomeAccountId, credit: totals.penalty, branchId, loanId });
  if (totals.interest > 0) lines.push({ accountId: params.interestIncomeAccountId, credit: totals.interest, branchId, loanId });
  if (totals.principal > 0) lines.push({ accountId: params.loanReceivableAccountId, credit: totals.principal, branchId, loanId });
  if (reserveCut > 0) {
    lines.push({ accountId: params.interestIncomeAccountId, debit: reserveCut, branchId, loanId });
    lines.push({ accountId: params.reserveAccountId, credit: reserveCut, branchId, loanId });
  }
  return lines;
}

/**
 * Suspense resolution posts a SECOND entry rather than editing the original
 * (backend §5: "on resolution: Dr Suspense · Cr Loan (via a new entry, never
 * editing the original)"). The cash debit already happened when the money
 * arrived, so here Suspense is drawn down instead.
 */
export function buildSuspenseResolutionLines(params: Omit<RepaymentPostingParams, "cashAccountId"> & { suspenseAccountId: string }): LedgerLineDraft[] {
  return buildRepaymentLines({ ...params, cashAccountId: params.suspenseAccountId });
}

/** Cash lands in the branch till; every other channel lands in a bank account. */
export function isCashChannel(channel: PaymentChannel): boolean {
  return channel === "cash";
}
