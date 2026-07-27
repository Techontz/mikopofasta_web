import { round2 } from "@/lib/domain/money";
import { scheduleOutstanding } from "@/types/loan";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_LOAN_SCHEDULES, MOCK_PAYMENTS } from "@/lib/mock-data/payments";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { OPEN_BOOK_STATUSES } from "@/lib/domain/loan-status-machine";
import { dpdBucket } from "@/types/report";
import type { DpdBucket } from "@/types/enums";
import type { ReportFilters } from "@/lib/domain/reports/types";
import type { Loan, LoanSchedule } from "@/types/loan";
import type { Payment } from "@/types/repayment";

/**
 * Single accessor layer every report goes through. Keeping the filtering in
 * one place is what guarantees two reports over the same data can't disagree
 * because one of them forgot a `deletedAt` check.
 */

export function branchName(branchId: string | null | undefined): string {
  if (!branchId) return "—";
  return MOCK_BRANCHES.find((b) => b.id === branchId)?.name ?? branchId;
}

export function liveLoans(filters: ReportFilters): Loan[] {
  return MOCK_LOANS.filter((l) => l.deletedAt === null && (!filters.branchId || l.branchId === filters.branchId));
}

/** Loans with money actually out — the only ones that carry a balance. */
export function openBookLoans(filters: ReportFilters): Loan[] {
  return liveLoans(filters).filter((l) => OPEN_BOOK_STATUSES.includes(l.status) && l.disbursementDate !== null);
}

export function schedulesFor(loanId: string): LoanSchedule[] {
  return MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loanId);
}

/**
 * Outstanding is zero until the disbursement callback confirms — the same
 * rule the Loans module applies, so portfolio totals match the screen.
 */
export function loanOutstanding(loan: Loan): number {
  if (!loan.disbursementDate) return 0;
  return round2(schedulesFor(loan.id).reduce((sum, s) => sum + scheduleOutstanding(s).total, 0));
}

export function loanPaid(loan: Loan): number {
  return round2(schedulesFor(loan.id).reduce((sum, s) => sum + s.principalPaid + s.interestPaid + s.penaltyPaid, 0));
}

export function loanDue(loan: Loan): number {
  return round2(schedulesFor(loan.id).reduce((sum, s) => sum + s.principalDue + s.interestDue + s.penaltyDue, 0));
}

export function withinRange(iso: string, filters: ReportFilters): boolean {
  const date = iso.slice(0, 10);
  if (filters.from && date < filters.from) return false;
  if (filters.to && date > filters.to) return false;
  if (filters.period && !date.startsWith(filters.period)) return false;
  return true;
}

export function payments(filters: ReportFilters): Payment[] {
  return MOCK_PAYMENTS.filter(
    (p) => (!filters.branchId || p.branchId === filters.branchId) && withinRange(p.receivedAt, filters)
  );
}

export function confirmedPayments(filters: ReportFilters): Payment[] {
  return payments(filters).filter((p) => p.status === "confirmed");
}

export function customerOf(customerId: string | null) {
  return customerId ? MOCK_CUSTOMERS.find((c) => c.id === customerId) : undefined;
}

/** Days past due for the oldest still-unpaid installment on a loan. */
export function daysPastDue(loan: Loan, asOf = new Date()): number {
  const overdue = schedulesFor(loan.id)
    .filter((s) => scheduleOutstanding(s).total > 0 && new Date(s.dueDate) < asOf)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  if (overdue.length === 0) return 0;
  return Math.max(0, Math.floor((asOf.getTime() - new Date(overdue[0].dueDate).getTime()) / 86_400_000));
}

/**
 * DPD bucketing is defined once, in the domain layer (types/enums.ts +
 * types/report.ts) — 0 / 1–7 / 8–30 / 30+. Reports must not invent their own
 * boundaries, or the same loan lands in different buckets on different
 * screens.
 */
export const DPD_BUCKET_LABELS: Record<DpdBucket, string> = {
  on_time: "On time",
  slight_delay: "1–7 days",
  risk: "8–30 days",
  default: "30+ days",
};

export function bucketFor(dpd: number): DpdBucket {
  return dpdBucket(dpd);
}

/** A/B/C/D scoring (§15.6), aligned to the same bucket boundaries. */
const RATING_BY_BUCKET: Record<DpdBucket, "A" | "B" | "C" | "D"> = {
  on_time: "A",
  slight_delay: "B",
  risk: "C",
  default: "D",
};

export function behaviourRating(dpd: number): "A" | "B" | "C" | "D" {
  return RATING_BY_BUCKET[dpdBucket(dpd)];
}

// ---------------------------------------------------------------------------
// Ledger-derived figures — the financial reports read these, never a copy
// ---------------------------------------------------------------------------

export function trialBalance(filters: ReportFilters) {
  const lines = filters.branchId ? MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.branchId === filters.branchId) : MOCK_JOURNAL_ENTRY_LINES;
  return buildTrialBalance(CHART_OF_ACCOUNTS, lines);
}

export function journalLines(filters: ReportFilters) {
  const entryDate = new Map(MOCK_JOURNAL_ENTRIES.map((e) => [e.id, e.entryDate]));
  return MOCK_JOURNAL_ENTRY_LINES.filter((l) => {
    if (filters.branchId && l.branchId !== filters.branchId) return false;
    const date = entryDate.get(l.journalEntryId);
    return date ? withinRange(date, filters) : false;
  });
}


/**
 * Trial balance over branch-tagged lines only. Month-end close entries carry
 * no branch_id (they are HQ-level), so per-branch P&L reflects the period's
 * activity while the system-wide trial balance reflects the post-close
 * position. Comparing branch figures against this subset compares like with
 * like.
 */
export function branchTaggedTrialBalance() {
  return buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.branchId !== null));
}

export function branchTaggedBalancesByType(type: string): number {
  return round2(
    branchTaggedTrialBalance()
      .rows.filter((r) => r.type === type)
      .reduce((s, r) => s + r.balance, 0)
  );
}

export function balancesByType(filters: ReportFilters, type: string): number {
  return round2(
    trialBalance(filters)
      .rows.filter((r) => r.type === type)
      .reduce((s, r) => s + r.balance, 0)
  );
}
