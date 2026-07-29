import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { AccountType, JournalSourceType, ReversalStatus } from "@/types/enums";

/**
 * Ledger — backend §2.7, §5, §8, §15.4.
 *
 * Read-only apart from the reversal workflow, and that is the point: nothing
 * here posts an entry. An entry is a consequence of a business event, and
 * LedgerService is its only writer (§5). Even a reversal does not edit
 * anything — approving one posts a *new* entry with the sides swapped, which
 * is what keeps the ledger auditable.
 *
 * Money arrives as decimal strings and is parsed once here, as everywhere else.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Chart of accounts
// ---------------------------------------------------------------------------

interface ChartOfAccountWire {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  typeLabel: string;
  parentAccountId: string | null;
  isSystem: boolean;
  branchId: string | null;
  status: string;
  deletedAt: string | null;
  balance?: string;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  typeLabel: string;
  parentAccountId: string | null;
  isSystem: boolean;
  branchId: string | null;
  status: string;
  deletedAt: string | null;
  /** The API's cached balance, already netted on the account's normal side. */
  balance: number;
}

function toAccount(wire: ChartOfAccountWire): LedgerAccount {
  return {
    id: wire.id,
    code: wire.code,
    name: wire.name,
    type: wire.type,
    typeLabel: wire.typeLabel,
    parentAccountId: wire.parentAccountId,
    isSystem: wire.isSystem,
    branchId: wire.branchId,
    status: wire.status,
    deletedAt: wire.deletedAt,
    balance: num(wire.balance),
  };
}

export async function getLedgerAccounts(): Promise<LedgerAccount[]> {
  const wire = await apiData<ChartOfAccountWire[]>("/api/v1/ledger/accounts", { token: await token() });
  return wire.map(toAccount);
}

/**
 * The three shapes an account can take, read off the data model rather than a
 * code prefix: the fixed §5 accounts are flagged `isSystem`; a branch's till is
 * dynamic and carries a `branchId`; a bank account is dynamic with none.
 *
 * Treasury needs this split and there is no treasury endpoint to ask instead.
 */
export function classifyAccount(account: LedgerAccount): "system" | "branch_cash" | "bank" {
  if (account.isSystem) return "system";
  return account.branchId === null ? "bank" : "branch_cash";
}

// ---------------------------------------------------------------------------
// Trial balance
// ---------------------------------------------------------------------------

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  branchId: string | null;
  debitTotal: number;
  creditTotal: number;
  balance: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  /** Exact equality, not a tolerance — integer minor units leave no rounding noise. */
  balanced: boolean;
}

export async function getTrialBalance(options: { branchId?: string; to?: string } = {}): Promise<TrialBalanceResult> {
  const response = await apiRequest<
    { accountId: string; code: string; name: string; type: AccountType; isSystem: boolean; branchId: string | null; debitTotal: string; creditTotal: string; balance: string }[]
  >("/api/v1/ledger/trial-balance", {
    token: await token(),
    query: { branch_id: toId(options.branchId) ?? undefined, to: options.to },
  });

  const meta = response.meta as { totalDebits?: string; totalCredits?: string; balanced?: boolean } | undefined;

  return {
    rows: response.data.map((r) => ({
      accountId: r.accountId,
      code: r.code,
      name: r.name,
      type: r.type,
      isSystem: r.isSystem,
      branchId: r.branchId,
      debitTotal: num(r.debitTotal),
      creditTotal: num(r.creditTotal),
      balance: num(r.balance),
    })),
    totalDebits: num(meta?.totalDebits),
    totalCredits: num(meta?.totalCredits),
    balanced: meta?.balanced === true,
  };
}

// ---------------------------------------------------------------------------
// Journal entries
// ---------------------------------------------------------------------------

interface JournalEntryLineWire {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  branchId: string | null;
  customerId: string | null;
  loanId: string | null;
  staffProfileId: string | null;
  accountCode?: string | null;
  accountName?: string | null;
}

interface JournalEntryWire {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId: string | null;
  isReversal: boolean;
  reversedEntryId: string | null;
  createdBy: string;
  postedAt: string;
  lines?: JournalEntryLineWire[];
  totalDebits?: string;
  totalCredits?: string;
  balanced?: boolean;
}

export interface LedgerLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  branchId: string | null;
  customerId: string | null;
  loanId: string | null;
  staffProfileId: string | null;
  accountCode: string | null;
  accountName: string | null;
}

export interface LedgerEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  sourceType: JournalSourceType;
  sourceId: string | null;
  isReversal: boolean;
  reversedEntryId: string | null;
  createdBy: string;
  postedAt: string;
  lines: LedgerLine[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

function toLine(wire: JournalEntryLineWire): LedgerLine {
  return {
    id: wire.id,
    journalEntryId: wire.journalEntryId,
    accountId: wire.accountId,
    debitAmount: num(wire.debitAmount),
    creditAmount: num(wire.creditAmount),
    branchId: wire.branchId,
    customerId: wire.customerId,
    loanId: wire.loanId,
    staffProfileId: wire.staffProfileId,
    accountCode: wire.accountCode ?? null,
    accountName: wire.accountName ?? null,
  };
}

function toEntry(wire: JournalEntryWire): LedgerEntry {
  return {
    id: wire.id,
    entryNumber: wire.entryNumber,
    entryDate: wire.entryDate,
    description: wire.description,
    sourceType: wire.sourceType,
    sourceId: wire.sourceId,
    isReversal: wire.isReversal,
    reversedEntryId: wire.reversedEntryId,
    createdBy: wire.createdBy,
    postedAt: wire.postedAt,
    lines: (wire.lines ?? []).map(toLine),
    totalDebits: num(wire.totalDebits),
    totalCredits: num(wire.totalCredits),
    balanced: wire.balanced === true,
  };
}

export interface EntryFilters {
  sourceType?: string;
  loanId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export async function getJournalEntries(
  filters: EntryFilters = {}
): Promise<{ entries: LedgerEntry[]; pagination?: ApiPagination }> {
  const response = await apiRequest<JournalEntryWire[]>("/api/v1/ledger/entries", {
    token: await token(),
    query: {
      source_type: filters.sourceType,
      loan_id: toId(filters.loanId) ?? undefined,
      from: filters.from,
      to: filters.to,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { entries: response.data.map(toEntry), pagination: response.meta?.pagination };
}

/**
 * Every entry the ledger holds, page by page.
 *
 * The entries screen searches and paginates in the browser, and the overview's
 * counters are over the whole book; there is no aggregate endpoint. PAGE_LIMIT
 * is a backstop that logs rather than silently truncating — a ledger listing
 * that quietly stops short is the one place a missing row matters most.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 200;

export async function getAllJournalEntries(filters: EntryFilters = {}): Promise<LedgerEntry[]> {
  const all: LedgerEntry[] = [];
  let page = 1;

  for (;;) {
    const { entries, pagination } = await getJournalEntries({ ...filters, page, perPage: PER_PAGE });
    all.push(...entries);

    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage) break;

    if (page >= PAGE_LIMIT) {
      console.warn(
        `getAllJournalEntries stopped at ${PAGE_LIMIT} pages (${all.length} of ${pagination?.total ?? "?"} entries).`
      );
      break;
    }

    page += 1;
  }

  return all;
}

export async function getJournalEntry(id: string): Promise<LedgerEntry> {
  const wire = await apiData<JournalEntryWire>(`/api/v1/ledger/entries/${id}`, { token: await token() });
  return toEntry(wire);
}

// ---------------------------------------------------------------------------
// General ledger — one account's postings, with a running balance
// ---------------------------------------------------------------------------

export interface AccountLedgerRow {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  /** Accumulated on the account's normal side, so it reads the way an accountant expects. */
  runningBalance: number;
  isReversal: boolean;
}

export interface AccountLedgerResult {
  rows: AccountLedgerRow[];
  account: LedgerAccount | null;
}

export async function getAccountLedger(
  accountId: string,
  options: { branchId?: string } = {}
): Promise<AccountLedgerResult> {
  const response = await apiRequest<
    { id: string; entryId: string; entryNumber: string; entryDate: string; description: string; debit: string; credit: string; runningBalance: string; isReversal: boolean }[]
  >(`/api/v1/ledger/accounts/${accountId}/entries`, {
    token: await token(),
    query: { branch_id: toId(options.branchId) ?? undefined },
  });

  const meta = response.meta as { account?: ChartOfAccountWire } | undefined;

  return {
    rows: response.data.map((r) => ({
      id: r.id,
      entryId: r.entryId,
      entryNumber: r.entryNumber,
      entryDate: r.entryDate,
      description: r.description,
      debit: num(r.debit),
      credit: num(r.credit),
      runningBalance: num(r.runningBalance),
      isReversal: r.isReversal,
    })),
    account: meta?.account ? toAccount(meta.account) : null,
  };
}

// ---------------------------------------------------------------------------
// Sub-ledgers
// ---------------------------------------------------------------------------

/**
 * Customer / Loan / Staff / Branch "ledgers" are not separate tables — they are
 * journal_entry_lines filtered by the matching dimension id, which is the
 * backend's own modelling choice (§2.7).
 */
export type SubLedgerDimensionSlug = "customers" | "loans" | "staff" | "branches";

export interface SubLedgerResult {
  lines: LedgerLine[];
  totalDebits: number;
  totalCredits: number;
  net: number;
}

export async function getSubLedger(dimension: SubLedgerDimensionSlug, id: string): Promise<SubLedgerResult> {
  const response = await apiRequest<JournalEntryLineWire[]>(`/api/v1/ledger/${dimension}/${id}`, {
    token: await token(),
  });

  const meta = response.meta as { totalDebits?: string; totalCredits?: string; net?: string } | undefined;

  return {
    lines: response.data.map(toLine),
    totalDebits: num(meta?.totalDebits),
    totalCredits: num(meta?.totalCredits),
    net: num(meta?.net),
  };
}

// ---------------------------------------------------------------------------
// Reversals
// ---------------------------------------------------------------------------

interface ReversalWire {
  id: string;
  journalEntryId: string;
  requestedBy: string;
  reason: string;
  approvedBy: string | null;
  status: ReversalStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  reversalEntryId: string | null;
  entryNumber?: string | null;
  reversalEntryNumber?: string | null;
}

export interface LedgerReversal {
  id: string;
  journalEntryId: string;
  requestedBy: string;
  reason: string;
  approvedBy: string | null;
  status: ReversalStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  reversalEntryId: string | null;
  entryNumber: string | null;
  reversalEntryNumber: string | null;
}

function toReversal(wire: ReversalWire): LedgerReversal {
  return {
    id: wire.id,
    journalEntryId: wire.journalEntryId,
    requestedBy: wire.requestedBy,
    reason: wire.reason,
    approvedBy: wire.approvedBy,
    status: wire.status,
    decidedAt: wire.decidedAt,
    decisionNote: wire.decisionNote,
    reversalEntryId: wire.reversalEntryId,
    entryNumber: wire.entryNumber ?? null,
    reversalEntryNumber: wire.reversalEntryNumber ?? null,
  };
}

export async function getReversals(status?: ReversalStatus): Promise<LedgerReversal[]> {
  const wire = await apiData<ReversalWire[]>("/api/v1/ledger/reversals", {
    token: await token(),
    query: { status },
  });
  return wire.map(toReversal);
}

export async function requestReversalRequest(entryId: string, reason: string): Promise<LedgerReversal> {
  const wire = await apiData<ReversalWire>(`/api/v1/ledger/entries/${entryId}/reverse`, {
    method: "POST",
    token: await token(),
    body: { reason },
  });
  return toReversal(wire);
}

export async function approveReversalRequest(reversalId: string): Promise<LedgerReversal> {
  const wire = await apiData<ReversalWire>(`/api/v1/ledger/reversals/${reversalId}/approve`, {
    method: "POST",
    token: await token(),
  });
  return toReversal(wire);
}

export async function rejectReversalRequest(reversalId: string, note: string): Promise<LedgerReversal> {
  const wire = await apiData<ReversalWire>(`/api/v1/ledger/reversals/${reversalId}/reject`, {
    method: "POST",
    token: await token(),
    body: { note },
  });
  return toReversal(wire);
}
