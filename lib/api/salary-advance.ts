import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type {
  AdvanceStatus,
  SalaryAdvance,
  SalaryAdvanceCategory,
  SalaryAdvanceCategoryInput,
  SalaryAdvancePayment,
} from "@/types/salary-advance";

/**
 * Salary Advance — sidebar → Salary Advance, and HRM → Staff salary advance
 * category (the legacy menu reaches the same register from two places).
 *
 * Reads need `hr.view`; managing bands needs `hr.manage`. The lifecycle
 * endpoints live under /staff/advance/* where §15.5 put them, and enforce §11's
 * separation: HR approves, **Finance** disburses, never the same grant.
 *
 * See the API's docs/modules/salary-advance.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

interface CategoryWire {
  id: string;
  name: string;
  interestRate: string;
  fromAmount: string;
  toAmount: string;
  chargeFee: string;
  recoveryPeriods: number;
  advanceCount?: number;
}

/**
 * `SalaryAdvanceCategory` plus the recovery term.
 *
 * `recoveryPeriods` is not on the frontend schema because the fixture this
 * screen ran on had no notion of a repayment schedule. It is what turns a band
 * into terms rather than a price list — the per-payslip instalment is the total
 * repayable spread across it — so it is surfaced.
 */
export interface SalaryAdvanceCategoryRecord extends SalaryAdvanceCategory {
  recoveryPeriods: number;
  /** How many advances have been priced by this band. */
  advanceCount: number;
}

function toCategory(wire: CategoryWire): SalaryAdvanceCategoryRecord {
  return {
    id: wire.id,
    name: wire.name,
    // DECIMAL strings on the wire so money and rates never ride on a float
    // between the two systems; the forms want numbers.
    interestRate: Number(wire.interestRate),
    fromAmount: Number(wire.fromAmount),
    toAmount: Number(wire.toAmount),
    chargeFee: Number(wire.chargeFee),
    recoveryPeriods: wire.recoveryPeriods,
    advanceCount: wire.advanceCount ?? 0,
  };
}

export async function getSalaryAdvanceCategories(): Promise<SalaryAdvanceCategoryRecord[]> {
  const wire = await apiData<CategoryWire[]>("/api/v1/salary-advance-categories", {
    token: await token(),
  });

  return wire.map(toCategory);
}

export interface SalaryAdvanceCategoryPayload extends SalaryAdvanceCategoryInput {
  recoveryPeriods: number;
}

export async function createSalaryAdvanceCategory(
  input: SalaryAdvanceCategoryPayload
): Promise<SalaryAdvanceCategoryRecord> {
  return toCategory(
    await apiData<CategoryWire>("/api/v1/salary-advance-categories", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function updateSalaryAdvanceCategory(
  id: string,
  input: SalaryAdvanceCategoryPayload
): Promise<SalaryAdvanceCategoryRecord> {
  return toCategory(
    await apiData<CategoryWire>(`/api/v1/salary-advance-categories/${id}`, {
      method: "PUT",
      token: await token(),
      body: input,
    })
  );
}

export async function deleteSalaryAdvanceCategory(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/salary-advance-categories/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Advances
// ---------------------------------------------------------------------------

interface AdvanceWire {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  branch: string;
  categoryId: string;
  categoryName: string;
  loanAmount: string;
  interest: string;
  chargeFee: string;
  paidAmount: string;
  status: AdvanceStatus;
  date: string;
  overdueDays: number;
  totalRepayable: string;
  remaining: string;
  recoveryPeriods: number;
  staffProfileId: string;
  dueDate: string | null;
  rejectionReason: string | null;
}

/**
 * `SalaryAdvance` plus what the screens need to act on a row.
 *
 * `totalRepayable` and `remaining` come down computed rather than being derived
 * here. The frontend's `advanceTotals` derives the same two from the columns
 * beside them, and both agreeing is the point — but the server is the one that
 * decides what an advance costs, so it is the one that says.
 */
export interface SalaryAdvanceRecord extends SalaryAdvance {
  totalRepayable: number;
  remaining: number;
  recoveryPeriods: number;
  staffProfileId: string;
  dueDate: string | null;
  rejectionReason: string | null;
}

function toAdvance(wire: AdvanceWire): SalaryAdvanceRecord {
  return {
    id: wire.id,
    reference: wire.reference,
    // The employee. The schema calls it customerName because the legacy screens
    // reuse the customer table's markup for staff.
    customerName: wire.customerName,
    phone: wire.phone,
    branch: wire.branch,
    categoryId: wire.categoryId,
    categoryName: wire.categoryName,
    loanAmount: Number(wire.loanAmount),
    interest: Number(wire.interest),
    chargeFee: Number(wire.chargeFee),
    paidAmount: Number(wire.paidAmount),
    status: wire.status,
    date: wire.date,
    overdueDays: wire.overdueDays,
    totalRepayable: Number(wire.totalRepayable),
    remaining: Number(wire.remaining),
    recoveryPeriods: wire.recoveryPeriods,
    staffProfileId: wire.staffProfileId,
    dueDate: wire.dueDate,
    rejectionReason: wire.rejectionReason,
  };
}

export interface SalaryAdvanceList {
  advances: SalaryAdvanceRecord[];
  totals: {
    principal: number;
    interest: number;
    chargeFee: number;
    repayable: number;
    paid: number;
    remaining: number;
  };
  pagination?: ApiPagination;
}

export async function getSalaryAdvances(filters?: {
  status?: AdvanceStatus;
  branchId?: string;
  staffProfileId?: string;
  categoryId?: string;
  search?: string;
  perPage?: number;
}): Promise<SalaryAdvanceList> {
  const { data, meta } = await apiRequest<AdvanceWire[]>("/api/v1/salary-advances", {
    token: await token(),
    query: {
      status: filters?.status,
      branch_id: filters?.branchId,
      staff_profile_id: filters?.staffProfileId,
      category_id: filters?.categoryId,
      search: filters?.search,
      per_page: filters?.perPage,
    },
  });

  return {
    advances: data.map(toAdvance),
    totals: {
      principal: Number(meta?.totalPrincipal ?? 0),
      interest: Number(meta?.totalInterest ?? 0),
      chargeFee: Number(meta?.totalChargeFee ?? 0),
      repayable: Number(meta?.totalRepayable ?? 0),
      paid: Number(meta?.totalPaid ?? 0),
      remaining: Number(meta?.totalRemaining ?? 0),
    },
    pagination: meta?.pagination,
  };
}

// ---------------------------------------------------------------------------
// Repayments
// ---------------------------------------------------------------------------

interface RepaymentWire {
  id: string;
  branch: string;
  customerName: string;
  amount: string;
  date: string;
  advanceId: string | null;
  period: string;
}

export interface SalaryAdvancePaymentRecord extends SalaryAdvancePayment {
  advanceId: string | null;
  period: string;
}

export interface SalaryAdvancePaymentList {
  payments: SalaryAdvancePaymentRecord[];
  totalRepaid: number;
  pagination?: ApiPagination;
}

/**
 * Each instalment taken from a payslip.
 *
 * An advance is repaid by being deducted from payroll, so the deduction row IS
 * the payment — which is why this reads them rather than a payments table that
 * would have to be kept in step with one.
 */
export async function getSalaryAdvanceRepayments(filters?: {
  staffProfileId?: string;
  perPage?: number;
}): Promise<SalaryAdvancePaymentList> {
  const { data, meta } = await apiRequest<RepaymentWire[]>("/api/v1/salary-advances/repayments", {
    token: await token(),
    query: {
      staff_profile_id: filters?.staffProfileId,
      per_page: filters?.perPage,
    },
  });

  return {
    payments: data.map((wire) => ({
      id: wire.id,
      branch: wire.branch,
      customerName: wire.customerName,
      amount: Number(wire.amount),
      date: wire.date,
      advanceId: wire.advanceId,
      period: wire.period,
    })),
    totalRepaid: Number(meta?.totalRepaid ?? 0),
    pagination: meta?.pagination,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle — §11's request → HR approval → Finance disbursement
// ---------------------------------------------------------------------------

export async function requestSalaryAdvance(input: {
  staffProfileId: string;
  amount: number;
}): Promise<SalaryAdvanceRecord> {
  /*
   * No category is sent. The band is found from the amount server-side —
   * letting the requester pick one would let them pick their own interest
   * rate, and two people borrowing the same amount would be on different terms.
   */
  return toAdvance(
    await apiData<AdvanceWire>("/api/v1/staff/advance/request", {
      method: "POST",
      token: await token(),
      body: { staffProfileId: input.staffProfileId, amount: input.amount },
    })
  );
}

export async function approveSalaryAdvance(advanceId: string): Promise<SalaryAdvanceRecord> {
  return toAdvance(
    await apiData<AdvanceWire>("/api/v1/staff/advance/approve", {
      method: "POST",
      token: await token(),
      body: { advanceId },
    })
  );
}

export async function rejectSalaryAdvance(
  advanceId: string,
  reason?: string
): Promise<SalaryAdvanceRecord> {
  return toAdvance(
    await apiData<AdvanceWire>("/api/v1/staff/advance/reject", {
      method: "POST",
      token: await token(),
      body: { advanceId, reason },
    })
  );
}

/** Finance only — §11 gives disbursement to a different grant than approval. */
export async function disburseSalaryAdvance(advanceId: string): Promise<SalaryAdvanceRecord> {
  return toAdvance(
    await apiData<AdvanceWire>("/api/v1/staff/advance/disburse", {
      method: "POST",
      token: await token(),
      body: { advanceId },
    })
  );
}
