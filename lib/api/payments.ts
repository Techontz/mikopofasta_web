import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { Payment, PaymentAllocation, SuspenseItem } from "@/types/repayment";
import type { PaymentChannel } from "@/types/enums";

/**
 * Repayments & Collections — backend §2.6, §7, §15.3.
 *
 * Four grants, deliberately separate (§14): `repayments.view`,
 * `repayments.manage`, `repayments.cash_entry` (the Teller's only write) and
 * `repayments.reconcile`. All of it is enforced by the API, and every branch is
 * scoped there too (§13), so nothing here re-checks either.
 *
 * Money arrives as decimal strings, as everywhere else in this API, and is
 * parsed once here so no screen has to know the wire format.
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
// Wire shapes
// ---------------------------------------------------------------------------

interface PaymentAllocationWire {
  id: string;
  paymentId: string;
  loanScheduleId: string;
  penaltyAllocated: string;
  interestAllocated: string;
  principalAllocated: string;
  total: string;
  createdAt: string | null;
}

interface PaymentWire {
  id: string;
  paymentReference: string;
  loanId: string | null;
  customerId: string | null;
  amount: string;
  channel: PaymentChannel;
  transactionId: string | null;
  status: Payment["status"];
  branchId: string | null;
  tellerId: string | null;
  receivedAt: string;
  confirmedAt: string | null;
  createdBy: string | null;
  journalEntryId: string | null;
  journalEntryNumber?: string | null;
  allocations?: PaymentAllocationWire[];
  loanNumber?: string | null;
}

interface SuspenseItemWire {
  id: string;
  paymentId: string;
  reason: string;
  amount: string;
  status: SuspenseItem["status"];
  resolvedBy: string | null;
  resolvedAt: string | null;
  paymentReference?: string | null;
  resolvedByName?: string | null;
}

/**
 * A payment plus what the API resolved alongside it. `loanNumber` and
 * `journalEntryNumber` come eager-loaded; there is no customer or branch name
 * on this resource, which is why the list resolves those separately.
 */
export interface PaymentListItem extends Payment {
  loanNumber: string | null;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
}

export interface PaymentAllocationRow extends PaymentAllocation {
  total: number;
}

function toPayment(wire: PaymentWire): PaymentListItem {
  return {
    id: wire.id,
    paymentReference: wire.paymentReference,
    loanId: wire.loanId,
    customerId: wire.customerId,
    amount: num(wire.amount),
    channel: wire.channel,
    transactionId: wire.transactionId,
    status: wire.status,
    branchId: wire.branchId,
    tellerId: wire.tellerId,
    receivedAt: wire.receivedAt,
    confirmedAt: wire.confirmedAt,
    createdBy: wire.createdBy,
    loanNumber: wire.loanNumber ?? null,
    journalEntryId: wire.journalEntryId,
    journalEntryNumber: wire.journalEntryNumber ?? null,
  };
}

function toAllocation(wire: PaymentAllocationWire): PaymentAllocationRow {
  return {
    id: wire.id,
    paymentId: wire.paymentId,
    loanScheduleId: wire.loanScheduleId,
    penaltyAllocated: num(wire.penaltyAllocated),
    interestAllocated: num(wire.interestAllocated),
    principalAllocated: num(wire.principalAllocated),
    total: num(wire.total),
    createdAt: wire.createdAt ?? "",
  };
}

function toSuspenseItem(wire: SuspenseItemWire): SuspenseItemWithNames {
  return {
    id: wire.id,
    paymentId: wire.paymentId,
    reason: wire.reason,
    amount: num(wire.amount),
    status: wire.status,
    resolvedBy: wire.resolvedBy,
    resolvedAt: wire.resolvedAt,
    paymentReference: wire.paymentReference ?? null,
    resolvedByName: wire.resolvedByName ?? null,
  };
}

export interface SuspenseItemWithNames extends SuspenseItem {
  paymentReference: string | null;
  resolvedByName: string | null;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export interface PaymentFilters {
  search?: string;
  status?: string[];
  channel?: string[];
  loanId?: string;
  /**
   * Every payment against every loan this customer holds, in one request.
   * Resolved through the loan on the API side — a payment has no customer of
   * its own — which is what lets the teller session ask once instead of once
   * per loan.
   */
  customerId?: string;
  branchId?: string;
  page?: number;
  perPage?: number;
}

function repeatedParams(filters: PaymentFilters): string {
  const parts: string[] = [];
  for (const value of filters.status ?? []) parts.push(`status[]=${encodeURIComponent(value)}`);
  for (const value of filters.channel ?? []) parts.push(`channel[]=${encodeURIComponent(value)}`);
  return parts.join("&");
}

export async function getPayments(
  filters: PaymentFilters = {}
): Promise<{ payments: PaymentListItem[]; pagination?: ApiPagination }> {
  const repeated = repeatedParams(filters);
  const path = repeated ? `/api/v1/payments?${repeated}` : "/api/v1/payments";

  const response = await apiRequest<PaymentWire[]>(path, {
    token: await token(),
    query: {
      search: filters.search,
      loan_id: toId(filters.loanId) ?? undefined,
      customer_id: toId(filters.customerId) ?? undefined,
      branch_id: toId(filters.branchId) ?? undefined,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { payments: response.data.map(toPayment), pagination: response.meta?.pagination };
}

/**
 * Every payment the caller may see, page by page.
 *
 * The list screen searches, filters and paginates in the browser, and its four
 * tiles count across all of it; there is no aggregate endpoint to ask instead.
 * PAGE_LIMIT is a backstop that logs rather than silently truncating — a
 * collections total that quietly stops short is worse than no total.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 100;

export async function getAllPayments(filters: PaymentFilters = {}): Promise<PaymentListItem[]> {
  const all: PaymentListItem[] = [];
  let page = 1;

  for (;;) {
    const { payments, pagination } = await getPayments({ ...filters, page, perPage: PER_PAGE });
    all.push(...payments);

    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage) break;

    if (page >= PAGE_LIMIT) {
      console.warn(
        `getAllPayments stopped at ${PAGE_LIMIT} pages (${all.length} of ${pagination?.total ?? "?"} payments).`
      );
      break;
    }

    page += 1;
  }

  return all;
}

/** `show` eager-loads allocations and the journal entry. */
export async function getPayment(
  id: string
): Promise<PaymentListItem & { allocations: PaymentAllocationRow[] }> {
  const wire = await apiData<PaymentWire>(`/api/v1/payments/${id}`, { token: await token() });
  return { ...toPayment(wire), allocations: (wire.allocations ?? []).map(toAllocation) };
}

/**
 * POST /payments/cash — the Teller's only write.
 *
 * Behind the `idempotency` middleware, so a retried submission replays rather
 * than taking the customer's money twice. The key is derived from the loan,
 * amount and the caller-supplied token so a genuine second payment of the same
 * amount is still a second payment.
 */
export async function recordCashPaymentRequest(
  loanId: string,
  amount: number,
  idempotencyKey: string
): Promise<PaymentListItem & { allocations: PaymentAllocationRow[] }> {
  const wire = await apiData<PaymentWire>("/api/v1/payments/cash", {
    method: "POST",
    token: await token(),
    idempotencyKey,
    body: { loanId: toId(loanId), amount: amount.toFixed(2) },
  });
  return { ...toPayment(wire), allocations: (wire.allocations ?? []).map(toAllocation) };
}

/**
 * POST /payments/unmatched — money that arrived and could not be matched.
 *
 * It is still received and still ledgered, to Suspense, never dropped (§7).
 * This is the only inbound-money endpoint a signed-in user can call: the
 * provider callback at `POST /webhooks/payments` authenticates with an HMAC
 * signature this app does not hold, and should not.
 */
export async function recordUnmatchedPaymentRequest(input: {
  amount: number;
  channel: PaymentChannel;
  transactionId?: string | null;
  reason: string;
  branchId?: string | null;
}): Promise<PaymentListItem> {
  const wire = await apiData<PaymentWire>("/api/v1/payments/unmatched", {
    method: "POST",
    token: await token(),
    body: {
      amount: input.amount.toFixed(2),
      channel: input.channel,
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      reason: input.reason,
      ...(input.branchId ? { branchId: toId(input.branchId) } : {}),
    },
  });
  return toPayment(wire);
}

// ---------------------------------------------------------------------------
// Suspense
// ---------------------------------------------------------------------------

/**
 * GET /payments/suspense
 *
 * Returns the *open* queue only — unallocated and investigating. Items already
 * allocated are not included, which is why the page no longer renders a
 * "Resolved" section: there is nothing to put in it.
 */
export async function getSuspenseItems(): Promise<SuspenseItemWithNames[]> {
  const wire = await apiData<SuspenseItemWire[]>("/api/v1/payments/suspense", { token: await token() });
  return wire.map(toSuspenseItem);
}

export async function allocateSuspenseRequest(itemId: string, loanId: string): Promise<SuspenseItemWithNames> {
  const wire = await apiData<SuspenseItemWire>(`/api/v1/payments/suspense/${itemId}/allocate`, {
    method: "POST",
    token: await token(),
    body: { loanId: toId(loanId) },
  });
  return toSuspenseItem(wire);
}

export async function investigateSuspenseRequest(itemId: string): Promise<SuspenseItemWithNames> {
  const wire = await apiData<SuspenseItemWire>(`/api/v1/payments/suspense/${itemId}/investigate`, {
    method: "POST",
    token: await token(),
  });
  return toSuspenseItem(wire);
}

// ---------------------------------------------------------------------------
// Overdue / penalty run
// ---------------------------------------------------------------------------

/**
 * POST /loans/overdue/process — §7's penalty job, cron-driven in production and
 * manually invokable by Finance, which is why it is an endpoint.
 *
 * `ledgerPosting` is the API telling us it deliberately posted nothing: penalty
 * income is recognised on collection, not on accrual (OSC-1).
 */
export interface OverdueRunResult {
  runDate: string;
  loansProcessed: number;
  installmentsPenalised: number;
  totalPenaltyApplied: number;
  ledgerPosting: string;
}

export async function runOverdueProcessRequest(): Promise<OverdueRunResult> {
  const wire = await apiData<{
    runDate: string;
    loansProcessed: number;
    installmentsPenalised: number;
    totalPenaltyApplied: string;
    ledgerPosting: string;
  }>("/api/v1/loans/overdue/process", { method: "POST", token: await token() });

  return {
    runDate: wire.runDate,
    loansProcessed: wire.loansProcessed,
    installmentsPenalised: wire.installmentsPenalised,
    totalPenaltyApplied: num(wire.totalPenaltyApplied),
    ledgerPosting: wire.ledgerPosting,
  };
}
