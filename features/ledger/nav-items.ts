import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import type { SectionNavItem } from "@/features/ledger/section-nav";

/*
 * The section rails every module's tab bar is built from.
 *
 * This file and section-nav.tsx sit under features/ledger for historical
 * reasons — the Ledger module was the first to need a rail — and they are now
 * shared by every module in the app. The Ledger module itself has been
 * deleted; these two stayed, because taking them with it would have removed
 * the tab bar from Loan, Customer, Group, Bank, HR and the rest.
 */

/*
 * The Bank section rail. It mirrors the sidebar's Bank group, in the same
 * order, so the two never disagree about what the section contains — the rail
 * is for moving between these screens without collapsing the sidebar group.
 */
const TREASURY: { href: string; label: string; permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS] }[] = [
  { href: "/treasury", label: "Overview", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/accounts", label: "Register Account", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/bank-accounts", label: "Account Balance", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/transactions", label: "Bank Transaction", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/transactions/approved", label: "Approved Transaction", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/transfers/branch", label: "Transfer /Branch Acc", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/transfers/salary-advance", label: "Transfer /Salary advance", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/expenses", label: "Register Bank Expenses", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/expenses/requests", label: "Request Expenses", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/payroll", label: "Payroll", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/capital", label: "Capital & Dividends", permission: PERMISSIONS.TREASURY_VIEW },

  /*
   * The four accounting screens — Decision Register D1.
   *
   * Gated on `ledger.view` rather than `treasury.view`, unlike everything above
   * them. These read and act on the books themselves: the close recognises
   * profit, the reserve is appropriated from it, reconciliation posts a
   * transfer, and the write-off register reports an expense. A role that can
   * see bank balances is not automatically a role that should see the close.
   *
   * Reconciliation is the exception among the four, because a teller must reach
   * it to bank the day's cash and a teller holds no ledger grant — so it takes
   * the repayments grant its own workflow uses.
   */
  { href: "/treasury/reconciliation", label: "Bank Reconciliation", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { href: "/treasury/periods", label: "Accounting Periods", permission: PERMISSIONS.LEDGER_VIEW },
  { href: "/treasury/reserve", label: "Reserve Fund", permission: PERMISSIONS.LEDGER_VIEW },
  { href: "/treasury/write-offs", label: "Write-offs & Recovery", permission: PERMISSIONS.LOANS_VIEW },
];

/*
 * The Salary Advance rail, mirroring the sidebar group in the same order.
 * Gated on the same pair the section itself uses, so a role that can open the
 * group can reach every screen in it.
 */
const SALARY_ADVANCE: { href: string; label: string; permission: Permission[] }[] = [
  { href: "/salary-advance/categories", label: "Category", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/salary-advance/requests", label: "Request", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/salary-advance/approved", label: "Approved", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/salary-advance/active", label: "Active", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/salary-advance/repayments", label: "Repayment", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/salary-advance/paid", label: "Paid List", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
];

export function salaryAdvanceNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return SALARY_ADVANCE.filter((i) => hasAnyPermission(user, i.permission)).map(({ href, label }) => ({ href, label }));
}

/*
 * The five operational sections. Each rail mirrors its sidebar group in the
 * same order, so the two can never disagree about what a section contains.
 *
 * Penalty and Loan Fee are loan work; the three expense and transaction
 * sections are money movement, and carry treasury.view like the rest of it.
 */
const LOAN_OPS: Permission[] = [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW];
const TREASURY_OPS: Permission[] = [PERMISSIONS.TREASURY_VIEW];

const PENALTY: SectionNavItem[] = [
  { href: "/penalty/list", label: "Penalty List" },
  { href: "/penalty/paid", label: "Paid Penalty" },
];

const LOAN_FEE: SectionNavItem[] = [{ href: "/loan-fee/deducted-income", label: "Deducted Income" }];

const EXPENSES: SectionNavItem[] = [
  { href: "/expenses/register", label: "Register Branch Expenses" },
  { href: "/expenses/requests", label: "All Expenses Request" },
  { href: "/expenses/approved", label: "All Approved Expenses" },
];

const HQ_EXPENSES: SectionNavItem[] = [
  { href: "/hq/expenses/register", label: "Register Expenses" },
  { href: "/hq/expenses/requests", label: "All Expenses Requested" },
  { href: "/hq/expenses/approved", label: "All Approved Expenses" },
];

const HQ_TRANSACTIONS: SectionNavItem[] = [
  { href: "/hq/transactions/balance", label: "Account Balance" },
  { href: "/hq/transactions/requests", label: "Requested Transactions" },
  { href: "/hq/transactions/approved", label: "Approved Transactions" },
];

/*
 * The Loan module's tabs: a position screen, then the five legacy screens in
 * the sidebar's order. Overview sits on the module root, which is where a
 * reader who clicks "Loan" in the sidebar lands.
 */
const LOAN: SectionNavItem[] = [
  { href: "/loans", label: "Overview" },
  { href: "/loans/new", label: "Loan Application" },
  { href: "/loans/pending", label: "Loan Pending" },
  { href: "/loans/disbursed", label: "Loan Disbursed" },
  { href: "/loans/withdrawal", label: "Loan Withdrawal" },
  { href: "/loans/rejected", label: "Loan Rejected" },
];

/*
 * The Customer module's tabs.
 *
 * Overview is at /customers/overview rather than at the module root, because
 * the root is All Customer and has been since before this module had an
 * overview — moving it would break every link into it, inside the app and out.
 * Same for Group below.
 */
const CUSTOMER: SectionNavItem[] = [
  { href: "/customers/overview", label: "Overview" },
  /*
   * The registration wizard, which now lives at /customers/new.
   *
   * It used to sit at /customers/new/register, one segment deeper, because
   * /customers/new was occupied by a retired design-only rendering of the
   * legacy form. That screen was deleted and this one was never moved up, so
   * two of the three places that link to registration — the sidebar and the
   * dashboard's quick actions — kept pointing at /customers/new and got Next's
   * 404. Not because nothing answered there, which would at least have been
   * obvious, but because /customers/[id] answered: the router read "new" as a
   * customer id, the API found no such customer, and the page called
   * notFound().
   *
   * Moving the wizard here fixes both links and closes the trap for good — a
   * static segment wins over a dynamic one, so /customers/new can never again
   * be read as somebody's id.
   */
  { href: "/customers/new", label: "Register Customer" },
  /*
   * The manager-approval stage of registration. Filed under Customer, not
   * under Loan: it decides whether a CUSTOMER is sound, which is a different
   * question from whether a loan is, and the two are decided by different
   * permissions. Gated on `customers.approve` below.
   */
  { href: "/customers/approvals", label: "Registration Approval" },
  { href: "/customers", label: "All Customer" },
  { href: "/customers/profile", label: "Customer Profile" },
];

/*
 * The Report module's rail, mirroring the sidebar's Report tab in the same
 * order — the same relationship every other module's rail has to its sidebar
 * group. Thirteen entries is more than most, which is what SectionNav's
 * horizontal scroll and edge fade already exist for.
 */
const REPORT: SectionNavItem[] = [
  { href: "/reports/cash-transaction", label: "Cash Transaction" },
  { href: "/reports/branch-wise", label: "Branch Wise Report" },
  { href: "/reports/file", label: "File" },
  { href: "/reports/loan-pending", label: "Loan Pending" },
  { href: "/reports/loan-repayment", label: "Loan Repayment" },
  { href: "/reports/default-loan", label: "Default Loan" },
  { href: "/reports/write-off", label: "Write-off Loan" },
  { href: "/reports/loan-collection", label: "Loan Collection" },
  { href: "/reports/customer-statement", label: "Customer statement" },
  { href: "/reports/today-receivable", label: "Today Receivable" },
  { href: "/reports/today-received", label: "Today Received" },
  { href: "/reports/daily", label: "Daily Report" },
  { href: "/reports/customer-development", label: "Customer Development" },
];

const GROUP: SectionNavItem[] = [
  { href: "/groups/overview", label: "Overview" },
  { href: "/groups", label: "All Groups" },
];

/*
 * The Agent and Insurance rails, mirroring their sidebar groups in the same
 * order. Both modules are inferred rather than transcribed — no legacy screen
 * of either has ever been captured — so these route names are ours.
 */
const AGENT: SectionNavItem[] = [
  { href: "/agent/payment-modes", label: "Payment Mode" },
  { href: "/agent/transactions", label: "Record Transaction" },
  { href: "/agent/deposits", label: "Deposit Transaction" },
];

const INSURANCE: SectionNavItem[] = [
  { href: "/insurance/movements", label: "Deposit & Withdrawal" },
  { href: "/insurance/today", label: "Today Insurance" },
  { href: "/insurance/today-withdrawals", label: "Today Withdrawal Insurance" },
  { href: "/insurance/balance", label: "Insurance Balance" },
];

const gate = (items: SectionNavItem[], permission: Permission[]) =>
  (user: AuthenticatedUser | null | undefined): SectionNavItem[] =>
    !user || !hasAnyPermission(user, permission) ? [] : items;

export const penaltyNavFor = gate(PENALTY, LOAN_OPS);
export const loanFeeNavFor = gate(LOAN_FEE, LOAN_OPS);
export const expensesNavFor = gate(EXPENSES, TREASURY_OPS);
export const hqExpensesNavFor = gate(HQ_EXPENSES, TREASURY_OPS);
export const hqTransactionsNavFor = gate(HQ_TRANSACTIONS, TREASURY_OPS);
export const loanNavFor = gate(LOAN, [PERMISSIONS.LOANS_VIEW]);
/**
 * The Customer rail.
 *
 * Everything on it needs `customers.view`, except Registration Approval, which
 * needs `customers.approve` — a Loan Officer registers customers and does not
 * decide them, so offering them a link to the manager's queue would be an
 * invitation to a 403. The API refuses either way; this keeps the rail honest.
 */
export function customerNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user || !hasPermission(user, PERMISSIONS.CUSTOMERS_VIEW)) return [];

  return CUSTOMER.filter(
    (item) =>
      item.href !== "/customers/approvals" || hasPermission(user, PERMISSIONS.CUSTOMERS_APPROVE)
  );
}
export const groupNavFor = gate(GROUP, [PERMISSIONS.CUSTOMERS_VIEW]);
export const reportNavFor = gate(REPORT, [PERMISSIONS.REPORTS_VIEW]);
export const agentNavFor = gate(AGENT, TREASURY_OPS);
export const insuranceNavFor = gate(INSURANCE, TREASURY_OPS);

export function treasuryNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return TREASURY.filter((i) => hasPermission(user, i.permission)).map(({ href, label }) => ({ href, label }));
}
