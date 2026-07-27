/**
 * Proves every report is a faithful projection of the operational data:
 * financial reports must agree with the trial balance, and reports that
 * summarise the same underlying facts must agree with each other.
 *
 * Run: npx tsx scripts/verify-reports.ts
 */
import { REPORTS, findReport } from "@/lib/domain/reports/registry";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_LOANS } from "@/lib/mock-data/loans";
import { MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { OPEN_BOOK_STATUSES } from "@/lib/domain/loan-status-machine";
import { branchTaggedBalancesByType } from "@/lib/domain/reports/sources";
import { scheduleOutstanding } from "@/types/loan";
import { round2, formatMoney } from "@/lib/domain/money";
import type { ReportRow } from "@/lib/domain/reports/types";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
const num = (row: ReportRow | undefined, key: string): number => {
  const v = row?.[key];
  return typeof v === "number" ? v : 0;
};

console.log("=== Every §15.6 report is registered and computes ===");
const EXPECTED = [
  "portfolio", "repayment", "arrears", "recovery", "cashflow", "branch-pnl",
  "branch-efficiency", "hq-cashflow", "payroll", "commission", "zone-commission",
  "financial-statements", "audit-trail", "suspense", "reversals",
  "daily-collection", "daily-disbursement", "branch-ranking", "segmentation",
  "age-analysis", "repayment-behavior",
];
check(`all ${EXPECTED.length} spec'd reports present`, EXPECTED.every((s) => findReport(s)), `registered: ${REPORTS.length}`);
for (const slug of EXPECTED) {
  if (!findReport(slug)) console.log(`     missing: ${slug}`);
}

console.log("\n=== Financial reports tie to the trial balance ===");
const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
check("ledger itself balances", trial.balanced, `${formatMoney(trial.totalDebits)} = ${formatMoney(trial.totalCredits)}`);

const fin = findReport("financial-statements")!.compute({});
check(
  "financial-statements debits == trial balance debits",
  num(fin.totals, "debits") === trial.totalDebits,
  `${formatMoney(num(fin.totals, "debits"))} vs ${formatMoney(trial.totalDebits)}`
);
check(
  "financial-statements credits == trial balance credits",
  num(fin.totals, "credits") === trial.totalCredits,
  `${formatMoney(num(fin.totals, "credits"))} vs ${formatMoney(trial.totalCredits)}`
);

// Month-end close entries are HQ-level and carry no branch_id, so branch P&L
// reflects period activity while the system-wide trial balance reflects the
// post-close position. The meaningful invariant is that the per-branch figures
// exactly reconstitute the branch-tagged subset of the ledger.
const taggedIncome = branchTaggedBalancesByType("income");
const taggedExpense = branchTaggedBalancesByType("expense");
const pnl = findReport("branch-pnl")!.compute({});
const branchIncomeSum = round2(pnl.rows.reduce((s, r) => s + num(r, "income"), 0));
const branchExpenseSum = round2(pnl.rows.reduce((s, r) => s + num(r, "expense"), 0));
check(
  "branch-pnl income == branch-tagged ledger income",
  Math.abs(branchIncomeSum - taggedIncome) < 0.01,
  `${formatMoney(branchIncomeSum)} vs ${formatMoney(taggedIncome)}`
);
check(
  "branch-pnl expense == branch-tagged ledger expense",
  Math.abs(branchExpenseSum - taggedExpense) < 0.01,
  `${formatMoney(branchExpenseSum)} vs ${formatMoney(taggedExpense)}`
);

console.log("\n=== Portfolio reports agree with the Loans module ===");
const moduleOutstanding = round2(
  MOCK_LOANS.filter((l) => l.deletedAt === null && OPEN_BOOK_STATUSES.includes(l.status) && l.disbursementDate !== null).reduce(
    (sum, loan) => sum + MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loan.id).reduce((x, s) => x + scheduleOutstanding(s).total, 0),
    0
  )
);
const portfolio = findReport("portfolio")!.compute({});
check(
  "portfolio outstanding == Loans module outstanding",
  Math.abs(num(portfolio.totals, "outstanding") - moduleOutstanding) < 0.01,
  `${formatMoney(num(portfolio.totals, "outstanding"))} vs ${formatMoney(moduleOutstanding)}`
);

const age = findReport("age-analysis")!.compute({});
check(
  "age-analysis buckets sum to portfolio outstanding",
  Math.abs(num(age.totals, "outstanding") - num(portfolio.totals, "outstanding")) < 0.01,
  `${formatMoney(num(age.totals, "outstanding"))} vs ${formatMoney(num(portfolio.totals, "outstanding"))}`
);

const seg = findReport("segmentation")!.compute({});
check(
  "segmentation outstanding sums to portfolio outstanding",
  Math.abs(num(seg.totals, "outstanding") - num(portfolio.totals, "outstanding")) < 0.01,
  `${formatMoney(num(seg.totals, "outstanding"))} vs ${formatMoney(num(portfolio.totals, "outstanding"))}`
);

console.log("\n=== Collection reports agree with each other ===");
const repay = findReport("repayment")!.compute({});
const daily = findReport("daily-collection")!.compute({});
check(
  "daily-collection total == repayment total",
  Math.abs(num(daily.totals, "amount") - num(repay.totals, "amount")) < 0.01,
  `${formatMoney(num(daily.totals, "amount"))} vs ${formatMoney(num(repay.totals, "amount"))}`
);
const alloc = round2(num(repay.totals, "penalty") + num(repay.totals, "interest") + num(repay.totals, "principal"));
check(
  "allocated split <= amount received (remainder goes to Suspense)",
  alloc <= num(repay.totals, "amount") + 0.01,
  `${formatMoney(alloc)} <= ${formatMoney(num(repay.totals, "amount"))}`
);

const disb = findReport("daily-disbursement")!.compute({});
const disbursedPrincipal = round2(
  MOCK_LOANS.filter((l) => l.deletedAt === null && l.disbursementDate !== null).reduce((s, l) => s + l.principalAmount, 0)
);
check(
  "daily-disbursement total == principal of all disbursed loans",
  Math.abs(num(disb.totals, "amount") - disbursedPrincipal) < 0.01,
  `${formatMoney(num(disb.totals, "amount"))} vs ${formatMoney(disbursedPrincipal)}`
);

console.log("\n=== Branch scoping is honoured ===");
for (const branch of MOCK_BRANCHES.filter((b) => b.deletedAt === null).slice(0, 3)) {
  const scoped = findReport("portfolio")!.compute({ branchId: branch.id });
  const offBranch = scoped.rows.filter((r) => r.branch !== branch.name);
  check(`portfolio scoped to ${branch.name} contains only that branch`, offBranch.length === 0, `${scoped.rows.length} rows`);
}
const scopedSum = round2(
  MOCK_BRANCHES.filter((b) => b.deletedAt === null).reduce(
    (s, b) => s + num(findReport("portfolio")!.compute({ branchId: b.id }).totals, "outstanding"),
    0
  )
);
check(
  "sum of per-branch portfolios == system-wide portfolio",
  Math.abs(scopedSum - num(portfolio.totals, "outstanding")) < 0.01,
  `${formatMoney(scopedSum)} vs ${formatMoney(num(portfolio.totals, "outstanding"))}`
);

console.log("\n=== §11 commission rule is visible in reporting ===");
const comm = findReport("commission")!.compute({});
const blocked = comm.rows.filter((r) => String(r.status).startsWith("Blocked"));
check("at least one pool is blocked by an unoffset loss", blocked.length > 0, `${blocked.length} blocked`);
check("blocked pools pay nothing", blocked.every((r) => num(r, "pool") === 0 && num(r, "recipients") === 0));

console.log("\n=== Envelope contract (§15.6) ===");
const envelope = REPORTS.length > 0 ? { slug: REPORTS[0].slug } : null;
check("every report exposes columns and rows", REPORTS.every((r) => {
  const res = r.compute({});
  return Array.isArray(res.columns) && Array.isArray(res.rows);
}), envelope ? `checked ${REPORTS.length}` : "");

console.log(failures === 0 ? "\n✅ ALL REPORT CHECKS PASSED" : `\n❌ ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
