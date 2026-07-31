import "server-only";
import { apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { DeductedIncome, PaidPenalty, Penalty } from "@/types/operations";

/**
 * The charge registers — sidebar → Penalty (Penalty List, Paid Penalty) and
 * Loan Fee (Deducted Income).
 *
 * Read-only, and deliberately so. Nothing writes a penalty or a fee here: the
 * overdue job accrues one onto the loan schedule, the repayment engine collects
 * it, and disbursement withholds the fee. These three screens are views over
 * records those engines already wrote, which is what stops them drifting from
 * the loan book.
 *
 * Behind `loans.view` OR `repayments.view` — a penalty is both a term of the
 * loan and money to collect, so either grant opens it.
 *
 * See the API's docs/modules/penalties-and-fees.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

/** The filters all three registers share. */
export interface ChargeFilters {
  /** Customer name, customer number, phone or loan number. */
  search?: string;
  branchId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  sort?: "date" | "amount" | "customer";
  direction?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

function query(filters?: ChargeFilters): Record<string, string | number | undefined> {
  return {
    search: filters?.search,
    branch_id: filters?.branchId,
    customer_id: filters?.customerId,
    from: filters?.from,
    to: filters?.to,
    sort: filters?.sort,
    direction: filters?.direction,
    page: filters?.page,
    per_page: filters?.perPage,
  };
}

// ---------------------------------------------------------------------------
// Penalty List
// ---------------------------------------------------------------------------

interface PenaltyWire {
  id: string;
  customerName: string;
  branch: string;
  loanAmount: string;
  penaltyAmount: string;
  date: string;
  penaltyPaid: string;
  outstanding: string;
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  installmentNumber: number;
  status: string;
}

/**
 * `Penalty` plus what the screen needs beyond drawing a row.
 *
 * `outstanding` is the load-bearing addition: the schema's `penaltyAmount` is
 * what was *charged*, and it does not shrink when paid — so without this there
 * is no way to tell a settled penalty from an untouched one.
 */
export interface PenaltyRecord extends Penalty {
  penaltyPaid: number;
  outstanding: number;
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  installmentNumber: number;
}

function toPenalty(wire: PenaltyWire): PenaltyRecord {
  return {
    id: wire.id,
    customerName: wire.customerName,
    branch: wire.branch,
    // DECIMAL strings on the wire so money never rides on a float between the
    // two systems; the tables want numbers.
    loanAmount: Number(wire.loanAmount),
    penaltyAmount: Number(wire.penaltyAmount),
    date: wire.date,
    penaltyPaid: Number(wire.penaltyPaid),
    outstanding: Number(wire.outstanding),
    loanId: wire.loanId,
    loanNumber: wire.loanNumber,
    customerId: wire.customerId,
    branchId: wire.branchId,
    installmentNumber: wire.installmentNumber,
  };
}

export interface PenaltyList {
  penalties: PenaltyRecord[];
  /**
   * Over the whole filtered set, not the visible page — a footer that only
   * added up one page is a different number on page two.
   */
  totalCharged: number;
  totalPaid: number;
  totalOutstanding: number;
  pagination?: ApiPagination;
}

export async function getPenalties(filters?: ChargeFilters): Promise<PenaltyList> {
  const { data, meta } = await apiRequest<PenaltyWire[]>("/api/v1/penalties", {
    token: await token(),
    query: query(filters),
  });

  return {
    penalties: data.map(toPenalty),
    totalCharged: Number(meta?.totalCharged ?? 0),
    totalPaid: Number(meta?.totalPaid ?? 0),
    totalOutstanding: Number(meta?.totalOutstanding ?? 0),
    pagination: meta?.pagination,
  };
}

// ---------------------------------------------------------------------------
// Paid Penalty
// ---------------------------------------------------------------------------

interface PaidPenaltyWire {
  id: string;
  customerName: string;
  branch: string;
  paidAmount: string;
  date: string;
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  paymentId: string;
  paymentReference: string;
  installmentNumber: number;
}

export interface PaidPenaltyRecord extends PaidPenalty {
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  paymentId: string;
  paymentReference: string;
  installmentNumber: number;
}

function toPaidPenalty(wire: PaidPenaltyWire): PaidPenaltyRecord {
  return {
    id: wire.id,
    customerName: wire.customerName,
    branch: wire.branch,
    paidAmount: Number(wire.paidAmount),
    date: wire.date,
    loanId: wire.loanId,
    loanNumber: wire.loanNumber,
    customerId: wire.customerId,
    branchId: wire.branchId,
    paymentId: wire.paymentId,
    paymentReference: wire.paymentReference,
    installmentNumber: wire.installmentNumber,
  };
}

export interface PaidPenaltyList {
  penalties: PaidPenaltyRecord[];
  /** Ties to the 2200 Penalty Income account — the same events, counted once. */
  totalPaid: number;
  pagination?: ApiPagination;
}

export async function getPaidPenalties(filters?: ChargeFilters): Promise<PaidPenaltyList> {
  const { data, meta } = await apiRequest<PaidPenaltyWire[]>("/api/v1/penalties/paid", {
    token: await token(),
    query: query(filters),
  });

  return {
    penalties: data.map(toPaidPenalty),
    totalPaid: Number(meta?.totalPaid ?? 0),
    pagination: meta?.pagination,
  };
}

// ---------------------------------------------------------------------------
// Deducted Income
// ---------------------------------------------------------------------------

interface DeductedIncomeWire {
  id: string;
  customerName: string;
  branch: string;
  loanApproved: string;
  incomeAmount: string;
  date: string | null;
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  feeType: string | null;
  feeRate: string | null;
  insuranceAmount: string | null;
  netDisbursed: string;
}

export interface DeductedIncomeRecord extends DeductedIncome {
  loanId: string;
  loanNumber: string;
  customerId: string;
  branchId: string | null;
  /** How to read `feeRate`: a percentage, or a flat amount in shillings. */
  feeType: string | null;
  feeRate: number | null;
  insuranceAmount: number | null;
  /** What the borrower actually received — the principal less what was held. */
  netDisbursed: number;
}

function toDeductedIncome(wire: DeductedIncomeWire): DeductedIncomeRecord {
  return {
    id: wire.id,
    customerName: wire.customerName,
    branch: wire.branch,
    loanApproved: Number(wire.loanApproved),
    incomeAmount: Number(wire.incomeAmount),
    // A row only appears once the loan has disbursed, so the date is set; the
    // fallback keeps the type honest rather than defending a real case.
    date: wire.date ?? "",
    loanId: wire.loanId,
    loanNumber: wire.loanNumber,
    customerId: wire.customerId,
    branchId: wire.branchId,
    feeType: wire.feeType,
    feeRate: wire.feeRate === null ? null : Number(wire.feeRate),
    insuranceAmount: wire.insuranceAmount === null ? null : Number(wire.insuranceAmount),
    netDisbursed: Number(wire.netDisbursed),
  };
}

export interface DeductedIncomeList {
  income: DeductedIncomeRecord[];
  /** Ties to the 2100 Fee Income account. */
  totalIncome: number;
  totalApproved: number;
  pagination?: ApiPagination;
}

export async function getDeductedIncome(filters?: ChargeFilters): Promise<DeductedIncomeList> {
  const { data, meta } = await apiRequest<DeductedIncomeWire[]>("/api/v1/loan-fees/income", {
    token: await token(),
    query: query(filters),
  });

  return {
    income: data.map(toDeductedIncome),
    totalIncome: Number(meta?.totalIncome ?? 0),
    totalApproved: Number(meta?.totalApproved ?? 0),
    pagination: meta?.pagination,
  };
}
