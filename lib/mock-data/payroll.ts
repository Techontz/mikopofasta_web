import type { PayrollRun, PayrollLine, Allowance, Deduction } from "@/types/payroll";
import type { ZoneCommissionDistribution } from "@/types/commission";
import { round2 } from "@/lib/domain/money";
import { dateOnlyDaysAgo } from "@/lib/domain/rng";
import { postEntry } from "@/lib/mock-data/journal-entries";
import {
  SALARY_EXPENSE_ACCOUNT_ID,
  STAFF_PAYABLE_ACCOUNT_ID,
  COMMISSION_EXPENSE_ACCOUNT_ID,
  STAFF_LOAN_RECEIVABLE_ACCOUNT_ID,
  STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID,
  BANK_CHART_ACCOUNT_IDS,
  SYSTEM_ACCOUNTS,
} from "@/lib/mock-data/chart-of-accounts";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_COMMISSION_DISTRIBUTIONS, ZONE_WEST_OVERRIDE_AMOUNT, ZONE_OVERRIDE_PCT, ZONE_WEST_POOL_BASE, COMMISSION_PERIOD } from "@/lib/mock-data/commission";
import { MOCK_STAFF_LOANS } from "@/lib/mock-data/staff-loans";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";

const STAFF_FUND = SYSTEM_ACCOUNTS.find((a) => a.name === "Staff Fund Account")!.id;
const STAFF_FUND_CONTRIBUTION_PCT = 0.1;
const PAY_DATE = dateOnlyDaysAgo(2);

export const MOCK_PAYROLL_RUNS: PayrollRun[] = [
  { id: "payroll-2026-06", period: COMMISSION_PERIOD, status: "finalized", generatedBy: "u-hr", finalizedAt: PAY_DATE },
];

export const MOCK_PAYROLL_LINES: PayrollLine[] = [];
export const MOCK_ALLOWANCES: Allowance[] = [];
export const MOCK_DEDUCTIONS: Deduction[] = [];
export const MOCK_ZONE_COMMISSION_DISTRIBUTIONS: ZoneCommissionDistribution[] = [];

let lineSeq = 0;
let allowanceSeq = 0;
let deductionSeq = 0;

for (const staff of MOCK_STAFF_PROFILES) {
  const user = MOCK_USERS.find((u) => u.id === staff.userId)!;
  const isBranchBased = staff.branchId !== null && !["super_admin", "admin", "finance", "hr", "auditor"].includes(user.role);

  const branchShare = round2(MOCK_COMMISSION_DISTRIBUTIONS.filter((d) => d.staffProfileId === staff.id).reduce((sum, d) => sum + d.shareAmount, 0));
  const zoneOverride = user.role === "zone_manager" ? ZONE_WEST_OVERRIDE_AMOUNT : 0;
  const commissionAmount = round2(branchShare + zoneOverride);

  const allowanceEntries: { type: "transport" | "airtime" | "bonus"; amount: number }[] = isBranchBased
    ? [{ type: "transport", amount: 50_000 }, { type: "airtime", amount: 20_000 }]
    : [{ type: "airtime", amount: 20_000 }];
  const allowancesTotal = round2(allowanceEntries.reduce((sum, a) => sum + a.amount, 0));

  const staffFundContribution = round2(staff.baseSalary * STAFF_FUND_CONTRIBUTION_PCT);
  const staffLoan = MOCK_STAFF_LOANS.find((l) => l.staffProfileId === staff.id && l.status === "active");
  const staffAdvance = MOCK_STAFF_ADVANCES.find((a) => a.staffProfileId === staff.id && a.status === "disbursed");
  const loanRecovery = staffLoan ? 50_000 : 0;
  const advanceRecovery = staffAdvance ? 50_000 : 0;
  const deductionsTotal = round2(staffFundContribution + loanRecovery + advanceRecovery);

  const netSalary = round2(staff.baseSalary + commissionAmount + allowancesTotal - deductionsTotal);

  // Entry 1: recognize salary + commission as expense, owed to the employee.
  const recognitionLines = [
    { accountId: SALARY_EXPENSE_ACCOUNT_ID, debit: round2(staff.baseSalary + allowancesTotal), staffProfileId: staff.id, branchId: staff.branchId },
    ...(commissionAmount > 0 ? [{ accountId: COMMISSION_EXPENSE_ACCOUNT_ID, debit: commissionAmount, staffProfileId: staff.id, branchId: staff.branchId }] : []),
    { accountId: STAFF_PAYABLE_ACCOUNT_ID, credit: round2(staff.baseSalary + allowancesTotal + commissionAmount), staffProfileId: staff.id, branchId: staff.branchId },
  ];
  const recognitionEntryId = postEntry({
    date: PAY_DATE,
    description: `Payroll recognition — ${user.name} (${COMMISSION_PERIOD})`,
    sourceType: "payroll",
    sourceId: null,
    createdBy: "u-hr",
    lines: recognitionLines,
  });

  // Entry 2: automatic deductions reduce what's owed, routed to their sub-ledgers.
  postEntry({
    date: PAY_DATE,
    description: `Payroll deductions — ${user.name} (${COMMISSION_PERIOD})`,
    sourceType: "payroll",
    sourceId: null,
    createdBy: "u-hr",
    lines: [
      { accountId: STAFF_PAYABLE_ACCOUNT_ID, debit: deductionsTotal, staffProfileId: staff.id, branchId: staff.branchId },
      { accountId: STAFF_FUND, credit: staffFundContribution, staffProfileId: staff.id },
      ...(loanRecovery > 0 ? [{ accountId: STAFF_LOAN_RECEIVABLE_ACCOUNT_ID, credit: loanRecovery, staffProfileId: staff.id }] : []),
      ...(advanceRecovery > 0 ? [{ accountId: STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, credit: advanceRecovery, staffProfileId: staff.id }] : []),
    ],
  });

  // Entry 3: actual payment out to the employee's bank.
  postEntry({
    date: PAY_DATE,
    description: `Salary payment — ${user.name} (${COMMISSION_PERIOD})`,
    sourceType: "payroll",
    sourceId: null,
    createdBy: "u-finance",
    lines: [
      { accountId: STAFF_PAYABLE_ACCOUNT_ID, debit: netSalary, staffProfileId: staff.id, branchId: staff.branchId },
      { accountId: BANK_CHART_ACCOUNT_IDS.NMB, credit: netSalary, staffProfileId: staff.id },
    ],
  });

  lineSeq++;
  const lineId = `pline-${lineSeq}`;
  MOCK_PAYROLL_LINES.push({
    id: lineId,
    payrollRunId: "payroll-2026-06",
    staffProfileId: staff.id,
    baseSalary: staff.baseSalary,
    commissionAmount,
    allowancesTotal,
    deductionsTotal,
    netSalary,
    journalEntryId: recognitionEntryId,
  });

  for (const allowance of allowanceEntries) {
    allowanceSeq++;
    MOCK_ALLOWANCES.push({ id: `allow-${allowanceSeq}`, payrollLineId: lineId, type: allowance.type, amount: allowance.amount });
  }

  deductionSeq++;
  MOCK_DEDUCTIONS.push({ id: `ded-${deductionSeq}`, payrollLineId: lineId, type: "staff_fund", amount: staffFundContribution, referenceId: null });
  if (loanRecovery > 0) {
    deductionSeq++;
    MOCK_DEDUCTIONS.push({ id: `ded-${deductionSeq}`, payrollLineId: lineId, type: "loan", amount: loanRecovery, referenceId: staffLoan!.id });
  }
  if (advanceRecovery > 0) {
    deductionSeq++;
    MOCK_DEDUCTIONS.push({ id: `ded-${deductionSeq}`, payrollLineId: lineId, type: "advance", amount: advanceRecovery, referenceId: staffAdvance!.id });
  }

  // Zone override was already expensed above (folded into this line's commissionAmount) —
  // the distribution record reuses this same entry id rather than double-posting.
  if (user.role === "zone_manager" && zoneOverride > 0) {
    MOCK_ZONE_COMMISSION_DISTRIBUTIONS.push({
      id: "zonecomm-1",
      zoneId: staff.zoneId!,
      period: COMMISSION_PERIOD,
      totalPoolBase: ZONE_WEST_POOL_BASE,
      overridePercentage: ZONE_OVERRIDE_PCT * 100,
      overrideAmount: zoneOverride,
      journalEntryId: recognitionEntryId,
    });
  }
}
