import type { JournalEntry, JournalEntryLine } from "@/types/ledger";
import type { CapitalContribution } from "@/types/treasury";
import type { Expense } from "@/types/expense";
import type { JournalSourceType } from "@/types/enums";
import { assertBalanced, type LedgerLineDraft } from "@/lib/domain/ledger";
import { journalEntryNumber } from "@/lib/domain/id-generators";
import { round2 } from "@/lib/domain/money";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { SYSTEM_ACCOUNTS, BANK_CHART_ACCOUNT_IDS, EXPENSE_CHART_ACCOUNT_IDS, tellerCashAccountId } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_PAYMENTS, MOCK_PAYMENT_ALLOCATIONS } from "@/lib/mock-data/payments";

const account = (name: string) => SYSTEM_ACCOUNTS.find((a) => a.name === name)!.id;
const CAPITAL = account("Capital Account");
const PRINCIPAL = account("Principal Account");
const LOAN_RECEIVABLE = account("Loan Receivable Account");
const INTEREST_INCOME = account("Interest Income Account");
const PENALTY_INCOME = account("Penalty Income Account");
const RESERVE = account("Reserve Account");
const PROFIT = account("Profit Account");

const RESERVE_RATE = 0.1; // 10% of every interest collection — backend §5.

let entrySeq = 0;
export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [];
export const MOCK_JOURNAL_ENTRY_LINES: JournalEntryLine[] = [];

/**
 * The single posting gateway every seed file uses — mirrors the backend's
 * `LedgerService::post()` being the only write path to these two tables
 * (backend §5/§8). Other mock-data files (payroll, commission, staff loans)
 * import and call this to keep one growing, always-balanced ledger.
 */
export function postEntry(params: {
  date: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId: string | null;
  createdBy: string;
  lines: LedgerLineDraft[];
}): string {
  assertBalanced(params.lines, params.description);
  entrySeq++;
  const id = `je-${entrySeq}`;
  MOCK_JOURNAL_ENTRIES.push({
    id,
    entryNumber: journalEntryNumber(entrySeq),
    entryDate: params.date.slice(0, 10),
    description: params.description,
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    isReversal: false,
    reversedEntryId: null,
    createdBy: params.createdBy,
    postedAt: params.date,
  });
  params.lines.forEach((line, i) => {
    MOCK_JOURNAL_ENTRY_LINES.push({
      id: `jel-${entrySeq}-${i + 1}`,
      journalEntryId: id,
      accountId: line.accountId,
      debitAmount: round2(line.debit ?? 0),
      creditAmount: round2(line.credit ?? 0),
      branchId: line.branchId ?? null,
      customerId: line.customerId ?? null,
      loanId: line.loanId ?? null,
      staffProfileId: line.staffProfileId ?? null,
    });
  });
  return id;
}

// 1. Capital injection — the company's starting capital, deposited to NMB.
const capitalEntryId = postEntry({
  date: dateOnlyDaysAgo(400),
  description: "Founding capital contribution",
  sourceType: "capital_injection",
  sourceId: null,
  createdBy: "u-finance",
  lines: [
    { accountId: BANK_CHART_ACCOUNT_IDS.NMB, debit: 80_000_000 },
    { accountId: CAPITAL, credit: 80_000_000 },
  ],
});

export const MOCK_CAPITAL_CONTRIBUTIONS: CapitalContribution[] = [
  {
    id: "cap-1",
    contributorName: "Founding Shareholders",
    amount: 80_000_000,
    bankAccountId: "bank-nmb",
    journalEntryId: capitalEntryId,
    contributedAt: dateOnlyDaysAgo(400).slice(0, 10),
  },
];

// 2. One disbursement entry per loan that actually reached disbursement.
for (const loan of MOCK_LOANS) {
  if (!loan.disbursementDate) continue;
  postEntry({
    date: loan.disbursementDate,
    description: `Disbursement — ${loan.loanNumber}`,
    sourceType: "loan_disbursement",
    sourceId: loan.id,
    createdBy: "u-finance",
    lines: [
      { accountId: LOAN_RECEIVABLE, debit: loan.principalAmount, branchId: loan.branchId, customerId: loan.customerId, loanId: loan.id },
      { accountId: PRINCIPAL, credit: loan.principalAmount, branchId: loan.branchId, loanId: loan.id },
    ],
  });
}

// 3. One entry per confirmed repayment, including the real-time Reserve cut.
for (const payment of MOCK_PAYMENTS) {
  if (payment.status !== "confirmed" || !payment.loanId) continue;
  const loan = MOCK_LOANS.find((l) => l.id === payment.loanId)!;
  const allocations = MOCK_PAYMENT_ALLOCATIONS.filter((a) => a.paymentId === payment.id);
  const penalty = round2(allocations.reduce((sum, a) => sum + a.penaltyAllocated, 0));
  const interest = round2(allocations.reduce((sum, a) => sum + a.interestAllocated, 0));
  const principal = round2(allocations.reduce((sum, a) => sum + a.principalAllocated, 0));
  const reserveCut = round2(interest * RESERVE_RATE);

  const lines: LedgerLineDraft[] = [
    { accountId: tellerCashAccountId(loan.branchId), debit: payment.amount, branchId: loan.branchId, customerId: loan.customerId, loanId: loan.id },
  ];
  if (penalty > 0) lines.push({ accountId: PENALTY_INCOME, credit: penalty, branchId: loan.branchId, loanId: loan.id });
  if (interest > 0) lines.push({ accountId: INTEREST_INCOME, credit: interest, branchId: loan.branchId, loanId: loan.id });
  if (principal > 0) lines.push({ accountId: LOAN_RECEIVABLE, credit: principal, branchId: loan.branchId, loanId: loan.id });
  if (reserveCut > 0) {
    lines.push({ accountId: INTEREST_INCOME, debit: reserveCut, branchId: loan.branchId, loanId: loan.id });
    lines.push({ accountId: RESERVE, credit: reserveCut, branchId: loan.branchId, loanId: loan.id });
  }

  postEntry({
    date: payment.receivedAt,
    description: `Repayment — ${loan.loanNumber} (${payment.paymentReference})`,
    sourceType: "repayment",
    sourceId: payment.id,
    createdBy: "u-finance",
    lines,
  });
}

// 4. A handful of operating expenses across branches + HQ.
const EXPENSE_SEED: { categoryAccountId: string; branchId: string | null; amount: number; description: string; daysAgo: number }[] = [
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.RENT, branchId: "br-kakonko", amount: 450_000, description: "July branch rent — Kakonko", daysAgo: 15 },
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.RENT, branchId: "br-missenyi", amount: 500_000, description: "July branch rent — Missenyi", daysAgo: 15 },
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.ELECTRICITY, branchId: "br-kakonko", amount: 120_000, description: "July electricity — Kakonko", daysAgo: 10 },
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.TRANSPORT, branchId: "br-lindi", amount: 80_000, description: "Field visit transport — Lindi", daysAgo: 8 },
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.AIRTIME, branchId: null, amount: 60_000, description: "HQ staff airtime allowance", daysAgo: 5 },
  { categoryAccountId: EXPENSE_CHART_ACCOUNT_IDS.OFFICE_SUPPLIES, branchId: null, amount: 200_000, description: "HQ office supplies", daysAgo: 20 },
];

const EXPENSE_CATEGORY_BY_ACCOUNT: Record<string, string> = {
  [EXPENSE_CHART_ACCOUNT_IDS.RENT]: "exp-cat-rent",
  [EXPENSE_CHART_ACCOUNT_IDS.ELECTRICITY]: "exp-cat-electricity",
  [EXPENSE_CHART_ACCOUNT_IDS.TRANSPORT]: "exp-cat-transport",
  [EXPENSE_CHART_ACCOUNT_IDS.AIRTIME]: "exp-cat-airtime",
  [EXPENSE_CHART_ACCOUNT_IDS.OFFICE_SUPPLIES]: "exp-cat-office-supplies",
};

export const MOCK_EXPENSES: Expense[] = EXPENSE_SEED.map((expense, i) => {
  const cashAccount = expense.branchId ? tellerCashAccountId(expense.branchId) : BANK_CHART_ACCOUNT_IDS.NMB;
  const journalEntryId = postEntry({
    date: dateOnlyDaysAgo(expense.daysAgo),
    description: expense.description,
    sourceType: "expense",
    sourceId: null,
    createdBy: "u-finance",
    lines: [
      { accountId: expense.categoryAccountId, debit: expense.amount, branchId: expense.branchId },
      { accountId: cashAccount, credit: expense.amount, branchId: expense.branchId },
    ],
  });
  return {
    id: `exp-${i + 1}`,
    expenseCategoryId: EXPENSE_CATEGORY_BY_ACCOUNT[expense.categoryAccountId],
    branchId: expense.branchId,
    amount: expense.amount,
    description: expense.description,
    incurredAt: dateOnlyDaysAgo(expense.daysAgo).slice(0, 10),
    journalEntryId,
    createdBy: "u-finance",
  };
});

// 5. Month-end profit sweep for the prior period.
const totalInterest = round2(
  MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.accountId === INTEREST_INCOME).reduce((sum, l) => sum + l.creditAmount - l.debitAmount, 0)
);
const totalPenalty = round2(MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.accountId === PENALTY_INCOME).reduce((sum, l) => sum + l.creditAmount, 0));
const expenseByAccount = new Map<string, number>();
for (const expense of EXPENSE_SEED) {
  expenseByAccount.set(expense.categoryAccountId, round2((expenseByAccount.get(expense.categoryAccountId) ?? 0) + expense.amount));
}
const totalExpense = round2([...expenseByAccount.values()].reduce((sum, v) => sum + v, 0));
const monthEndProfit = round2(totalInterest + totalPenalty - totalExpense);

if (monthEndProfit > 0) {
  postEntry({
    date: dateOnlyDaysAgo(1),
    description: "Month-end profit sweep — 2026-06",
    sourceType: "month_end_profit",
    sourceId: null,
    createdBy: "u-finance",
    lines: [
      { accountId: INTEREST_INCOME, debit: totalInterest },
      { accountId: PENALTY_INCOME, debit: totalPenalty },
      ...[...expenseByAccount.entries()].map(([accountId, amount]) => ({ accountId, credit: amount })),
      { accountId: PROFIT, credit: monthEndProfit },
    ],
  });
}

export { RESERVE_RATE };
