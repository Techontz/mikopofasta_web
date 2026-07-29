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
  const all: StaffListItem[] = [];
  let page = 1;

  for (;;) {
    const { staff, pagination } = await getStaff({ ...filters, page, perPage: PER_PAGE });
    all.push(...staff);

    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage) break;

    if (page >= PAGE_LIMIT) {
      console.warn(`getAllStaff stopped at ${PAGE_LIMIT} pages (${all.length} of ${pagination?.total ?? "?"} staff).`);
      break;
    }

    page += 1;
  }

  return all;
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
  disbursedAt: string;
  journalEntryId: string;
  staffName?: string | null;
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
}

export interface StaffLoanWithName extends StaffLoan {
  staffName: string | null;
}
export interface StaffAdvanceWithName extends StaffAdvance {
  staffName: string | null;
}
export interface PerformanceRecordWithName extends StaffPerformanceRecord {
  staffName: string | null;
}

function toStaffLoan(wire: StaffLoanWire): StaffLoanWithName {
  return {
    id: wire.id,
    staffProfileId: wire.staffProfileId,
    amount: num(wire.amount),
    status: wire.status,
    disbursedAt: wire.disbursedAt,
    journalEntryId: wire.journalEntryId,
    staffName: wire.staffName ?? null,
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
  };
}

export async function getStaffAdvances(status?: string): Promise<StaffAdvanceWithName[]> {
  const wire = await apiData<StaffAdvanceWire[]>("/api/v1/staff/advances", {
    token: await token(),
    query: { status },
  });
  return wire.map(toAdvance);
}

export async function getStaffLoans(): Promise<StaffLoanWithName[]> {
  const wire = await apiData<StaffLoanWire[]>("/api/v1/staff/loans", { token: await token() });
  return wire.map(toStaffLoan);
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
  const all: PayrollRunWithLines[] = [];
  let page = 1;

  for (;;) {
    const { runs, pagination } = await getPayrollRuns({ page, perPage: PER_PAGE });
    all.push(...runs);
    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage || page >= PAGE_LIMIT) break;
    page += 1;
  }

  return all;
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
