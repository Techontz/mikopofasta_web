import { SYSTEM_ACCOUNT_CODES } from "@/types/ledger";
import type { ChartOfAccount } from "@/types/ledger";
import type { AccountType } from "@/types/enums";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";

function systemAccount(id: string, code: string, name: string, type: AccountType): ChartOfAccount {
  return { id, code, name, type, parentAccountId: null, isSystem: true, branchId: null, status: "active", deletedAt: null };
}

/** The 18 fixed system accounts — backend spec §5. */
export const SYSTEM_ACCOUNTS: ChartOfAccount[] = [
  systemAccount("acct-capital", SYSTEM_ACCOUNT_CODES.CAPITAL, "Capital Account", "equity"),
  // Equity-side, not asset: per the business docs it's only ever credited at
  // disbursement (never debited on repayment), i.e. a running measure of
  // capital deployed into the loan book — not a balance-sheet asset itself.
  systemAccount("acct-principal", SYSTEM_ACCOUNT_CODES.PRINCIPAL, "Principal Account", "equity"),
  systemAccount("acct-loan-receivable", SYSTEM_ACCOUNT_CODES.LOAN_RECEIVABLE, "Loan Receivable Account", "asset"),
  systemAccount("acct-outstanding-loan", SYSTEM_ACCOUNT_CODES.OUTSTANDING_LOAN, "Outstanding Loan Account", "asset"),
  systemAccount("acct-outstanding-interest", SYSTEM_ACCOUNT_CODES.OUTSTANDING_INTEREST, "Outstanding Interest Account", "asset"),
  systemAccount("acct-interest-income", SYSTEM_ACCOUNT_CODES.INTEREST_INCOME, "Interest Income Account", "income"),
  systemAccount("acct-fee-income", SYSTEM_ACCOUNT_CODES.FEE_INCOME, "Fee Income Account", "income"),
  systemAccount("acct-penalty-income", SYSTEM_ACCOUNT_CODES.PENALTY_INCOME, "Penalty Income Account", "income"),
  systemAccount("acct-reserve", SYSTEM_ACCOUNT_CODES.RESERVE, "Reserve Account", "control"),
  systemAccount("acct-profit", SYSTEM_ACCOUNT_CODES.PROFIT, "Profit Account", "equity"),
  systemAccount("acct-loan-arrears", SYSTEM_ACCOUNT_CODES.LOAN_ARREARS, "Loan Arrears Account", "control"),
  systemAccount("acct-default-loan", SYSTEM_ACCOUNT_CODES.DEFAULT_LOAN, "Default Loan Account", "asset"),
  systemAccount("acct-write-off", SYSTEM_ACCOUNT_CODES.WRITE_OFF, "Write-Off Account", "expense"),
  systemAccount("acct-recovered-loans", SYSTEM_ACCOUNT_CODES.RECOVERED_LOANS, "Recovered Loans Account", "income"),
  systemAccount("acct-suspense", SYSTEM_ACCOUNT_CODES.SUSPENSE, "Suspense Account", "control"),
  systemAccount("acct-staff-fund", SYSTEM_ACCOUNT_CODES.STAFF_FUND, "Staff Fund Account", "liability"),
  systemAccount("acct-dividend", SYSTEM_ACCOUNT_CODES.DIVIDEND, "Dividend Account", "equity"),
  systemAccount("acct-offset", SYSTEM_ACCOUNT_CODES.OFFSET, "Offset Account", "control"),
];

// Stable ids for the system accounts that runtime mutations (not just seed
// data) post against — imported by the loan/repayment Server Actions so a
// posting path never hardcodes a magic string.
export const LOAN_RECEIVABLE_ACCOUNT_ID = "acct-loan-receivable";
export const PRINCIPAL_ACCOUNT_ID = "acct-principal";
export const INTEREST_INCOME_ACCOUNT_ID = "acct-interest-income";
export const PENALTY_INCOME_ACCOUNT_ID = "acct-penalty-income";
export const RESERVE_ACCOUNT_ID = "acct-reserve";
export const SUSPENSE_ACCOUNT_ID = "acct-suspense";

// Two more system-ish accounts used pervasively by seed data, not part of
// the original 18 but needed for a coherent payroll/commission ledger story.
export const SALARY_EXPENSE_ACCOUNT_ID = "acct-salary-expense";
export const STAFF_PAYABLE_ACCOUNT_ID = "acct-staff-payable";
export const COMMISSION_EXPENSE_ACCOUNT_ID = "acct-commission-expense";
export const STAFF_LOAN_RECEIVABLE_ACCOUNT_ID = "acct-staff-loan-receivable";
export const STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID = "acct-staff-advance-receivable";
SYSTEM_ACCOUNTS.push(
  systemAccount(SALARY_EXPENSE_ACCOUNT_ID, "6000", "Salary Expense", "expense"),
  systemAccount(STAFF_PAYABLE_ACCOUNT_ID, "7050", "Staff Payable", "liability"),
  systemAccount(COMMISSION_EXPENSE_ACCOUNT_ID, "6100", "Commission Expense", "expense"),
  systemAccount(STAFF_LOAN_RECEIVABLE_ACCOUNT_ID, "7010", "Staff Loan Receivable", "asset"),
  systemAccount(STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, "7020", "Staff Advance Receivable", "asset")
);

/** Bank accounts get one 8xxx chart account each — ids referenced by lib/mock-data/bank-accounts.ts. */
export const BANK_CHART_ACCOUNT_IDS = {
  NMB: "acct-bank-nmb",
  CRDB: "acct-bank-crdb",
} as const;

const bankAccounts: ChartOfAccount[] = [
  { id: BANK_CHART_ACCOUNT_IDS.NMB, code: "8000", name: "NMB Bank", type: "asset", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
  { id: BANK_CHART_ACCOUNT_IDS.CRDB, code: "8100", name: "CRDB Bank", type: "asset", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
];

/** One 6xxx account per expense category, for the ledger fixtures below. The real ones are minted by the API (see its docs/modules/expenses.md). */
export const EXPENSE_CHART_ACCOUNT_IDS = {
  RENT: "acct-expense-rent",
  ELECTRICITY: "acct-expense-electricity",
  TRANSPORT: "acct-expense-transport",
  AIRTIME: "acct-expense-airtime",
  OFFICE_SUPPLIES: "acct-expense-office-supplies",
} as const;

const expenseAccounts: ChartOfAccount[] = [
  { id: EXPENSE_CHART_ACCOUNT_IDS.RENT, code: "6200", name: "Rent Expense", type: "expense", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
  { id: EXPENSE_CHART_ACCOUNT_IDS.ELECTRICITY, code: "6300", name: "Electricity Expense", type: "expense", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
  { id: EXPENSE_CHART_ACCOUNT_IDS.TRANSPORT, code: "6400", name: "Transport Expense", type: "expense", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
  { id: EXPENSE_CHART_ACCOUNT_IDS.AIRTIME, code: "6500", name: "Airtime Expense", type: "expense", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
  { id: EXPENSE_CHART_ACCOUNT_IDS.OFFICE_SUPPLIES, code: "6600", name: "Office Supplies Expense", type: "expense", parentAccountId: null, isSystem: false, branchId: null, status: "active", deletedAt: null },
];

/** One branch-scoped Teller Cash account per branch — backend §12. */
export function tellerCashAccountId(branchId: string): string {
  return `acct-teller-cash-${branchId}`;
}

const tellerCashAccounts: ChartOfAccount[] = MOCK_BRANCHES.map((branch, i) => ({
  id: tellerCashAccountId(branch.id),
  code: `8${200 + i * 10}`,
  name: `${branch.name} Teller Cash`,
  type: "asset",
  parentAccountId: null,
  isSystem: false,
  branchId: branch.id,
  status: "active",
  deletedAt: null,
}));

export const CHART_OF_ACCOUNTS: ChartOfAccount[] = [...SYSTEM_ACCOUNTS, ...bankAccounts, ...expenseAccounts, ...tellerCashAccounts];

export function accountTypeOf(accountId: string): AccountType {
  const account = CHART_OF_ACCOUNTS.find((a) => a.id === accountId);
  if (!account) throw new Error(`Unknown chart of account id: ${accountId}`);
  return account.type;
}
