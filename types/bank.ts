import { z } from "zod";

/**
 * The Bank module's shapes.
 *
 * These describe the screens the original system presents. Every shape here is
 * now served: accounts, transactions and transfers through lib/api/bank.ts,
 * expenses through features/bank/expense-actions.ts. The placeholder fixture
 * they were originally written against has been deleted.
 *
 * Declaring the types separately from the client is what made that swap a
 * change of one module — the UI was always written against this contract
 * rather than against the fixture.
 *
 * Money is a `number` at this boundary, coerced once wherever it enters.
 */

export const CURRENCIES = ["TZS", "USD", "KES", "UGX"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** What kind of channel an account is. Cash is a payment METHOD, not an
 *  account — it posts to the ledger's existing teller cash accounts, so there
 *  is nothing to register and no case for it here. */
export const ACCOUNT_CHANNEL_TYPES = ["bank", "mno"] as const;
export type AccountChannelType = (typeof ACCOUNT_CHANNEL_TYPES)[number];

/**
 * Which direction(s) an account may be selected for.
 *
 * Two directions rather than four purposes, because Collection and Capital are
 * both money arriving and a bank cannot tell them apart. What the money MEANS
 * is recorded on the transaction, against the chart of accounts.
 */
export const ACCOUNT_USAGES = ["collection", "disbursement", "both"] as const;
export type AccountUsage = (typeof ACCOUNT_USAGES)[number];

export const ACCOUNT_USAGE_HELP: Record<AccountUsage, string> = {
  collection: "Money received by the company",
  disbursement: "Money paid out by the company",
  both: "Account can receive and send money",
};

export const BankAccountRecordSchema = z.object({
  id: z.string(),
  accountType: z.enum(ACCOUNT_CHANNEL_TYPES),
  usage: z.enum(ACCOUNT_USAGES),
  bankName: z.string(),
  /** "NMB Bank — 2011098765400", as the API composes it for a selector. */
  channelLabel: z.string(),
  bankId: z.string().nullable(),
  mobileMoneyProviderId: z.string().nullable(),
  accountName: z.string(),
  accountNumber: z.string(),
  currency: z.enum(CURRENCIES),
  openingBalance: z.number(),
  balance: z.number(),
  status: z.enum(ACCOUNT_STATUSES),
  description: z.string().nullable(),
  /** Movement on the account today, for the Account Balance screen. */
  todayDeposit: z.number(),
  todayWithdrawal: z.number(),
});
export type BankAccountRecord = z.infer<typeof BankAccountRecordSchema>;

/**
 * Mirrors the Register Account form, in the order the screen lists the fields.
 *
 * NO BRANCH. A company's financial channel is not a branch's property — the
 * money sits with the bank in the company's name, and any branch's collections
 * may land in it. Branch remains everywhere it is genuinely organizational.
 *
 * The provider is required, and which one depends on the channel: a superRefine
 * rather than two optional fields, because an account naming no provider cannot
 * be reconciled against anything.
 */
export const BankAccountInputSchema = z
  .object({
    accountType: z.enum(ACCOUNT_CHANNEL_TYPES),
    usage: z.enum(ACCOUNT_USAGES),
    bankId: z.string().nullable(),
    mobileMoneyProviderId: z.string().nullable(),
    accountName: z.string().trim().min(2, "Enter the account name."),
    accountNumber: z
      .string()
      .trim()
      .min(6, "An account number is at least 6 characters.")
      .regex(/^[0-9 +-]+$/, "Digits, spaces and dashes only."),
    currency: z.enum(CURRENCIES),
    openingBalance: z.number().nonnegative("An opening balance cannot be negative."),
    status: z.enum(ACCOUNT_STATUSES),
    description: z.string().trim().max(500, "Keep the description under 500 characters."),
  })
  .superRefine((value, ctx) => {
    if (value.accountType === "bank" && !value.bankId) {
      ctx.addIssue({
        code: "custom",
        path: ["bankId"],
        message: "Choose the bank this account is held with.",
      });
    }

    if (value.accountType === "mno" && !value.mobileMoneyProviderId) {
      ctx.addIssue({
        code: "custom",
        path: ["mobileMoneyProviderId"],
        message: "Choose the mobile money provider.",
      });
    }
  });
export type BankAccountInput = z.infer<typeof BankAccountInputSchema>;

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export const TRANSACTION_TYPES = ["deposit", "withdrawal", "transfer", "charge"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["pending", "approved", "rejected"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const BankTransactionSchema = z.object({
  id: z.string(),
  reference: z.string(),
  date: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  accountNumber: z.string(),
  branch: z.string(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number(),
  requestedBy: z.string(),
  status: z.enum(TRANSACTION_STATUSES),
  /** Set once a decision is taken; drives the Approved Transaction screen. */
  decidedBy: z.string().nullable(),
  decidedAt: z.string().nullable(),
  note: z.string().nullable(),
});
export type BankTransaction = z.infer<typeof BankTransactionSchema>;

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export const TRANSFER_KINDS = ["branch", "salary_advance"] as const;
export type TransferKind = (typeof TRANSFER_KINDS)[number];

export const TRANSFER_STATUSES = ["pending", "completed", "cancelled"] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const BankTransferSchema = z.object({
  id: z.string(),
  reference: z.string(),
  kind: z.enum(TRANSFER_KINDS),
  fromAccount: z.string(),
  toAccount: z.string(),
  amount: z.number(),
  chargeFee: z.number(),
  reason: z.string(),
  description: z.string().nullable(),
  date: z.string(),
  status: z.enum(TRANSFER_STATUSES),
  requestedBy: z.string(),
});
export type BankTransfer = z.infer<typeof BankTransferSchema>;

export const TransferInputSchema = z
  .object({
    fromAccount: z.string().min(1, "Choose the account to transfer from."),
    toAccount: z.string().min(1, "Choose the destination."),
    amount: z.number().positive("Enter an amount greater than zero."),
    reason: z.string().min(1, "Choose a reason."),
    reference: z.string().trim().max(40, "Keep the reference under 40 characters."),
    description: z.string().trim().max(500, "Keep the description under 500 characters."),
  })
  /*
   * A transfer to the account it came from would post two lines that cancel and
   * still charge a fee. The old screen let it through; this refuses it at the
   * field the user would have to change.
   */
  .refine((v) => v.fromAccount !== v.toAccount, {
    message: "The destination must differ from the source account.",
    path: ["toAccount"],
  });
export type TransferInput = z.infer<typeof TransferInputSchema>;

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const BankExpenseSchema = z.object({
  id: z.string(),
  category: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  amount: z.number(),
  description: z.string().nullable(),
  receiptName: z.string().nullable(),
  date: z.string(),
  recordedBy: z.string(),
});
export type BankExpense = z.infer<typeof BankExpenseSchema>;

export const BankExpenseInputSchema = z.object({
  category: z.string().min(1, "Choose a category."),
  bankName: z.string().min(1, "Choose a bank."),
  accountId: z.string().min(1, "Choose an account."),
  amount: z.number().positive("Enter an amount greater than zero."),
  description: z.string().trim().max(500, "Keep the description under 500 characters."),
});
export type BankExpenseInput = z.infer<typeof BankExpenseInputSchema>;

export const ExpenseRequestSchema = z.object({
  id: z.string(),
  requestNo: z.string(),
  category: z.string(),
  requestedBy: z.string(),
  branch: z.string(),
  amount: z.number(),
  status: z.enum(EXPENSE_STATUSES),
  requestedDate: z.string(),
  comment: z.string().nullable(),
});
export type ExpenseRequest = z.infer<typeof ExpenseRequestSchema>;

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

export const PAYROLL_STATUSES = ["paid", "pending"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const PayrollAllowanceSchema = z.object({ label: z.string(), amount: z.number() });
export const PayrollDeductionSchema = z.object({ label: z.string(), amount: z.number() });

export const PayrollPaymentSchema = z.object({
  id: z.string(),
  period: z.string(),
  paidOn: z.string(),
  netSalary: z.number(),
  reference: z.string(),
  status: z.enum(PAYROLL_STATUSES),
});
export type PayrollPayment = z.infer<typeof PayrollPaymentSchema>;

export const PayrollRowSchema = z.object({
  id: z.string(),
  employee: z.string(),
  staffNo: z.string(),
  department: z.string(),
  branch: z.string(),
  period: z.string(),
  phone: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  salary: z.number(),
  allowances: z.array(PayrollAllowanceSchema),
  deductions: z.array(PayrollDeductionSchema),
  status: z.enum(PAYROLL_STATUSES),
  paidOn: z.string().nullable(),
  payments: z.array(PayrollPaymentSchema),
});
export type PayrollRow = z.infer<typeof PayrollRowSchema>;

/** Gross, deductions and net, derived from a row so a total cannot drift. */
export function payrollTotals(row: PayrollRow) {
  const allowancesTotal = row.allowances.reduce((s, a) => s + a.amount, 0);
  const deductionsTotal = row.deductions.reduce((s, d) => s + d.amount, 0);
  const gross = row.salary + allowancesTotal;
  return { allowancesTotal, deductionsTotal, gross, net: gross - deductionsTotal };
}
