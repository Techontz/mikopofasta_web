import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type {
  AccountStatus,
  BankAccountInput,
  BankAccountRecord,
  BankTransaction,
  BankTransfer,
  TransactionStatus,
  TransactionType,
  TransferKind,
} from "@/types/bank";

/**
 * Bank — sidebar → Bank.
 *
 * Reads need `treasury.view`, writes `treasury.manage`, and approving a
 * transaction additionally requires not being the requester. CapitalPolicy
 * decides all three.
 *
 * Note what is NOT here: Register Bank Expenses and Request Expenses are the
 * Expenses module (lib/api/expenses.ts) — a bank-paid expense is the same
 * record with a bank account named on it — and Payroll is the HR module's.
 * Three of the nine Bank menu entries are served elsewhere on purpose.
 *
 * See the API's docs/modules/bank.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

interface BankAccountWire {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  branchId: string | null;
  currency: BankAccountRecord["currency"];
  openingBalance: string;
  balance: string;
  status: AccountStatus;
  description: string | null;
  todayDeposit: string;
  todayWithdrawal: string;
  chartAccountId: string | null;
  chartAccountCode?: string | null;
}

/** `BankAccountRecord` plus the ledger account behind it. */
export interface BankAccountWithLedger extends BankAccountRecord {
  branchId: string | null;
  chartAccountId: string | null;
  chartAccountCode: string | null;
}

function toAccount(wire: BankAccountWire): BankAccountWithLedger {
  return {
    id: wire.id,
    bankName: wire.bankName,
    accountName: wire.accountName,
    accountNumber: wire.accountNumber,
    branch: wire.branch,
    branchId: wire.branchId,
    currency: wire.currency,
    // DECIMAL strings on the wire so money never rides on a float between the
    // two systems; the tables want numbers.
    openingBalance: Number(wire.openingBalance),
    balance: Number(wire.balance),
    status: wire.status,
    description: wire.description,
    todayDeposit: Number(wire.todayDeposit),
    todayWithdrawal: Number(wire.todayWithdrawal),
    chartAccountId: wire.chartAccountId,
    chartAccountCode: wire.chartAccountCode ?? null,
  };
}

export interface BankAccountList {
  accounts: BankAccountWithLedger[];
  totalBalance: number;
}

export async function getBankAccounts(options?: {
  status?: AccountStatus;
  branchId?: string;
  /**
   * Adds today's movement per account. Opt-in because it costs a grouped
   * query over the day's journal lines, and only Account Balance shows it.
   */
  withMovement?: boolean;
}): Promise<BankAccountList> {
  const { data, meta } = await apiRequest<BankAccountWire[]>("/api/v1/bank-accounts", {
    token: await token(),
    query: {
      status: options?.status,
      branch_id: options?.branchId,
      with_movement: options?.withMovement ? 1 : undefined,
    },
  });

  return { accounts: data.map(toAccount), totalBalance: Number(meta?.totalBalance ?? 0) };
}

export async function registerBankAccount(input: BankAccountInput): Promise<BankAccountWithLedger> {
  return toAccount(
    await apiData<BankAccountWire>("/api/v1/bank-accounts", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function updateBankAccountRequest(
  id: string,
  input: BankAccountInput
): Promise<BankAccountWithLedger> {
  return toAccount(
    await apiData<BankAccountWire>(`/api/v1/bank-accounts/${id}`, {
      method: "PUT",
      token: await token(),
      body: input,
    })
  );
}

export async function closeBankAccountRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/bank-accounts/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

interface BankTransactionWire {
  id: string;
  reference: string;
  date: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  type: TransactionType;
  amount: string;
  requestedBy: string;
  status: TransactionStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  bankAccountId: string;
  branchId: string | null;
  journalEntryId: string | null;
}

export interface BankTransactionRecord extends BankTransaction {
  bankAccountId: string;
  branchId: string | null;
  /** Null until approved — the trail from this row to the ledger. */
  journalEntryId: string | null;
}

function toTransaction(wire: BankTransactionWire): BankTransactionRecord {
  return {
    id: wire.id,
    reference: wire.reference,
    date: wire.date,
    bankName: wire.bankName,
    accountName: wire.accountName,
    accountNumber: wire.accountNumber,
    branch: wire.branch,
    type: wire.type,
    amount: Number(wire.amount),
    requestedBy: wire.requestedBy,
    status: wire.status,
    decidedBy: wire.decidedBy,
    decidedAt: wire.decidedAt,
    note: wire.note,
    bankAccountId: wire.bankAccountId,
    branchId: wire.branchId,
    journalEntryId: wire.journalEntryId,
  };
}

export interface BankTransactionList {
  transactions: BankTransactionRecord[];
  /** What the visible rows add up to. */
  total: number;
  /** What actually moved, as against what was asked for. */
  approvedTotal: number;
}

export async function getBankTransactions(filters?: {
  status?: TransactionStatus;
  type?: TransactionType;
  bankAccountId?: string;
  from?: string;
  to?: string;
}): Promise<BankTransactionList> {
  const { data, meta } = await apiRequest<BankTransactionWire[]>("/api/v1/bank-transactions", {
    token: await token(),
    query: {
      status: filters?.status,
      type: filters?.type,
      bank_account_id: filters?.bankAccountId,
      from: filters?.from,
      to: filters?.to,
    },
  });

  return {
    transactions: data.map(toTransaction),
    total: Number(meta?.total ?? 0),
    approvedTotal: Number(meta?.approvedTotal ?? 0),
  };
}

export interface RaiseBankTransactionInput {
  bankAccountId: string;
  type: TransactionType;
  amount: number;
  /** Required for a deposit or withdrawal: there is no till without it. */
  branchId?: string;
  note?: string | null;
  transactedOn?: string;
}

export async function raiseBankTransaction(
  input: RaiseBankTransactionInput
): Promise<BankTransactionRecord> {
  return toTransaction(
    await apiData<BankTransactionWire>("/api/v1/bank-transactions", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function decideBankTransaction(
  id: string,
  decision: Exclude<TransactionStatus, "pending">,
  note?: string | null
): Promise<BankTransactionRecord> {
  return toTransaction(
    await apiData<BankTransactionWire>(`/api/v1/bank-transactions/${id}/decide`, {
      method: "POST",
      token: await token(),
      body: { decision, note: note ?? null },
    })
  );
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

interface BankTransferWire {
  id: string;
  reference: string;
  kind: TransferKind;
  fromAccount: string;
  toAccount: string;
  amount: string;
  chargeFee: string;
  reason: string;
  description: string | null;
  date: string;
  status: BankTransfer["status"];
  requestedBy: string;
  fromAccountId: string;
  toAccountId: string | null;
  toBranchId: string | null;
  journalEntryId: string | null;
}

export interface BankTransferRecord extends BankTransfer {
  fromAccountId: string;
  toAccountId: string | null;
  toBranchId: string | null;
  journalEntryId: string | null;
}

function toTransfer(wire: BankTransferWire): BankTransferRecord {
  return {
    id: wire.id,
    reference: wire.reference,
    kind: wire.kind,
    fromAccount: wire.fromAccount,
    toAccount: wire.toAccount,
    amount: Number(wire.amount),
    chargeFee: Number(wire.chargeFee),
    reason: wire.reason,
    description: wire.description,
    date: wire.date,
    status: wire.status,
    requestedBy: wire.requestedBy,
    fromAccountId: wire.fromAccountId,
    toAccountId: wire.toAccountId,
    toBranchId: wire.toBranchId,
    journalEntryId: wire.journalEntryId,
  };
}

export interface BankTransferList {
  transfers: BankTransferRecord[];
  total: number;
  /** Kept apart from the amounts so the cost of banking is visible as a cost. */
  chargesTotal: number;
}

export async function getBankTransfers(filters?: {
  kind?: TransferKind;
  status?: BankTransfer["status"];
  from?: string;
  to?: string;
}): Promise<BankTransferList> {
  const { data, meta } = await apiRequest<BankTransferWire[]>("/api/v1/bank-transfers", {
    token: await token(),
    query: { kind: filters?.kind, status: filters?.status, from: filters?.from, to: filters?.to },
  });

  return {
    transfers: data.map(toTransfer),
    total: Number(meta?.total ?? 0),
    chargesTotal: Number(meta?.chargesTotal ?? 0),
  };
}

export interface MakeBankTransferInput {
  kind: TransferKind;
  fromAccountId: string;
  /** Exactly one of these, decided by `kind`. */
  toAccountId?: string;
  toBranchId?: string;
  amount: number;
  chargeFee?: number;
  reason: string;
  reference?: string;
  description?: string;
  transferredOn?: string;
}

export async function makeBankTransfer(input: MakeBankTransferInput): Promise<BankTransferRecord> {
  return toTransfer(
    await apiData<BankTransferWire>("/api/v1/bank-transfers", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}
