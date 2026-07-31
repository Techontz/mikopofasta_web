import { addDays, daysAgo, makeRandom } from "@/lib/mock/random";
import { CUSTOMERS, type Customer } from "@/lib/mock/people";
import {
  APPLICATION_LOAN_TYPES,
  DISBURSED_STATUSES,
  INTEREST_RATES,
  LOAN_PURPOSES,
  PENDING_CUSTOMER_STATUSES,
  PENDING_LOAN_STATUSES,
  REJECTION_REASONS,
  REPAYMENT_FREQUENCIES,
} from "@/lib/mock/reference";

/**
 * The loan book: eighty disbursed, fifty pending, twenty-five rejected.
 *
 * Every loan belongs to a real customer, and carries that customer's branch and
 * phone rather than its own — so the loan screens and the customer screens can
 * never disagree about where somebody banks.
 *
 * The arithmetic is computed, never invented, and this is the part worth being
 * careful about. On the captured legacy screens, Principal + Interest is exactly
 * `principal x (1 + rate)` on every row — simple interest on the original
 * principal, not reducing balance. That is reproduced here, so a reviewer
 * checking a row with a calculator gets the same answer the legacy system would
 * have given. Installment amount then divides the total across the term, with
 * the rounding remainder pushed into the final installment so the schedule adds
 * back to the total exactly.
 */

export type PendingLoan = {
  id: string;
  row: number;
  loanAccount: string;
  customerId: string;
  customer: string;
  phone: string;
  branch: string;
  amount: number;
  duration: string;
  installments: number;
  loanStatus: (typeof PENDING_LOAN_STATUSES)[number];
  customerStatus: (typeof PENDING_CUSTOMER_STATUSES)[number];
  loanType: string;
  purpose: string;
  appliedOn: string;
};

export type DisbursedLoan = {
  id: string;
  row: number;
  loanAccount: string;
  customerId: string;
  customer: string;
  branch: string;
  principal: number;
  interestRate: number;
  interest: number;
  totalPayable: number;
  repaymentType: (typeof REPAYMENT_FREQUENCIES)[number];
  installments: number;
  installmentAmount: number;
  loanFee: number;
  disbursedOn: string;
  completionDate: string;
  status: (typeof DISBURSED_STATUSES)[number];
  paid: number;
};

export type RejectedLoan = {
  id: string;
  row: number;
  loanAccount: string;
  customerId: string;
  customer: string;
  phone: string;
  branch: string;
  amount: number;
  duration: string;
  installments: number;
  loanStatus: string;
  customerStatus: (typeof PENDING_CUSTOMER_STATUSES)[number];
  reason: (typeof REJECTION_REASONS)[number];
  rejectedOn: string;
};

/** A fourteen-digit loan account number, matching the legacy format. */
function loanAccountNumber(seed: number): string {
  let value = "";
  let n = seed * 2_654_435_761;
  for (let i = 0; i < 14; i++) {
    n = (n * 1_103_515_245 + 12_345) & 0x7fffffff;
    value += String((n >>> 8) % 10);
  }
  return value;
}

/** How many days one installment period spans. */
function periodDays(frequency: (typeof REPAYMENT_FREQUENCIES)[number]): number {
  return frequency === "Daily" ? 1 : frequency === "Weekly" ? 7 : frequency === "Biweekly" ? 14 : 30;
}

/**
 * Split a total across N installments so the parts sum back to the whole.
 *
 * Naive division leaves a remainder — 130,000 over 3 is 43,333.33 — and a
 * schedule that does not add up to the loan is the single most common way a
 * repayment screen loses an argument with a customer. The remainder goes on the
 * last installment.
 */
export function installmentSplit(total: number, count: number): { each: number; final: number } {
  const each = Math.floor(total / count / 100) * 100;
  return { each, final: total - each * (count - 1) };
}

/* -------------------------------------------------------------------- pending */

export const PENDING_LOANS: PendingLoan[] = (() => {
  const rng = makeRandom(5_005);

  return Array.from({ length: 50 }, (_, i) => {
    const customer = CUSTOMERS[(i * 7) % CUSTOMERS.length];
    const installments = rng.int(1, 12);

    return {
      id: `pend-${i + 1}`,
      row: i + 1,
      loanAccount: loanAccountNumber(i + 101),
      customerId: customer.id,
      customer: customer.fullName,
      phone: customer.phone,
      branch: customer.branch,
      amount: rng.money(50_000, 5_000_000, 10_000),
      duration: `${installments} Month${installments === 1 ? "" : "s"}`,
      installments,
      loanStatus: rng.pick(PENDING_LOAN_STATUSES),
      customerStatus: rng.pick(PENDING_CUSTOMER_STATUSES),
      loanType: rng.pick(APPLICATION_LOAN_TYPES),
      purpose: rng.pick(LOAN_PURPOSES),
      appliedOn: daysAgo(rng.int(1, 60)),
    };
  });
})();

/* ------------------------------------------------------------------ disbursed */

export const DISBURSED_LOANS: DisbursedLoan[] = (() => {
  const rng = makeRandom(6_006);

  return Array.from({ length: 80 }, (_, i) => {
    const customer = CUSTOMERS[(i * 11) % CUSTOMERS.length];

    const principal = rng.money(50_000, 8_000_000, 10_000);
    const interestRate = rng.pick(INTEREST_RATES);

    // Simple interest on the original principal — the legacy basis.
    const interest = Math.round(principal * (interestRate / 100));
    const totalPayable = principal + interest;

    const repaymentType = rng.pick(REPAYMENT_FREQUENCIES);
    const installments = rng.int(2, 12);
    const { each } = installmentSplit(totalPayable, installments);

    const disbursedOn = daysAgo(rng.int(10, 700));
    const completionDate = addDays(disbursedOn, periodDays(repaymentType) * installments);

    const status = completionDate < daysAgo(0)
      ? rng.chance(0.7)
        ? "Completed"
        : "Overdue"
      : "Running";

    /*
     * Paid-to-date is consistent with the status rather than random: a loan
     * marked Completed that still shows a balance is the kind of contradiction
     * that undermines every figure beside it.
     */
    const paid =
      status === "Completed"
        ? totalPayable
        : status === "Overdue"
          ? Math.round(totalPayable * (0.3 + rng.next() * 0.4))
          : Math.round(totalPayable * (0.1 + rng.next() * 0.6));

    return {
      id: `disb-${i + 1}`,
      row: i + 1,
      loanAccount: loanAccountNumber(i + 1_001),
      customerId: customer.id,
      customer: customer.fullName,
      branch: customer.branch,
      principal,
      interestRate,
      interest,
      totalPayable,
      repaymentType,
      installments,
      installmentAmount: each,
      loanFee: Math.round(principal * 0.05),
      disbursedOn,
      completionDate,
      status: status as DisbursedLoan["status"],
      paid,
    };
  });
})();

/* ------------------------------------------------------------------- rejected */

export const REJECTED_LOANS: RejectedLoan[] = (() => {
  const rng = makeRandom(7_007);

  return Array.from({ length: 25 }, (_, i) => {
    const customer = CUSTOMERS[(i * 13) % CUSTOMERS.length];
    const installments = rng.int(1, 12);

    return {
      id: `rej-${i + 1}`,
      row: i + 1,
      loanAccount: loanAccountNumber(i + 5_001),
      customerId: customer.id,
      customer: customer.fullName,
      phone: customer.phone,
      branch: customer.branch,
      amount: rng.money(50_000, 6_000_000, 10_000),
      duration: `${installments} Month${installments === 1 ? "" : "s"}`,
      installments,
      loanStatus: "Rejected",
      customerStatus: rng.pick(PENDING_CUSTOMER_STATUSES),
      reason: rng.pick(REJECTION_REASONS),
      rejectedOn: daysAgo(rng.int(5, 400)),
    };
  });
})();

/* ---------------------------------------------------------------- withdrawals */

/**
 * Loan Withdrawal is the disbursed book seen from the disbursement side, which
 * is why it is derived rather than generated: the legacy columns are the same
 * loan's principal, interest, total, cadence, fee and dates. Two independent
 * datasets would drift apart and there would be no telling which was right.
 */
export const WITHDRAWALS = DISBURSED_LOANS.map((loan, i) => ({ ...loan, row: i + 1 }));

/** Withdrawals whose cadence matches a legacy filter tab. */
export function withdrawalsFor(tab: "All" | "Monthly" | "Weekly" | "Daily") {
  if (tab === "All") return WITHDRAWALS;
  return WITHDRAWALS.filter((w) => w.repaymentType === tab);
}

/* ------------------------------------------------------------ per-customer */

/** Every loan booked to one customer, across all three states. */
export function loansForCustomer(customerId: string) {
  const disbursed = DISBURSED_LOANS.filter((l) => l.customerId === customerId);
  const pending = PENDING_LOANS.filter((l) => l.customerId === customerId);
  const rejected = REJECTED_LOANS.filter((l) => l.customerId === customerId);

  const active = disbursed.filter((l) => l.status !== "Completed");
  const completed = disbursed.filter((l) => l.status === "Completed");

  return {
    disbursed,
    pending,
    rejected,
    active,
    completed,
    total: disbursed.length + pending.length + rejected.length,
    // What is still owed across the loans that are still running.
    outstanding: active.reduce((sum, l) => sum + Math.max(0, l.totalPayable - l.paid), 0),
  };
}

/**
 * The customer-picker rows on the Loan Application screen.
 *
 * The spec asks the dropdown to show existing loans, credit score and last
 * loan alongside the name, so those are resolved here from the same book the
 * loan lists render — not stored separately.
 */
export function customerPickerRows() {
  return CUSTOMERS.map((customer: Customer) => {
    const { disbursed, active } = loansForCustomer(customer.id);
    const last = [...disbursed].sort((a, b) => b.disbursedOn.localeCompare(a.disbursedOn))[0];

    return {
      id: customer.id,
      customerId: customer.customerId,
      name: customer.fullName,
      branch: customer.branch,
      phone: customer.phone,
      existingLoans: active.length,
      creditScore: customer.creditScore,
      lastLoan: last ? `${last.principal.toLocaleString()} on ${last.disbursedOn}` : "None",
    };
  });
}
