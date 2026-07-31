import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApprovalStatus, HqTransaction } from "@/types/operations";

/**
 * Headquarters Transaction — sidebar → Headquarters Transaction.
 *
 * The seven head-office pots and the movements between them. These sit outside
 * the §5 chart of accounts by design: two of the seven have no counterpart
 * there at all. Reads need `treasury.view`, writes `treasury.manage`, and a
 * decision additionally requires not being the requester — CapitalPolicy
 * decides all three.
 *
 * See the API's docs/modules/headquarters.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// The seven accounts
// ---------------------------------------------------------------------------

interface HqAccountWire {
  id: string;
  name: string;
  balance: string;
}

export interface HqAccount {
  id: string;
  /** Upper case, as the legacy system holds it. Printed verbatim. */
  name: string;
  balance: number;
}

export async function getHqAccounts(): Promise<HqAccount[]> {
  const wire = await apiData<HqAccountWire[]>("/api/v1/hq-accounts", { token: await token() });

  return wire.map((a) => ({ id: a.id, name: a.name, balance: Number(a.balance) }));
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

interface HqTransactionWire {
  id: string;
  reference: string;
  branch: string;
  requestedBy: string;
  approvedBy: string | null;
  amount: string;
  reason: string;
  status: ApprovalStatus;
  date: string;
  direction: HqTransaction["direction"];
  fromAccountId: string | null;
  toAccountId: string | null;
  fromAccount?: string | null;
  toAccount?: string | null;
  branchId: string | null;
  approvedOn: string | null;
}

/** `HqTransaction` plus what a screen needs to act on a row. */
export interface HqTransactionRecord extends HqTransaction {
  fromAccountId: string | null;
  toAccountId: string | null;
  fromAccount: string | null;
  toAccount: string | null;
  branchId: string | null;
  approvedOn: string | null;
}

function toTransaction(wire: HqTransactionWire): HqTransactionRecord {
  return {
    id: wire.id,
    reference: wire.reference,
    branch: wire.branch,
    requestedBy: wire.requestedBy,
    approvedBy: wire.approvedBy,
    // A DECIMAL string on the wire so money never rides on a float between the
    // two systems; the table wants a number.
    amount: Number(wire.amount),
    reason: wire.reason,
    status: wire.status,
    date: wire.date,
    direction: wire.direction,
    fromAccountId: wire.fromAccountId,
    toAccountId: wire.toAccountId,
    fromAccount: wire.fromAccount ?? null,
    toAccount: wire.toAccount ?? null,
    branchId: wire.branchId,
    approvedOn: wire.approvedOn,
  };
}

export interface HqTransactionList {
  transactions: HqTransactionRecord[];
  /**
   * The position, computed server-side the same way `hqBalance()` does.
   *
   * Returned rather than derived here so a filtered list and its own summary
   * cannot drift apart — and because `internal` movements have to be excluded
   * from both totals, which is easy to forget when recomputing.
   */
  income: number;
  expense: number;
  net: number;
  approvedCount: number;
}

export async function getHqTransactions(filters?: {
  status?: ApprovalStatus;
  direction?: HqTransaction["direction"];
  branchId?: string;
  from?: string;
  to?: string;
}): Promise<HqTransactionList> {
  const { data, meta } = await apiRequest<HqTransactionWire[]>("/api/v1/hq-transactions", {
    token: await token(),
    query: {
      status: filters?.status,
      direction: filters?.direction,
      branch_id: filters?.branchId,
      from: filters?.from,
      to: filters?.to,
    },
  });

  return {
    transactions: data.map(toTransaction),
    income: Number(meta?.income ?? 0),
    expense: Number(meta?.expense ?? 0),
    net: Number(meta?.net ?? 0),
    approvedCount: Number(meta?.approvedCount ?? 0),
  };
}

export interface RaiseHqTransactionInput {
  direction: HqTransaction["direction"];
  amount: number;
  /** Required for `out` and `internal`; must be absent for `in`. */
  fromAccountId?: string;
  /** Required for `in` and `internal`; must be absent for `out`. */
  toAccountId?: string;
  branchId?: string;
  reason: string;
  requestedOn?: string;
}

export async function raiseHqTransaction(
  input: RaiseHqTransactionInput
): Promise<HqTransactionRecord> {
  return toTransaction(
    await apiData<HqTransactionWire>("/api/v1/hq-transactions", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function decideHqTransaction(
  id: string,
  decision: Exclude<ApprovalStatus, "pending">
): Promise<HqTransactionRecord> {
  return toTransaction(
    await apiData<HqTransactionWire>(`/api/v1/hq-transactions/${id}/decide`, {
      method: "POST",
      token: await token(),
      body: { decision },
    })
  );
}
