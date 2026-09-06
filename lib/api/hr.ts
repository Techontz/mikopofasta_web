import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type {
  StaffAdvance,
  StaffLoan,
  StaffPerformanceRecord,
  StaffProfile,
} from "@/types/staff";
import type { PayrollRun, PayrollLine, Allowance, Deduction } from "@/types/payroll";
import type { CommissionPool, CommissionDistribution, ZoneCommissionDistribution } from "@/types/commission";
import type { Role } from "@/types/auth";
import type { AllowanceType, DeductionType } from "@/types/enums";
import { collectPages } from "@/lib/api/paginate";

/**
 * HR, Payroll & Commission — backend §2.9, §11, §15.5.
 *
 * §14's separation of duties is visible in the grants rather than in the paths:
 * `hr.view` / `hr.manage` for the staff book and advances, `payroll.generate`
 * for HR's draft, and `payroll.finalize` for everything Finance does —
 * finalizing, paying, and disbursing an advance.
 *
 * Nothing here is branch-scoped, deliberately: HR is an HQ function, and a
 * company keeps one personnel record per employee rather than one per branch.
 *
 * Money arrives as decimal strings, as everywhere else, and is parsed once here.
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

/** `{ key: "2500.00" }` → `{ key: 2500 }`, for the performance target/achieved maps. */
function numericMap(input: Record<string, unknown> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(input ?? {})) out[key] = num(value as string);
  return out;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

interface StaffWire {
  id: string;
  userId: string;
  employeeNumber: string;
  branchId: string | null;
  zoneId: string | null;
  baseSalary: string;
  commissionEligible: boolean;
  paymentMethod: StaffProfile["paymentMethod"];
  employmentStatus: StaffProfile["employmentStatus"];
  hiredAt: string;
  deletedAt: string | null;
  name?: string | null;
  role?: string | null;
  branchName?: string | null;
  bankDetails?: { id: string; staffProfileId: string; bankName: string; accountNumber: string } | null;
}

/**
 * A staff profile plus what the API resolved alongside it. The name, role and
 * branch travel with the record because otherwise every row of the staff table
 * would cost another request.
 */
export interface StaffListItem extends StaffProfile {
  name: string | null;
  role: Role | null;
  branchName: string | null;
  bankDetails: { bankName: string; accountNumber: string } | null;
}

function toStaff(wire: StaffWire): StaffListItem {
  return {
    id: wire.id,
    userId: wire.userId,
    employeeNumber: wire.employeeNumber,
    branchId: wire.branchId,
    zoneId: wire.zoneId,
    baseSalary: num(wire.baseSalary),
    commissionEligible: wire.commissionEligible,
    paymentMethod: wire.paymentMethod,
    employmentStatus: wire.employmentStatus,
    hiredAt: wire.hiredAt,
    deletedAt: wire.deletedAt,
    name: wire.name ?? null,
    role: (wire.role as Role) ?? null,
    branchName: wire.branchName ?? null,
    bankDetails: wire.bankDetails ? { bankName: wire.bankDetails.bankName, accountNumber: wire.bankDetails.accountNumber } : null,
  };
}

export interface StaffFilters {
  search?: string;
  employmentStatus?: string[];
  branchId?: string;
  commissionEligible?: boolean;
  page?: number;
  perPage?: number;
}

export async function getStaff(
  filters: StaffFilters = {}
): Promise<{ staff: StaffListItem[]; pagination?: ApiPagination }> {
  const repeated = (filters.employmentStatus ?? [])
    .map((s) => `employment_status[]=${encodeURIComponent(s)}`)
    .join("&");
  const path = repeated ? `/api/v1/staff?${repeated}` : "/api/v1/staff";

  const response = await apiRequest<StaffWire[]>(path, {
    token: await token(),
    query: {
      search: filters.search,
      branch_id: toId(filters.branchId) ?? undefined,
      commission_eligible: filters.commissionEligible === undefined ? undefined : filters.commissionEligible ? 1 : 0,
      page: filters.page,
      per_page: filters.perPage,
    },
  });

  return { staff: response.data.map(toStaff), pagination: response.meta?.pagination };
}

/**
 * The whole staff book, page by page. The list screen searches and filters in
 * the browser and the overview counts across all of it; there is no aggregate
 * endpoint. The cap logs rather than silently truncating a headcount.
 */
const PER_PAGE = 100;
const PAGE_LIMIT = 50;

export async function getAllStaff(filters: StaffFilters = {}): Promise<StaffListItem[]> {
  return collectPages(
    async (page, perPage) => {
      const { staff, pagination } = await getStaff({ ...filters, page, perPage });
      return { items: staff, pagination };
    },
    { pageLimit: PAGE_LIMIT, perPage: PER_PAGE, label: "getAllStaff" }
  );
}

/** `show` carries the employee's loans, advances and performance in `meta`. */
export interface StaffDetail {
  staff: StaffListItem;
  loans: StaffLoanWithName[];
  advances: StaffAdvanceWithName[];
  performance: PerformanceRecordWithName[];
}

export async function getStaffMember(id: string): Promise<StaffDetail> {
  const response = await apiRequest<StaffWire>(`/api/v1/staff/${id}`, { token: await token() });
  const meta = response.meta as
    | { loans?: StaffLoanWire[]; advances?: StaffAdvanceWire[]; performance?: PerformanceWire[] }
    | undefined;

  return {
    staff: toStaff(response.data),
    loans: (meta?.loans ?? []).map(toStaffLoan),
    advances: (meta?.advances ?? []).map(toAdvance),
    performance: (meta?.performance ?? []).map(toPerformance),
  };
}

export interface RegisterStaffInput {
  name: string;
  phone: string;
  email?: string | null;
  password: string;
  role: string;
  branchId?: string | null;
  zoneId?: string | null;
  baseSalary: number;
  commissionEligible?: boolean;
  paymentMethod?: string;
  hiredAt: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}

/**
 * POST /staff creates the *user account and the employment record together* —
 * the person being hired needs somewhere to sign in, so the payload carries
 * both halves in one request.
 */
export async function registerStaffRequest(input: RegisterStaffInput): Promise<StaffListItem> {
  const wire = await apiData<StaffWire>("/api/v1/staff", {
    method: "POST",
    token: await token(),
    body: {
      name: input.name,
      phone: input.phone,
      ...(input.email ? { email: input.email } : {}),
      password: input.password,
      role: input.role,
      ...(input.branchId ? { branchId: toId(input.branchId) } : {}),
      ...(input.zoneId ? { zoneId: toId(input.zoneId) } : {}),
      baseSalary: input.baseSalary.toFixed(2),
      ...(input.commissionEligible === undefined ? {} : { commissionEligible: input.commissionEligible }),
      ...(input.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      hiredAt: input.hiredAt,
      ...(input.bankName ? { bankName: input.bankName } : {}),
      ...(input.bankAccountNumber ? { bankAccountNumber: input.bankAccountNumber } : {}),
    },
  });
  return toStaff(wire);
}

export interface UpdateStaffInput {
  baseSalary?: number;
  commissionEligible?: boolean;
  paymentMethod?: string;
  employmentStatus?: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
}

export async function updateStaffRequest(id: string, input: UpdateStaffInput): Promise<StaffListItem> {
  const wire = await apiData<StaffWire>(`/api/v1/staff/${id}`, {
    method: "PUT",
    token: await token(),
    body: {
      ...(input.baseSalary === undefined ? {} : { baseSalary: input.baseSalary.toFixed(2) }),
      ...(input.commissionEligible === undefined ? {} : { commissionEligible: input.commissionEligible }),
      ...(input.paymentMethod === undefined ? {} : { paymentMethod: input.paymentMethod }),
      ...(input.employmentStatus === undefined ? {} : { employmentStatus: input.employmentStatus }),
      ...(input.bankName === undefined ? {} : { bankName: input.bankName }),
      ...(input.bankAccountNumber === undefined ? {} : { bankAccountNumber: input.bankAccountNumber }),
    },
  });
  return toStaff(wire);
}

// ---------------------------------------------------------------------------
// Staff loans, advances and performance
// ---------------------------------------------------------------------------

interface StaffLoanWire {
  id: string;
  staffProfileId: string;
  amount: string;
  status: StaffLoan["status"];
  // Both null until Finance disburses.
  disbursedAt: string | null;
  journalEntryId: string | null;
  staffName?: string | null;
  reference: string;
  statusLabel: string;
  amountRecovered: string;
  recoveryPeriods: number;
  outstanding: string;
  nextRecovery: string;
  requestedAt: string | null;
  approvedAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  approvedByName?: string | null;
}

interface StaffAdvanceWire {
  id: string;
  staffProfileId: string;
  amount: string;
  status: StaffAdvance["status"];
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  disbursedAt: string | null;
  journalEntryId: string | null;
  staffName?: string | null;
}

interface PerformanceWire {
  id: string;
  staffProfileId: string;
  period: string;
  targets: Record<string, unknown>;
  achieved: Record<string, unknown>;
  rating: StaffPerformanceRecord["rating"];
  recordedBy: string;
  staffName?: string | null;
  recordedByName?: string | null;
}

/**
 * `StaffLoan` plus its terms and its progress.
 *
 * The schema was written when a staff loan had an amount and nothing else, so
 * a screen could not say what was left to repay — and nothing in the system
 * could, either: the loan never closed and payroll kept deducting a flat figure
 * past full repayment. See the API's docs/modules/hr-payroll.md.
 */
export interface StaffLoanWithName extends StaffLoan {
  staffName: string | null;
  reference: string;
  statusLabel: string;
  amountRecovered: number;
  recoveryPeriods: number;
  /** What is still owed, and what the next payslip will take. */
  outstanding: number;
  nextRecovery: number;
  requestedAt: string | null;
  approvedAt: string | null;
  closedAt: string | null;
  rejectionReason: string | null;
  approvedByName: string | null;
}
export interface StaffAdvanceWithName extends StaffAdvance {
  staffName: string | null;
}
export interface PerformanceRecordWithName extends StaffPerformanceRecord {
  staffName: string | null;
  /** The manager who recorded it, resolved server-side. */
  recordedByName: string | null;
}

function toStaffLoan(wire: StaffLoanWire): StaffLoanWithName {
  return {
    id: wire.id,
    staffProfileId: wire.staffProfileId,
    amount: num(wire.amount),
    status: wire.status,
    // Null until Finance disburses — a requested loan has moved no money.
    disbursedAt: wire.disbursedAt,
    journalEntryId: wire.journalEntryId,
    staffName: wire.staffName ?? null,
    reference: wire.reference,
    statusLabel: wire.statusLabel,
    amountRecovered: num(wire.amountRecovered),
    recoveryPeriods: wire.recoveryPeriods,
    outstanding: num(wire.outstanding),
    nextRecovery: num(wire.nextRecovery),
    requestedAt: wire.requestedAt,
    approvedAt: wire.approvedAt,
    closedAt: wire.closedAt,
    rejectionReason: wire.rejectionReason,
    approvedByName: wire.approvedByName ?? null,
  };
}

function toAdvance(wire: StaffAdvanceWire): StaffAdvanceWithName {
  return {
    id: wire.id,
    staffProfileId: wire.staffProfileId,
    amount: num(wire.amount),
    status: wire.status,
    requestedAt: wire.requestedAt,
    approvedBy: wire.approvedBy,
    approvedAt: wire.approvedAt,
    disbursedAt: wire.disbursedAt,
    journalEntryId: wire.journalEntryId,
    staffName: wire.staffName ?? null,
  };
}

function toPerformance(wire: PerformanceWire): PerformanceRecordWithName {
  return {
    id: wire.id,
    staffProfileId: wire.staffProfileId,
    period: wire.period,
    targets: numericMap(wire.targets),
    achieved: numericMap(wire.achieved),
    rating: wire.rating,
    recordedBy: wire.recordedBy,
    staffName: wire.staffName ?? null,
    recordedByName: wire.recordedByName ?? null,
  };
}

export async function getStaffAdvances(status?: string): Promise<StaffAdvanceWithName[]> {
  const wire = await apiData<StaffAdvanceWire[]>("/api/v1/staff/advances", {
    token: await token(),
    query: { status },
  });
  return wire.map(toAdvance);
}

export async function getStaffLoans(filters?: {
  status?: string;
  staffProfileId?: string;
}): Promise<StaffLoanWithName[]> {
  const wire = await apiData<StaffLoanWire[]>("/api/v1/staff/loans", {
    token: await token(),
    query: { status: filters?.status, staff_profile_id: filters?.staffProfileId },
  });
  return wire.map(toStaffLoan);
}

/**
 * §14's lifecycle: request → HR approval → Finance disbursement.
 *
 * §16.8 gives disbursement to Finance and never to HR, enforced by the API on
 * a different permission — not re-checked here.
 */
export async function requestStaffLoanRequest(input: {
  staffProfileId: string;
  amount: number;
  recoveryPeriods: number;
}): Promise<StaffLoanWithName> {
  return toStaffLoan(
    await apiData<StaffLoanWire>("/api/v1/staff/loan/request", {
      method: "POST",
      token: await token(),
      body: input,
    })
  );
}

export async function decideStaffLoanRequest(
  action: "approve" | "reject" | "disburse",
  loanId: string,
  reason?: string
): Promise<StaffLoanWithName> {
  return toStaffLoan(
    await apiData<StaffLoanWire>(`/api/v1/staff/loan/${action}`, {
      method: "POST",
      token: await token(),
      body: { loanId, reason },
    })
  );
}

export async function getPerformanceRecords(period?: string): Promise<PerformanceRecordWithName[]> {
  const wire = await apiData<PerformanceWire[]>("/api/v1/staff/performance", {
    token: await token(),
    query: { period },
  });
  return wire.map(toPerformance);
}

export async function recordPerformanceRequest(input: {
  staffProfileId: string;
  period: string;
  targets: Record<string, number>;
  achieved: Record<string, number>;
  rating?: string | null;
}): Promise<PerformanceRecordWithName> {
  const wire = await apiData<PerformanceWire>("/api/v1/staff/performance", {
    method: "POST",
    token: await token(),
    body: {
      staffProfileId: toId(input.staffProfileId),
      period: input.period,
      targets: input.targets,
      achieved: input.achieved,
      ...(input.rating ? { rating: input.rating } : {}),
    },
  });
  return toPerformance(wire);
}

export async function requestAdvanceRequest(staffProfileId: string, amount: number): Promise<StaffAdvanceWithName> {
  const wire = await apiData<StaffAdvanceWire>("/api/v1/staff/advance/request", {
    method: "POST",
    token: await token(),
    body: { staffProfileId: toId(staffProfileId), amount: amount.toFixed(2) },
  });
  return toAdvance(wire);
}

/** approve / reject are HR's; disburse is Finance's alone (§11). */
async function decideAdvance(path: string, advanceId: string): Promise<StaffAdvanceWithName> {
  const wire = await apiData<StaffAdvanceWire>(`/api/v1/staff/advance/${path}`, {
    method: "POST",
    token: await token(),
    body: { advanceId: toId(advanceId) },
  });
  return toAdvance(wire);
}

export const approveAdvanceRequest = (id: string) => decideAdvance("approve", id);
export const rejectAdvanceRequest = (id: string) => decideAdvance("reject", id);
export const disburseAdvanceRequest = (id: string) => decideAdvance("disburse", id);

// ---------------------------------------------------------------------------
// Payroll
// ---------------------------------------------------------------------------

interface PayrollLineWire {
  id: string;
  payrollRunId: string;
  staffProfileId: string;
  baseSalary: string;
  commissionAmount: string;
  allowancesTotal: string;
  deductionsTotal: string;
  netSalary: string;
  journalEntryId: string | null;
  staffName?: string | null;
  allowances?: { id: string; payrollLineId: string; type: Allowance["type"]; amount: string }[];
  deductions?: { id: string; payrollLineId: string; type: Deduction["type"]; amount: string; referenceId: string | null }[];
}

interface PayrollRunWire {
  id: string;
  period: string;
  status: PayrollRun["status"];
  generatedBy: string;
  finalizedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  generatedByName?: string | null;
  approvedByName?: string | null;
  finalizedByName?: string | null;
  paidByName?: string | null;
  lines?: PayrollLineWire[];
  lineCount?: number;
  netTotal?: string;
}

export interface PayrollLineWithDetail extends PayrollLine {
  staffName: string | null;
  allowances: Allowance[];
  deductions: Deduction[];
}

export interface PayrollRunWithLines extends PayrollRun {
  lines: PayrollLineWithDetail[];
  /** Computed by the API so a total can never disagree with the lines it came from. */
  lineCount: number;
  netTotal: number;

  /**
   * HR's sign-off — §16.1's moment, after which the figures stop being
   * editable. Added in Module 7: before it a draft could be regenerated right
   * up until Finance posted it, so nothing marked the figures as agreed.
   */
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;

  /**
   * The four actors by name.
   *
   * Resolved server-side because /users needs `users.manage`, which the roles
   * that read payroll do not hold — so without these a screen could only print
   * an id, which tells a reader nothing.
   */
  generatedByName: string | null;
  approvedByName: string | null;
  finalizedByName: string | null;
  paidByName: string | null;
}

function toPayrollLine(wire: PayrollLineWire): PayrollLineWithDetail {
  return {
    id: wire.id,
    payrollRunId: wire.payrollRunId,
    staffProfileId: wire.staffProfileId,
    baseSalary: num(wire.baseSalary),
    commissionAmount: num(wire.commissionAmount),
    allowancesTotal: num(wire.allowancesTotal),
    deductionsTotal: num(wire.deductionsTotal),
    netSalary: num(wire.netSalary),
    journalEntryId: wire.journalEntryId,
    staffName: wire.staffName ?? null,
    allowances: (wire.allowances ?? []).map((a) => ({
      id: a.id,
      payrollLineId: a.payrollLineId,
      type: a.type,
      amount: num(a.amount),
    })),
    deductions: (wire.deductions ?? []).map((d) => ({
      id: d.id,
      payrollLineId: d.payrollLineId,
      type: d.type,
      amount: num(d.amount),
      referenceId: d.referenceId,
    })),
  };
}

function toPayrollRun(wire: PayrollRunWire): PayrollRunWithLines {
  const lines = (wire.lines ?? []).map(toPayrollLine);
  return {
    id: wire.id,
    period: wire.period,
    status: wire.status,
    generatedBy: wire.generatedBy,
    finalizedAt: wire.finalizedAt,
    approvedBy: wire.approvedBy ?? null,
    approvedAt: wire.approvedAt ?? null,
    paidAt: wire.paidAt ?? null,
    generatedByName: wire.generatedByName ?? null,
    approvedByName: wire.approvedByName ?? null,
    finalizedByName: wire.finalizedByName ?? null,
    paidByName: wire.paidByName ?? null,
    lines,
    lineCount: wire.lineCount ?? lines.length,
    netTotal: num(wire.netTotal),
  };
}

export async function getPayrollRuns(
  options: { status?: string; page?: number; perPage?: number } = {}
): Promise<{ runs: PayrollRunWithLines[]; pagination?: ApiPagination }> {
  const response = await apiRequest<PayrollRunWire[]>("/api/v1/payroll", {
    token: await token(),
    query: { status: options.status, page: options.page, per_page: options.perPage },
  });
  return { runs: response.data.map(toPayrollRun), pagination: response.meta?.pagination };
}

export async function getAllPayrollRuns(): Promise<PayrollRunWithLines[]> {
  return collectPages(
    async (page, perPage) => {
      const { runs, pagination } = await getPayrollRuns({ page, perPage });
      return { items: runs, pagination };
    },
    { pageLimit: PAGE_LIMIT, perPage: PER_PAGE, label: "getAllPayrollRuns" }
  );
}

/** `show` eager-loads each line's staff, allowances and deductions. */
export async function getPayrollRun(runId: string): Promise<PayrollRunWithLines> {
  const wire = await apiData<PayrollRunWire>(`/api/v1/payroll/${runId}`, { token: await token() });
  return toPayrollRun(wire);
}

/**
 * The payroll screens are addressed by period, which reads better in a URL than
 * a run id — but the API is keyed by id, so the period is resolved against the
 * index first.
 */
export async function getPayrollRunByPeriod(period: string): Promise<PayrollRunWithLines | null> {
  const runs = await getAllPayrollRuns();
  const match = runs.find((r) => r.period === period);
  return match ? getPayrollRun(match.id) : null;
}

export async function generatePayrollRequest(period: string): Promise<PayrollRunWithLines> {
  const wire = await apiData<PayrollRunWire>("/api/v1/payroll/generate", {
    method: "POST",
    token: await token(),
    body: { period },
  });
  return toPayrollRun(wire);
}

/**
 * HR signs the figures off — §16.7.
 *
 * Posts nothing; Finance still does that at finalization. What it does is close
 * the figures, so §16.1's "salary cannot change after approval" has a moment to
 * refer to.
 */
export async function approvePayrollRequest(runId: string): Promise<PayrollRunWithLines> {
  const wire = await apiData<PayrollRunWire>(`/api/v1/payroll/${runId}/approve`, {
    method: "POST",
    token: await token(),
  });
  return toPayrollRun(wire);
}

export async function finalizePayrollRequest(runId: string): Promise<PayrollRunWithLines> {
  const wire = await apiData<PayrollRunWire>(`/api/v1/payroll/${runId}/finalize`, {
    method: "POST",
    token: await token(),
  });
  return toPayrollRun(wire);
}

export async function payPayrollRequest(runId: string): Promise<PayrollRunWithLines> {
  const wire = await apiData<PayrollRunWire>(`/api/v1/payroll/${runId}/pay`, {
    method: "POST",
    token: await token(),
  });
  return toPayrollRun(wire);
}

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

interface CommissionPoolWire {
  id: string;
  branchId: string;
  period: string;
  branchProfit: string;
  lossCarryForward: string;
  hqHoldAmount: string;
  distributableProfit: string;
  poolPercentage: string;
  poolAmount: string;
  distributable: boolean;
  branchName?: string | null;
  distributions?: { id: string; commissionPoolId: string; staffProfileId: string; shareAmount: string; staffName: string | null }[];
}

interface ZoneOverrideWire {
  id: string;
  zoneId: string;
  period: string;
  totalPoolBase: string;
  overridePercentage: string;
  overrideAmount: string;
  journalEntryId: string | null;
  zoneName?: string | null;
}

export interface CommissionDistributionWithName extends CommissionDistribution {
  staffName: string | null;
}

export interface CommissionPoolWithDetail extends CommissionPool {
  /** §11's hard rule, stated by the API so the screen blocks for the same reason the service refuses. */
  distributable: boolean;
  branchName: string | null;
  distributions: CommissionDistributionWithName[];
}

export interface ZoneOverride extends ZoneCommissionDistribution {
  zoneName: string | null;
}

function toPool(wire: CommissionPoolWire): CommissionPoolWithDetail {
  return {
    id: wire.id,
    branchId: wire.branchId,
    period: wire.period,
    branchProfit: num(wire.branchProfit),
    lossCarryForward: num(wire.lossCarryForward),
    hqHoldAmount: num(wire.hqHoldAmount),
    distributableProfit: num(wire.distributableProfit),
    poolPercentage: num(wire.poolPercentage),
    poolAmount: num(wire.poolAmount),
    distributable: wire.distributable,
    branchName: wire.branchName ?? null,
    distributions: (wire.distributions ?? []).map((d) => ({
      id: d.id,
      commissionPoolId: d.commissionPoolId,
      staffProfileId: d.staffProfileId,
      shareAmount: num(d.shareAmount),
      staffName: d.staffName,
    })),
  };
}

function toZoneOverride(wire: ZoneOverrideWire): ZoneOverride {
  return {
    id: wire.id,
    zoneId: wire.zoneId,
    period: wire.period,
    totalPoolBase: num(wire.totalPoolBase),
    overridePercentage: num(wire.overridePercentage),
    overrideAmount: num(wire.overrideAmount),
    journalEntryId: wire.journalEntryId,
    zoneName: wire.zoneName ?? null,
  };
}

export interface CommissionResult {
  pools: CommissionPoolWithDetail[];
  period: string | null;
  totalPool: number;
  /** How many branch pools §11 blocks because the branch made a loss. */
  blockedByLoss: number;
  zoneOverrides: ZoneOverride[];
}

export async function getCommission(period?: string): Promise<CommissionResult> {
  const response = await apiRequest<CommissionPoolWire[]>("/api/v1/commission", {
    token: await token(),
    query: { period },
  });

  const meta = response.meta as
    | { period?: string | null; totalPool?: string; blockedByLoss?: number; zoneOverrides?: ZoneOverrideWire[] }
    | undefined;

  return {
    pools: response.data.map(toPool),
    period: meta?.period ?? null,
    totalPool: num(meta?.totalPool),
    blockedByLoss: meta?.blockedByLoss ?? 0,
    zoneOverrides: (meta?.zoneOverrides ?? []).map(toZoneOverride),
  };
}

export async function getBranchCommission(
  branchId: string,
  period?: string
): Promise<{ pools: CommissionPoolWithDetail[]; branchName: string | null }> {
  const response = await apiRequest<CommissionPoolWire[]>(`/api/v1/commission/branches/${branchId}`, {
    token: await token(),
    query: { period },
  });
  const meta = response.meta as { branchId?: string; branchName?: string } | undefined;
  return { pools: response.data.map(toPool), branchName: meta?.branchName ?? null };
}

export async function generateCommissionRequest(period: string): Promise<CommissionResult> {
  const response = await apiRequest<CommissionPoolWire[]>("/api/v1/commission/generate", {
    method: "POST",
    token: await token(),
    body: { period },
  });

  const meta = response.meta as { period?: string; blockedByLoss?: number } | undefined;

  return {
    pools: response.data.map(toPool),
    period: meta?.period ?? period,
    totalPool: response.data.reduce((sum, p) => sum + num(p.poolAmount), 0),
    blockedByLoss: meta?.blockedByLoss ?? 0,
    zoneOverrides: [],
  };
}

// ---------------------------------------------------------------------------
// Payslips, allowances, deductions and the Staff Fund — Module 7
// ---------------------------------------------------------------------------

/**
 * A payroll line seen from the employee's side — Bank → Payroll, and §17's
 * "Staff Payslip".
 *
 * The same row `PayrollLineWithDetail` describes, with the person attached.
 * Both exist because the two screens ask different questions: a payroll run
 * lists people who are already identified, while a payslip is about one of
 * them, their branch and their bank account.
 */
export interface PayslipRecord {
  id: string;
  payrollRunId: string;
  period: string;
  staffProfileId: string;
  employee: string;
  staffNo: string;
  /** The role. The legacy column says Department; this system has no such entity. */
  department: string | null;
  branch: string | null;
  phone: string | null;
  bankName: string | null;
  accountNumber: string | null;
  paymentMethod: string;
  salary: number;
  commissionAmount: number;
  allowancesTotal: number;
  deductionsTotal: number;
  grossPay: number;
  netSalary: number;
  /** The run's status — a payroll is paid as one act, not per employee. */
  status: PayrollRun["status"];
  paidOn: string | null;
  journalEntryId: string | null;
  allowances: { id: string; label: string; amount: number }[];
  deductions: { id: string; label: string; amount: number; referenceId: string | null }[];
}

interface PayslipWire extends Omit<
  PayslipRecord,
  "salary" | "commissionAmount" | "allowancesTotal" | "deductionsTotal" | "grossPay" | "netSalary" | "allowances" | "deductions"
> {
  salary: string;
  commissionAmount: string;
  allowancesTotal: string;
  deductionsTotal: string;
  grossPay: string;
  netSalary: string;
  allowances: { id: string; label: string; amount: string }[];
  deductions: { id: string; label: string; amount: string; referenceId: string | null }[];
}

function toPayslip(wire: PayslipWire): PayslipRecord {
  return {
    ...wire,
    salary: num(wire.salary),
    commissionAmount: num(wire.commissionAmount),
    allowancesTotal: num(wire.allowancesTotal),
    deductionsTotal: num(wire.deductionsTotal),
    grossPay: num(wire.grossPay),
    netSalary: num(wire.netSalary),
    allowances: wire.allowances.map((a) => ({ ...a, amount: num(a.amount) })),
    deductions: wire.deductions.map((d) => ({ ...d, amount: num(d.amount) })),
  };
}

export interface PayslipList {
  payslips: PayslipRecord[];
  /** The period being shown, and every period that has a run. */
  period: string | null;
  periods: string[];
  totalNet: number;
  totalGross: number;
  totalDeductions: number;
}

/**
 * Defaults to the latest period. A screen whose opening view was every payslip
 * ever issued would be unreadable and would grow without bound.
 */
export async function getPayslips(filters?: {
  period?: string;
  staffProfileId?: string;
  branchId?: string;
}): Promise<PayslipList> {
  const { data, meta } = await apiRequest<PayslipWire[]>("/api/v1/payslips", {
    token: await token(),
    query: {
      period: filters?.period,
      staff_profile_id: filters?.staffProfileId,
      branch_id: filters?.branchId,
    },
  });

  return {
    payslips: data.map(toPayslip),
    period: (meta?.period as string | null) ?? null,
    periods: (meta?.periods as string[]) ?? [],
    totalNet: num(meta?.totalNet as string | undefined),
    totalGross: num(meta?.totalGross as string | undefined),
    totalDeductions: num(meta?.totalDeductions as string | undefined),
  };
}

/** One employee's payment history, newest first. */
export async function getStaffPayslips(
  staffProfileId: string
): Promise<{ payslips: PayslipRecord[]; totalPaid: number }> {
  const { data, meta } = await apiRequest<PayslipWire[]>(
    `/api/v1/staff/${staffProfileId}/payslips`,
    { token: await token() }
  );

  return { payslips: data.map(toPayslip), totalPaid: num(meta?.totalPaid as string | undefined) };
}

/** What an employee is entitled to draw — §10. */
export interface StaffAllowanceRecord {
  id: string;
  staffProfileId: string;
  type: AllowanceType;
  amount: number;
  /** Null means recurring; a period means that month alone. */
  period: string | null;
  recurring: boolean;
  reason: string | null;
  active: boolean;
  createdAt: string | null;
  createdByName: string | null;
}

export async function getStaffAllowances(staffProfileId: string): Promise<StaffAllowanceRecord[]> {
  const wire = await apiData<(Omit<StaffAllowanceRecord, "amount"> & { amount: string })[]>(
    `/api/v1/staff/${staffProfileId}/allowances`,
    { token: await token() }
  );

  return wire.map((a) => ({ ...a, amount: num(a.amount) }));
}

export interface StaffAllowanceInput {
  type: AllowanceType;
  amount: number;
  period?: string | null;
  reason?: string | null;
}

export async function grantStaffAllowanceRequest(
  staffProfileId: string,
  input: StaffAllowanceInput
): Promise<void> {
  await apiData(`/api/v1/staff/${staffProfileId}/allowances`, {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateStaffAllowanceRequest(
  allowanceId: string,
  input: StaffAllowanceInput
): Promise<void> {
  await apiData(`/api/v1/staff-allowances/${allowanceId}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

export async function revokeStaffAllowanceRequest(allowanceId: string): Promise<void> {
  await apiData(`/api/v1/staff-allowances/${allowanceId}`, {
    method: "DELETE",
    token: await token(),
  });
}

/**
 * A penalty withheld from somebody's pay — §11.
 *
 * The only deduction type a person records. Staff fund, loan and advance
 * recoveries are computed by payroll from a rate or a balance, and a
 * hand-entered one would be deducted twice.
 */
export interface StaffDeductionRecord {
  id: string;
  staffProfileId: string;
  type: DeductionType;
  amount: number;
  period: string;
  reason: string;
  createdAt: string | null;
  createdByName: string | null;
}

export async function getStaffDeductions(staffProfileId: string): Promise<StaffDeductionRecord[]> {
  const wire = await apiData<(Omit<StaffDeductionRecord, "amount"> & { amount: string })[]>(
    `/api/v1/staff/${staffProfileId}/deductions`,
    { token: await token() }
  );

  return wire.map((d) => ({ ...d, amount: num(d.amount) }));
}

export async function recordStaffDeductionRequest(
  staffProfileId: string,
  input: { amount: number; period: string; reason: string }
): Promise<void> {
  await apiData(`/api/v1/staff/${staffProfileId}/deductions`, {
    method: "POST",
    token: await token(),
    body: { ...input, type: "penalty" },
  });
}

export async function cancelStaffDeductionRequest(deductionId: string): Promise<void> {
  await apiData(`/api/v1/staff-deductions/${deductionId}`, {
    method: "DELETE",
    token: await token(),
  });
}

/** §12's internal revolving fund. */
export interface StaffFundPosition {
  balance: number;
  contributions: number;
  advancesOutstanding: number;
  loansOutstanding: number;
  lentOut: number;
  memberCount: number;
}

export async function getStaffFund(): Promise<StaffFundPosition> {
  const wire = await apiData<Record<string, string | number>>("/api/v1/staff-fund", {
    token: await token(),
  });

  return {
    balance: num(wire.balance),
    contributions: num(wire.contributions),
    advancesOutstanding: num(wire.advancesOutstanding),
    loansOutstanding: num(wire.loansOutstanding),
    lentOut: num(wire.lentOut),
    memberCount: Number(wire.memberCount ?? 0),
  };
}

/**
 * §2B's four accounts for one employee — Staff Control, Staff Loan, Staff
 * Advance, Staff Deductions.
 *
 * Views over the `staff_profile_id` dimension on journal lines rather than four
 * real chart rows per person, which is how §11 resolves the document's promise
 * that "hakuna pesa ya staff inayoenda nje ya mfumo".
 */
export interface StaffLedgerView {
  code: string;
  name: string;
  balance: number;
}

export async function getStaffLedger(
  staffProfileId: string
): Promise<Record<string, StaffLedgerView>> {
  const wire = await apiData<Record<string, { code: string; name: string; balance: string }>>(
    `/api/v1/staff/${staffProfileId}/ledger`,
    { token: await token() }
  );

  return Object.fromEntries(
    Object.entries(wire).map(([key, view]) => [key, { ...view, balance: num(view.balance) }])
  );
}
