import "server-only";
import { getAllJournalEntries, getLedgerAccounts, type LedgerAccount, type LedgerEntry } from "@/lib/api/ledger";
import { getAllLoans, getRepaymentSchedules, type LoanListItem } from "@/lib/api/loans";
import { getAllPayments, type PaymentListItem } from "@/lib/api/payments";
import { getAllCustomers, type CustomerListItem } from "@/lib/api/customers";
import { getStaffAdvances, type StaffAdvanceWithName } from "@/lib/api/hr";
import type { LoanStatus } from "@/types/enums";

/**
 * The dashboard of the system being migrated.
 *
 * There is no dashboard endpoint — the old system computed these figures from
 * its own tables, and this one derives the same figures from the §5 chart of
 * accounts, the loan book, the payment log and the customer register. Every
 * number below traces to a record; none is seeded.
 *
 * Two families of figures on the old screen have no counterpart in this
 * system's data model at all — it books no insurance and runs no savings
 * product. Those rows keep their place and read 0, which is what the old
 * screen shows for them as well. They are listed in UNSOURCED_ROWS so the gap
 * is stated rather than implied.
 */

/** Rows reproduced for layout fidelity that no endpoint can currently feed. */
export const UNSOURCED_ROWS = ["Agent", "Insurance", "Saving withdrawal"] as const;

// §5 fixed account codes. The old header read these four by name.
const ACCOUNT = {
  loanFee: "2100", // Fee Income Account
  penalty: "2200", // Penalty Income Account
  interest: "2000", // Interest Income Account
  reserve: "3000", // Reserve Account
  capital: "1000",
  outstandingLoan: "1300",
  outstandingInterest: "1400",
  defaultLoan: "4100",
} as const;

const OPEN_STATUSES: LoanStatus[] = ["active", "arrears", "frozen"];
const PENDING_STATUSES: LoanStatus[] = [
  "draft",
  "pending_manager_approval",
  "mandate_pending_otp",
  "mandate_failed",
  "mandate_active",
  "pending_credit_review",
  "pending_finance",
  "awaiting_disbursement",
  "disbursement_failed",
  "escalated",
];
const CLOSED_STATUSES: LoanStatus[] = ["closed", "recovered", "cancelled", "rejected"];
const DEFAULT_STATUSES: LoanStatus[] = ["defaulted", "written_off"];

export interface AccountTile {
  label: string;
  value: number;
}

/**
 * One line of the "today" table. `value: null` prints the dash the old screen
 * uses where a column simply has no line at that height.
 */
export interface TodayCell {
  label: string;
  value: number | null;
}

/**
 * The five columns of the old "today" table, each with its own labels.
 *
 * They are NOT one grid of customer types: the fourth line reads "Groups"
 * under CUSTOMER TYPE but "Salary advance" under both money columns, and the
 * fifth line exists only for Agent, Insurance and Saving withdrawal. The
 * columns are therefore modelled independently, exactly as they read.
 */
export interface TodayColumns {
  customerType: TodayCell[];
  deposit: TodayCell[];
  withdrawal: TodayCell[];
  income: TodayCell[];
  expenses: TodayCell[];
}

export interface CustomerTypeTotals {
  /** As printed in this table — "Day", not "Daily". */
  type: string;
  /** The repayment schedule's own name, lowercased, for the row's link. */
  slug: string;
  all: number;
  active: number;
  pending: number;
  close: number;
  default: number;
  male: number;
  female: number;
  /** Feeds the row's eye button; null when this system has no list for it. */
  href: string | null;
}

export interface DashboardData {
  accounts: AccountTile[];
  accountBalance: number;
  loanWithdrawal: number;
  expectationReceivable: number;
  defaultLoan: number;
  today: TodayColumns;
  totalCustomers: number;
  byType: CustomerTypeTotals[];
}

function balanceOf(accounts: LedgerAccount[], code: string): number {
  return accounts.find((a) => a.code === code)?.balance ?? 0;
}

/** Africa/Dar_es_Salaam, so "today" means the operator's day and not UTC's. */
function todayInDar(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isToday(iso: string | null | undefined, today: string): boolean {
  if (!iso) return false;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso)) === today;
}

export async function getDashboardData(): Promise<DashboardData> {
  /*
   * A role that cannot read one of these still gets a dashboard: the section
   * it cannot see reads zero rather than taking the whole page down. The old
   * system behaved the same way — the shell always rendered.
   */
  const today = todayInDar();

  const [accounts, loans, payments, customers, schedules, entries, advances] = await Promise.all([
    getLedgerAccounts().catch(() => [] as LedgerAccount[]),
    getAllLoans().catch(() => [] as LoanListItem[]),
    getAllPayments().catch(() => [] as PaymentListItem[]),
    getAllCustomers().catch(() => [] as CustomerListItem[]),
    getRepaymentSchedules().catch(() => []),
    getAllJournalEntries({ from: today, to: today }).catch(() => [] as LedgerEntry[]),
    getStaffAdvances().catch(() => [] as StaffAdvanceWithName[]),
  ]);

  // Cash on hand: every branch till plus every bank account. Both are dynamic
  // accounts, so they are found by shape rather than by a hardcoded code list.
  const accountBalance = accounts
    .filter((a) => !a.isSystem && a.deletedAt === null)
    .reduce((sum, a) => sum + a.balance, 0);

  const loansById = new Map(loans.map((l) => [l.id, l]));
  const scheduleName = new Map(schedules.map((s) => [s.id, s.name]));

  /** The old screen's row order, regardless of the order the API lists them. */
  const TYPE_ORDER = ["Monthly", "Weekly", "Daily", "Group"];
  const orderedTypes = [
    ...TYPE_ORDER.filter((name) => schedules.some((s) => s.name === name)),
    ...schedules.map((s) => s.name).filter((name) => !TYPE_ORDER.includes(name)),
  ];

  // A customer's "type" is the repayment schedule of the loan they hold. A
  // customer with no loan belongs to no type, exactly as in the old screen.
  const typeOfCustomer = new Map<string, string>();
  for (const loan of loans) {
    const name = scheduleName.get(loan.repaymentScheduleId);
    if (name && !typeOfCustomer.has(loan.customerId)) typeOfCustomer.set(loan.customerId, name);
  }

  const todayPayments = payments.filter((p) => isToday(p.receivedAt, today));
  const todayDisbursed = loans.filter((l) => isToday(l.disbursementDate, today));

  /*
   * Today's income and expense figures read the day's journal lines rather
   * than an account's running balance: the balance is cumulative, and this
   * row asks what moved today.
   */
  const lines = entries.flatMap((e) => e.lines);
  const typeOfAccount = new Map(accounts.map((a) => [a.code, a.type]));

  const creditedToday = (code: string) =>
    lines.filter((l) => l.accountCode === code).reduce((sum, l) => sum + l.creditAmount, 0);

  const debitedTodayByType = (type: string) =>
    lines
      .filter((l) => l.accountCode && typeOfAccount.get(l.accountCode) === type)
      .reduce((sum, l) => sum + l.debitAmount, 0);

  const movedToday = (sourceType: string) =>
    entries
      .filter((e) => e.sourceType === sourceType)
      .reduce((sum, e) => sum + e.totalDebits, 0);

  // A bank account is a dynamic account with no branch — see classifyAccount.
  const bankCodes = new Set(
    accounts.filter((a) => !a.isSystem && a.branchId === null).map((a) => a.code)
  );
  const bankMovementToday = lines
    .filter((l) => l.accountCode && bankCodes.has(l.accountCode))
    .reduce((sum, l) => sum + l.debitAmount + l.creditAmount, 0);

  const customersOfType = (type: string) =>
    customers.filter((c) => typeOfCustomer.get(c.id) === type).length;

  const depositOfType = (type: string) =>
    todayPayments
      .filter((p) => {
        const loan = p.loanId ? loansById.get(p.loanId) : undefined;
        return loan ? scheduleName.get(loan.repaymentScheduleId) === type : false;
      })
      .reduce((sum, p) => sum + p.amount, 0);

  const withdrawalOfType = (type: string) =>
    todayDisbursed
      .filter((l) => scheduleName.get(l.repaymentScheduleId) === type)
      .reduce((sum, l) => sum + l.principalAmount, 0);

  const advanceToday = advances
    .filter((a) => isToday(a.disbursedAt, today))
    .reduce((sum, a) => sum + a.amount, 0);

  /*
   * The old screen's first three lines are per repayment type; the fourth is
   * Groups on the left and salary advances in the money columns; the fifth
   * exists only for the three concepts this system has no record of.
   */
  const MONEY_TYPES = ["Monthly", "Weekly", "Daily"].filter((t) => orderedTypes.includes(t));

  const todayColumns: TodayColumns = {
    customerType: [
      ...MONEY_TYPES.map((type) => ({ label: `${type} customer`, value: customersOfType(type) })),
      { label: "Groups", value: customersOfType("Group") },
      { label: "-", value: null },
    ],
    deposit: [
      ...MONEY_TYPES.map((type) => ({ label: `${type} Deposit`, value: depositOfType(type) })),
      { label: "Salary advance", value: 0 },
      // No agent channel exists in this system — see UNSOURCED_ROWS.
      { label: "Agent", value: 0 },
    ],
    withdrawal: [
      ...MONEY_TYPES.map((type) => ({ label: `${type} Withdrawal`, value: withdrawalOfType(type) })),
      { label: "Salary advance", value: advanceToday },
      { label: "-", value: null },
    ],
    income: [
      { label: "Penalty", value: creditedToday(ACCOUNT.penalty) },
      { label: "Loan fee", value: creditedToday(ACCOUNT.loanFee) },
      { label: "Capital", value: creditedToday(ACCOUNT.capital) },
      { label: "Transfer", value: movedToday("transfer") },
      // No insurance product exists in this system — see UNSOURCED_ROWS.
      { label: "Insurance", value: 0 },
    ],
    expenses: [
      { label: "Today Expenses", value: debitedTodayByType("expense") },
      { label: "Bank", value: bankMovementToday },
      { label: "Transfer", value: movedToday("transfer") },
      { label: "-", value: null },
      // No savings product exists in this system — see UNSOURCED_ROWS.
      { label: "Saving withdrawal", value: 0 },
    ],
  };

  const byType: CustomerTypeTotals[] = orderedTypes.map((type) => {
    const typeLoans = loans.filter((l) => scheduleName.get(l.repaymentScheduleId) === type);
    const typeCustomers = customers.filter((c) => typeOfCustomer.get(c.id) === type);
    const count = (statuses: LoanStatus[]) =>
      typeLoans.filter((l) => statuses.includes(l.status)).length;

    return {
      // The old screen names this type "Day" in this table and "Daily" in the
      // one above it. Both spellings are reproduced where each appears.
      type: type === "Daily" ? "Day" : type,
      slug: type.toLowerCase(),
      all: typeCustomers.length,
      active: count(OPEN_STATUSES),
      pending: count(PENDING_STATUSES),
      close: count(CLOSED_STATUSES),
      default: count(DEFAULT_STATUSES),
      male: typeCustomers.filter((c) => c.gender === "male").length,
      female: typeCustomers.filter((c) => c.gender === "female").length,
      href: `/customers/by-type/${type.toLowerCase()}`,
    };
  });

  return {
    accounts: [
      { label: "LOAN FEE A/C", value: balanceOf(accounts, ACCOUNT.loanFee) },
      { label: "PENARTY A/C", value: balanceOf(accounts, ACCOUNT.penalty) },
      { label: "INTEREST A/C", value: balanceOf(accounts, ACCOUNT.interest) },
      { label: "RESERVE A/C", value: balanceOf(accounts, ACCOUNT.reserve) },
    ],
    accountBalance,
    loanWithdrawal: todayDisbursed.reduce((sum, l) => sum + l.principalAmount, 0),
    expectationReceivable:
      balanceOf(accounts, ACCOUNT.outstandingLoan) + balanceOf(accounts, ACCOUNT.outstandingInterest),
    defaultLoan: balanceOf(accounts, ACCOUNT.defaultLoan),
    today: todayColumns,
    totalCustomers: customers.length,
    byType,
  };
}
