import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type {
  AccountingPeriod,
  CashDeposit,
  CashDepositInput,
  ClosePeriodInput,
  PeriodBranchResult,
  PeriodPreview,
  Recovery,
  RecoveryInput,
  ReserveUtilisation,
  ReserveUtilisationInput,
  WriteOff,
  WriteOffInput,
} from "@/types/accounting";

/**
 * Month-end close, the Reserve fund, bad debt, and bank reconciliation.
 *
 * Decision Register D1 and §5/§15.3. Reads sit behind `ledger.view`; the writes
 * are split across five grants the API enforces — `accounting.period_close`,
 * `reserve.request`, `reserve.approve`, `loans.write_off` and `loans.recover`.
 * Nothing here re-checks any of that: the server owns authorization, and a
 * client-side gate would only be a second place for it to drift.
 *
 * Money crosses the wire as decimal strings and is coerced to numbers here, at
 * the boundary, exactly as every other module in this app does it.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

function toId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/* -------------------------------------------------------------------------- */
/* Accounting periods                                                          */
/* -------------------------------------------------------------------------- */

interface BranchResultWire {
  branchId: string;
  branchName: string | null;
  incomeTotal: string;
  expenseTotal: string;
  realisedProfit: string;
  reserveAppropriated: string;
}

interface PeriodWire {
  id: string;
  period: string;
  status: AccountingPeriod["status"];
  incomeTotal: string;
  expenseTotal: string;
  realisedProfit: string;
  reservePercentage: string;
  reserveAppropriated: string;
  profitJournalEntryId: string | null;
  reserveJournalEntryId: string | null;
  closedAt: string | null;
  closedByName?: string | null;
  notes: string | null;
  branchResults?: BranchResultWire[];
}

function toBranchResult(wire: BranchResultWire): PeriodBranchResult {
  return {
    branchId: wire.branchId,
    branchName: wire.branchName,
    incomeTotal: num(wire.incomeTotal),
    expenseTotal: num(wire.expenseTotal),
    realisedProfit: num(wire.realisedProfit),
    reserveAppropriated: num(wire.reserveAppropriated),
  };
}

function toPeriod(wire: PeriodWire): AccountingPeriod {
  return {
    id: wire.id,
    period: wire.period,
    status: wire.status,
    incomeTotal: num(wire.incomeTotal),
    expenseTotal: num(wire.expenseTotal),
    realisedProfit: num(wire.realisedProfit),
    reservePercentage: num(wire.reservePercentage),
    reserveAppropriated: num(wire.reserveAppropriated),
    profitJournalEntryId: wire.profitJournalEntryId,
    reserveJournalEntryId: wire.reserveJournalEntryId,
    closedAt: wire.closedAt,
    closedByName: wire.closedByName ?? null,
    notes: wire.notes,
    branchResults: (wire.branchResults ?? []).map(toBranchResult),
  };
}

export async function getAccountingPeriods(): Promise<AccountingPeriod[]> {
  const wire = await apiData<PeriodWire[]>("/api/v1/accounting/periods", { token: await token() });
  return wire.map(toPeriod);
}

/**
 * What closing `period` would recognise, without recognising it.
 *
 * Reads through the same calculator the close uses, so the preview cannot
 * disagree with the result.
 */
export async function getPeriodPreview(period: string): Promise<PeriodPreview> {
  const wire = await apiData<{
    period: string;
    alreadyClosed: boolean;
    incomeTotal: string;
    expenseTotal: string;
    realisedProfit: string;
    branches: { branchId: string | null; incomeTotal: string; expenseTotal: string; realisedProfit: string }[];
  }>(`/api/v1/accounting/periods/${period}/preview`, { token: await token() });

  return {
    period: wire.period,
    alreadyClosed: wire.alreadyClosed,
    incomeTotal: num(wire.incomeTotal),
    expenseTotal: num(wire.expenseTotal),
    realisedProfit: num(wire.realisedProfit),
    branches: wire.branches.map((b) => ({
      branchId: b.branchId,
      incomeTotal: num(b.incomeTotal),
      expenseTotal: num(b.expenseTotal),
      realisedProfit: num(b.realisedProfit),
    })),
  };
}

/**
 * POST /accounting/periods/close.
 *
 * Idempotency-protected: running it twice would recognise a month's profit
 * twice and appropriate its reserve twice. The key is derived from the period,
 * because a second close of the SAME period is exactly what must not happen.
 */
export async function closePeriodRequest(input: ClosePeriodInput): Promise<AccountingPeriod> {
  return toPeriod(
    await apiData<PeriodWire>("/api/v1/accounting/periods/close", {
      method: "POST",
      token: await token(),
      idempotencyKey: `close-period:${input.period}`,
      body: { period: input.period, notes: input.notes ?? null },
    })
  );
}

/* -------------------------------------------------------------------------- */
/* Reserve utilisation                                                         */
/* -------------------------------------------------------------------------- */

interface ReserveWire {
  id: string;
  reference: string;
  purpose: ReserveUtilisation["purpose"];
  purposeLabel: string;
  amount: string;
  narrative: string;
  status: ReserveUtilisation["status"];
  decisionReason: string | null;
  createdAt: string | null;
  approvedAt: string | null;
  journalEntryId: string | null;
  requestedBy: string;
  targetBranchName?: string | null;
  requesterName?: string | null;
  approverName?: string | null;
}

function toReserve(wire: ReserveWire): ReserveUtilisation {
  return {
    id: wire.id,
    reference: wire.reference,
    purpose: wire.purpose,
    purposeLabel: wire.purposeLabel,
    amount: num(wire.amount),
    narrative: wire.narrative,
    status: wire.status,
    decisionReason: wire.decisionReason,
    createdAt: wire.createdAt,
    approvedAt: wire.approvedAt,
    journalEntryId: wire.journalEntryId,
    requestedBy: wire.requestedBy,
    targetBranchName: wire.targetBranchName ?? null,
    requesterName: wire.requesterName ?? null,
    approverName: wire.approverName ?? null,
  };
}

export interface ReserveQueueResult {
  requests: ReserveUtilisation[];
  /** What the fund holds — an approver needs it before releasing from it. */
  reserveBalance: number;
}

export async function getReserveUtilisations(status?: string): Promise<ReserveQueueResult> {
  const response = await apiRequest<ReserveWire[]>("/api/v1/reserve/utilisations", {
    token: await token(),
    query: status ? { status } : undefined,
  });

  const meta = response.meta as { reserveBalance?: string } | undefined;

  return {
    requests: response.data.map(toReserve),
    reserveBalance: num(meta?.reserveBalance),
  };
}

export async function requestReserveUtilisation(
  input: ReserveUtilisationInput
): Promise<ReserveUtilisation> {
  return toReserve(
    await apiData<ReserveWire>("/api/v1/reserve/utilisations", {
      method: "POST",
      token: await token(),
      body: {
        purpose: input.purpose,
        amount: input.amount.toFixed(2),
        narrative: input.narrative,
        target_branch_id: input.targetBranchId ? toId(input.targetBranchId) : null,
      },
    })
  );
}

/**
 * Approving is where the reserve is released — `Dr Reserve · Cr Capital`.
 *
 * Idempotency-keyed on the request id: a retried approval must not release the
 * money twice.
 */
export async function approveReserveUtilisation(id: string): Promise<ReserveUtilisation> {
  return toReserve(
    await apiData<ReserveWire>(`/api/v1/reserve/utilisations/${id}/approve`, {
      method: "POST",
      token: await token(),
      idempotencyKey: `reserve-approve:${id}`,
    })
  );
}

export async function rejectReserveUtilisation(id: string, reason: string): Promise<ReserveUtilisation> {
  return toReserve(
    await apiData<ReserveWire>(`/api/v1/reserve/utilisations/${id}/reject`, {
      method: "POST",
      token: await token(),
      body: { reason },
    })
  );
}

/* -------------------------------------------------------------------------- */
/* Write-off and recovery                                                      */
/* -------------------------------------------------------------------------- */

interface WriteOffWire {
  id: string;
  loanId: string;
  loanNumber?: string | null;
  principalWrittenOff: string;
  interestForgone: string;
  penaltyForgone: string;
  recoveredToDate: string;
  outstanding: string;
  reason: string;
  journalEntryId: string | null;
  approvedByName?: string | null;
  createdAt: string | null;
}

interface RecoveryWire {
  id: string;
  loanId: string;
  loanNumber?: string | null;
  writeOffId: string;
  amount: string;
  narrative: string | null;
  journalEntryId: string | null;
  recordedByName?: string | null;
  createdAt: string | null;
}

function toWriteOff(wire: WriteOffWire): WriteOff {
  return {
    id: wire.id,
    loanId: wire.loanId,
    loanNumber: wire.loanNumber ?? null,
    principalWrittenOff: num(wire.principalWrittenOff),
    interestForgone: num(wire.interestForgone),
    penaltyForgone: num(wire.penaltyForgone),
    recoveredToDate: num(wire.recoveredToDate),
    outstanding: num(wire.outstanding),
    reason: wire.reason,
    journalEntryId: wire.journalEntryId,
    approvedByName: wire.approvedByName ?? null,
    createdAt: wire.createdAt,
  };
}

function toRecovery(wire: RecoveryWire): Recovery {
  return {
    id: wire.id,
    loanId: wire.loanId,
    loanNumber: wire.loanNumber ?? null,
    writeOffId: wire.writeOffId,
    amount: num(wire.amount),
    narrative: wire.narrative,
    journalEntryId: wire.journalEntryId,
    recordedByName: wire.recordedByName ?? null,
    createdAt: wire.createdAt,
  };
}

export interface WriteOffRegister {
  writeOffs: WriteOff[];
  principalWrittenOff: number;
  recovered: number;
  outstanding: number;
}

export async function getWriteOffs(branchId?: string): Promise<WriteOffRegister> {
  const response = await apiRequest<WriteOffWire[]>("/api/v1/write-offs", {
    token: await token(),
    query: branchId ? { branch_id: branchId } : undefined,
  });

  const meta = response.meta as
    | { principalWrittenOff?: string; recovered?: string; outstanding?: string }
    | undefined;

  return {
    writeOffs: response.data.map(toWriteOff),
    principalWrittenOff: num(meta?.principalWrittenOff),
    recovered: num(meta?.recovered),
    outstanding: num(meta?.outstanding),
  };
}

/**
 * POST /loans/{loan}/write-off.
 *
 * Idempotency-keyed on the loan: a retried write-off would double the expense
 * and clear an already-cleared receivable.
 */
export async function writeOffLoanRequest(loanId: string, input: WriteOffInput): Promise<WriteOff> {
  return toWriteOff(
    await apiData<WriteOffWire>(`/api/v1/loans/${loanId}/write-off`, {
      method: "POST",
      token: await token(),
      idempotencyKey: `write-off:${loanId}`,
      body: { reason: input.reason },
    })
  );
}

/**
 * POST /loans/{loan}/recovery.
 *
 * A written-off loan may be recovered in instalments, so the key carries the
 * caller's token — a genuine second instalment of the same amount is still a
 * second recovery.
 */
export async function recordRecoveryRequest(
  loanId: string,
  input: RecoveryInput,
  idempotencyToken: string
): Promise<Recovery> {
  return toRecovery(
    await apiData<RecoveryWire>(`/api/v1/loans/${loanId}/recovery`, {
      method: "POST",
      token: await token(),
      idempotencyKey: `recovery:${loanId}:${idempotencyToken}`,
      body: {
        amount: input.amount.toFixed(2),
        bank_account_id: input.bankAccountId ? toId(input.bankAccountId) : null,
        narrative: input.narrative ?? null,
      },
    })
  );
}

export async function getLoanRecoveries(loanId: string): Promise<Recovery[]> {
  const wire = await apiData<RecoveryWire[]>(`/api/v1/loans/${loanId}/recoveries`, {
    token: await token(),
  });
  return wire.map(toRecovery);
}

/* -------------------------------------------------------------------------- */
/* Cash deposits — bank reconciliation                                         */
/* -------------------------------------------------------------------------- */

interface CashDepositWire {
  id: string;
  branchId: string;
  branchName?: string | null;
  bankAccountId: string;
  bankAccountName?: string | null;
  tellerName?: string | null;
  amount: string;
  status: CashDeposit["status"];
  paymentIds: string[];
  hasSlip: boolean;
  reconciledAt: string | null;
  journalEntryId: string | null;
  createdAt: string | null;
}

function toDeposit(wire: CashDepositWire): CashDeposit {
  return {
    id: wire.id,
    branchId: wire.branchId,
    branchName: wire.branchName ?? null,
    bankAccountId: wire.bankAccountId,
    bankAccountName: wire.bankAccountName ?? null,
    tellerName: wire.tellerName ?? null,
    amount: num(wire.amount),
    status: wire.status,
    paymentIds: wire.paymentIds ?? [],
    hasSlip: wire.hasSlip,
    reconciledAt: wire.reconciledAt,
    journalEntryId: wire.journalEntryId,
    createdAt: wire.createdAt,
  };
}

export interface CashDepositQueue {
  deposits: CashDeposit[];
  total: number;
  pendingTotal: number;
  pendingCount: number;
}

export async function getCashDeposits(
  filters: { status?: string; branchId?: string } = {}
): Promise<CashDepositQueue> {
  const query: Record<string, string> = {};
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branch_id = filters.branchId;

  const response = await apiRequest<CashDepositWire[]>("/api/v1/cash-deposits", {
    token: await token(),
    query: Object.keys(query).length > 0 ? query : undefined,
  });

  const meta = response.meta as
    | { total?: string; pendingTotal?: string; pendingCount?: number }
    | undefined;

  return {
    deposits: response.data.map(toDeposit),
    total: num(meta?.total),
    pendingTotal: num(meta?.pendingTotal),
    pendingCount: meta?.pendingCount ?? 0,
  };
}

/** One cash payment a teller has taken but not yet banked. */
export interface UnbankedPayment {
  id: string;
  paymentReference: string;
  customerName: string | null;
  loanNumber: string | null;
  amount: number;
  receivedAt: string | null;
}

interface UnbankedWire {
  id: string;
  paymentReference?: string;
  customerName?: string | null;
  loanNumber?: string | null;
  amount: string;
  receivedAt?: string | null;
}

/**
 * The cash payments a teller has taken but not yet banked.
 *
 * What the deposit form offers. Without it a teller would be typing payment ids
 * from memory, which is how mismatches start — and the reconciliation refuses a
 * mismatch outright.
 */
export async function getUnbankedPayments(
  branchId?: string
): Promise<{ payments: UnbankedPayment[]; total: number }> {
  const response = await apiRequest<UnbankedWire[]>("/api/v1/cash-deposits/unbanked", {
    token: await token(),
    query: branchId ? { branch_id: branchId } : undefined,
  });

  const meta = response.meta as { total?: string } | undefined;

  return {
    payments: response.data.map((wire) => ({
      id: wire.id,
      paymentReference: wire.paymentReference ?? "—",
      customerName: wire.customerName ?? null,
      loanNumber: wire.loanNumber ?? null,
      amount: num(wire.amount),
      receivedAt: wire.receivedAt ?? null,
    })),
    total: num(meta?.total),
  };
}

export async function recordCashDepositRequest(input: CashDepositInput): Promise<CashDeposit> {
  return toDeposit(
    await apiData<CashDepositWire>("/api/v1/cash-deposits", {
      method: "POST",
      token: await token(),
      body: {
        branch_id: toId(input.branchId),
        bank_account_id: toId(input.bankAccountId),
        amount: input.amount.toFixed(2),
        payment_ids: input.paymentIds.map(toId).filter((id): id is number => id !== null),
      },
    })
  );
}

/**
 * Finance's confirmation — `Dr Bank · Cr Teller Cash`, and every named payment
 * moves to `confirmed`.
 *
 * Idempotency-keyed on the deposit: a second confirmation would move money out
 * of a till that no longer holds it.
 */
export async function reconcileCashDepositRequest(depositId: string): Promise<CashDeposit> {
  return toDeposit(
    await apiData<CashDepositWire>(`/api/v1/cash-deposits/${depositId}/reconcile`, {
      method: "POST",
      token: await token(),
      idempotencyKey: `reconcile-deposit:${depositId}`,
    })
  );
}
