import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApprovalStatus, ExpenseClaim, ExpenseName } from "@/types/operations";

/**
 * Expenses — sidebar → Expenses, Headquarters Expenses, and Settings →
 * Expense Categories.
 *
 * Reads require `treasury.view`; the register needs `treasury.manage` or
 * `admin.org_settings`, and a decision needs `treasury.manage` plus not being
 * the requester. ExpensePolicy decides all of it. Nothing here re-checks —
 * the server owns authorization, and duplicating it would only create a second
 * answer that can drift from the first.
 *
 * See the API's docs/modules/expenses.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// The register — expense categories
// ---------------------------------------------------------------------------

/**
 * The backend serves both frontend shapes from one record, because the
 * frontend has two names for the same thing: `ExpenseName` (types/operations.ts)
 * for the two register screens, `ExpenseCategory` (types/expense.ts) for the
 * Settings one. Every field of both is on the wire.
 */
interface ExpenseCategoryWire {
  id: string;
  name: string;
  scope: ExpenseName["scope"];
  chartAccountId: string;
  createdBy: string | null;
  deletedAt: string | null;
  chartAccountCode?: string;
  spentToDate?: string;
}

/** The register, as the two "Register Expenses" screens read it. */
export interface ExpenseRegisterEntry extends ExpenseName {
  /** The 6xxx account this category owns — one per category, never shared. */
  chartAccountId: string;
  chartAccountCode: string | null;
  /** Present only when the caller asked; summing balances is a second query. */
  spentToDate: number | null;
}

function toRegisterEntry(wire: ExpenseCategoryWire): ExpenseRegisterEntry {
  return {
    id: wire.id,
    name: wire.name,
    scope: wire.scope,
    chartAccountId: wire.chartAccountId,
    chartAccountCode: wire.chartAccountCode ?? null,
    spentToDate: wire.spentToDate === undefined ? null : Number(wire.spentToDate),
  };
}

export async function getExpenseCategories(options?: {
  scope?: ExpenseName["scope"];
  withBalances?: boolean;
}): Promise<ExpenseRegisterEntry[]> {
  const wire = await apiData<ExpenseCategoryWire[]>("/api/v1/expense-categories", {
    token: await token(),
    query: {
      scope: options?.scope,
      with_balances: options?.withBalances ? 1 : undefined,
    },
  });

  return wire.map(toRegisterEntry);
}

export async function createExpenseCategoryRequest(
  name: string,
  scope: ExpenseName["scope"]
): Promise<ExpenseRegisterEntry> {
  return toRegisterEntry(
    await apiData<ExpenseCategoryWire>("/api/v1/expense-categories", {
      method: "POST",
      token: await token(),
      body: { name, scope },
    })
  );
}

export async function renameExpenseCategoryRequest(
  id: string,
  name: string
): Promise<ExpenseRegisterEntry> {
  /*
   * No scope. Which register a name belongs to is fixed at creation — moving
   * it would silently re-file every request already under it, changing
   * historical Branch P&L. The backend ignores one if sent; not sending it is
   * how this side says the same thing.
   */
  return toRegisterEntry(
    await apiData<ExpenseCategoryWire>(`/api/v1/expense-categories/${id}`, {
      method: "PUT",
      token: await token(),
      body: { name },
    })
  );
}

export async function deleteExpenseCategoryRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/expense-categories/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// The queues — expense requests
// ---------------------------------------------------------------------------

interface ExpenseRequestWire {
  id: string;
  reference: string;
  scope: ExpenseClaim["scope"];
  branch: string;
  staff: string;
  expense: string;
  amount: string;
  description: string;
  comment: string | null;
  status: ApprovalStatus;
  date: string;
  branchId: string;
  bankAccountId: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  expenseCategoryId: string;
  requestedBy: string;
  decidedBy: string | null;
  decidedByName?: string | null;
  decidedAt: string | null;
  journalEntryId: string | null;
}

/**
 * `ExpenseClaim` plus what the screens need to act on a row rather than draw
 * it. The extra fields are additive, so anything typed as `ExpenseClaim`
 * keeps working unchanged.
 */
export interface ExpenseClaimRecord extends ExpenseClaim {
  reference: string;
  branchId: string;
  /**
   * Set only when the cost was paid from a bank account rather than the branch
   * till — Bank → Register Bank Expenses. Null on an ordinary expense.
   */
  bankAccountId: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  expenseCategoryId: string;
  requestedBy: string;
  decidedByName: string | null;
  decidedAt: string | null;
  /** Null until approved — the trail from this row to the trial balance. */
  journalEntryId: string | null;
}

function toClaim(wire: ExpenseRequestWire): ExpenseClaimRecord {
  return {
    id: wire.id,
    reference: wire.reference,
    scope: wire.scope,
    branch: wire.branch,
    staff: wire.staff,
    expense: wire.expense,
    // The wire carries a DECIMAL string so money never rides on a float
    // between the two systems; the table wants a number.
    amount: Number(wire.amount),
    description: wire.description,
    comment: wire.comment,
    status: wire.status,
    date: wire.date,
    branchId: wire.branchId,
    bankAccountId: wire.bankAccountId,
    bankName: wire.bankName ?? null,
    bankAccountName: wire.bankAccountName ?? null,
    expenseCategoryId: wire.expenseCategoryId,
    requestedBy: wire.requestedBy,
    decidedByName: wire.decidedByName ?? null,
    decidedAt: wire.decidedAt,
    journalEntryId: wire.journalEntryId,
  };
}

export interface ExpenseClaimList {
  claims: ExpenseClaimRecord[];
  /** What the visible rows add up to — the legacy footer. */
  total: number;
  /** What has actually been spent, and the figure that ties to the ledger. */
  approvedTotal: number;
}

export async function getExpenseRequests(filters?: {
  scope?: ExpenseClaim["scope"];
  status?: ApprovalStatus;
  branchId?: string;
  from?: string;
  to?: string;
}): Promise<ExpenseClaimList> {
  const { data, meta } = await apiRequest<ExpenseRequestWire[]>("/api/v1/expense-requests", {
    token: await token(),
    query: {
      scope: filters?.scope,
      status: filters?.status,
      branch_id: filters?.branchId,
      from: filters?.from,
      to: filters?.to,
    },
  });

  return {
    claims: data.map(toClaim),
    total: Number(meta?.total ?? 0),
    approvedTotal: Number(meta?.approvedTotal ?? 0),
  };
}

export interface FileExpenseInput {
  expenseCategoryId: string;
  branchId?: string;
  /**
   * The bank account the money left, when it was not the branch till.
   * Approval credits this account instead — Bank → Register Bank Expenses.
   */
  bankAccountId?: string;
  amount: number;
  description: string;
  comment?: string | null;
  requestedOn?: string;
  /**
   * The register this screen files under.
   *
   * Sent so the backend can refuse a category from the other one rather than
   * quietly booking a branch cost to head office. It never sets anything —
   * the category decides that.
   */
  scope: ExpenseClaim["scope"];
}

export async function fileExpenseRequest(input: FileExpenseInput): Promise<ExpenseClaimRecord> {
  return toClaim(
    await apiData<ExpenseRequestWire>("/api/v1/expense-requests", {
      method: "POST",
      token: await token(),
      body: {
        expenseCategoryId: input.expenseCategoryId,
        branchId: input.branchId,
        bankAccountId: input.bankAccountId,
        amount: input.amount,
        description: input.description,
        comment: input.comment ?? null,
        requestedOn: input.requestedOn,
        scope: input.scope,
      },
    })
  );
}

/**
 * Approve or reject. One call for both buttons, matching the endpoint — they
 * are the same transition with a different outcome.
 */
export async function decideExpenseRequest(
  id: string,
  decision: Exclude<ApprovalStatus, "pending">,
  comment?: string | null
): Promise<ExpenseClaimRecord> {
  return toClaim(
    await apiData<ExpenseRequestWire>(`/api/v1/expense-requests/${id}/decide`, {
      method: "POST",
      token: await token(),
      body: { decision, comment: comment ?? null },
    })
  );
}

export async function commentOnExpenseRequest(
  id: string,
  comment: string | null
): Promise<ExpenseClaimRecord> {
  return toClaim(
    await apiData<ExpenseRequestWire>(`/api/v1/expense-requests/${id}/comment`, {
      method: "PATCH",
      token: await token(),
      body: { comment },
    })
  );
}

export async function withdrawExpenseRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/expense-requests/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}
