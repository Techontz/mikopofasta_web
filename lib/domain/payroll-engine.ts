import { round2 } from "@/lib/domain/money";
import type { StaffProfile } from "@/types/staff";
import type { AllowanceType } from "@/types/enums";

/** Staff Fund contribution withheld from every salary — backend §11. */
export const STAFF_FUND_CONTRIBUTION_PCT = 0.1;
/** Flat monthly recovery applied against an outstanding staff loan/advance. */
export const RECOVERY_PER_PERIOD = 50_000;

export interface PayrollInputs {
  staff: StaffProfile;
  /** Branch pool share + any zone override already resolved by the commission engine. */
  commissionAmount: number;
  /** True for branch-based operational staff, who also draw a transport allowance. */
  isBranchBased: boolean;
  hasActiveLoan: boolean;
  hasOutstandingAdvance: boolean;
}

export interface PayrollComputation {
  baseSalary: number;
  commissionAmount: number;
  allowances: { type: AllowanceType; amount: number }[];
  allowancesTotal: number;
  deductions: { type: "staff_fund" | "loan" | "advance"; amount: number }[];
  deductionsTotal: number;
  netSalary: number;
}

/**
 * The single payroll computation — used by both the seed and the runtime
 * `generatePayroll` action so a generated run can never disagree with the
 * seeded one. Pure: no ledger posting, no mutation (backend §11 — HR
 * generates, Finance finalizes; only finalization touches the ledger).
 */
export function computePayrollLine(input: PayrollInputs): PayrollComputation {
  const { staff, commissionAmount, isBranchBased, hasActiveLoan, hasOutstandingAdvance } = input;

  const allowances: { type: AllowanceType; amount: number }[] = isBranchBased
    ? [
        { type: "transport", amount: 50_000 },
        { type: "airtime", amount: 20_000 },
      ]
    : [{ type: "airtime", amount: 20_000 }];
  const allowancesTotal = round2(allowances.reduce((s, a) => s + a.amount, 0));

  const deductions: { type: "staff_fund" | "loan" | "advance"; amount: number }[] = [
    { type: "staff_fund", amount: round2(staff.baseSalary * STAFF_FUND_CONTRIBUTION_PCT) },
  ];
  if (hasActiveLoan) deductions.push({ type: "loan", amount: RECOVERY_PER_PERIOD });
  if (hasOutstandingAdvance) deductions.push({ type: "advance", amount: RECOVERY_PER_PERIOD });
  const deductionsTotal = round2(deductions.reduce((s, d) => s + d.amount, 0));

  return {
    baseSalary: staff.baseSalary,
    commissionAmount: round2(commissionAmount),
    allowances,
    allowancesTotal,
    deductions,
    deductionsTotal,
    netSalary: round2(staff.baseSalary + commissionAmount + allowancesTotal - deductionsTotal),
  };
}

/** HQ-based roles don't draw a branch transport allowance. */
const NON_BRANCH_ROLES = ["super_admin", "admin", "finance", "hr", "auditor"];

export function isBranchBasedRole(role: string, branchId: string | null): boolean {
  return branchId !== null && !NON_BRANCH_ROLES.includes(role);
}

// ---------------------------------------------------------------------------
// Commission engine — backend §11
// ---------------------------------------------------------------------------

export const HQ_HOLD_PCT = 0.02;
export const POOL_PCT = 0.2;
export const ZONE_OVERRIDE_PCT = 0.05;

export interface PoolComputation {
  branchProfit: number;
  lossCarryForward: number;
  hqHoldAmount: number;
  distributableProfit: number;
  poolPercentage: number;
  poolAmount: number;
  /** §11 hard rule: no distribution while distributable profit is not positive. */
  distributable: boolean;
}

export function computeCommissionPool(branchProfit: number, lossCarryForward: number): PoolComputation {
  const hqHoldAmount = round2(branchProfit * HQ_HOLD_PCT);
  const distributableProfit = round2(branchProfit - lossCarryForward - hqHoldAmount);
  const distributable = distributableProfit > 0;
  return {
    branchProfit,
    lossCarryForward,
    hqHoldAmount,
    distributableProfit,
    poolPercentage: POOL_PCT * 100,
    poolAmount: round2(Math.max(0, distributableProfit) * POOL_PCT),
    distributable,
  };
}

/** Each eligible staff member's share is weighted by their base-salary share. */
export function distributePool(
  poolAmount: number,
  eligible: { id: string; baseSalary: number }[]
): { staffProfileId: string; shareAmount: number }[] {
  const totalBase = eligible.reduce((s, e) => s + e.baseSalary, 0);
  if (totalBase === 0) return [];
  return eligible.map((e) => ({
    staffProfileId: e.id,
    shareAmount: round2(poolAmount * (e.baseSalary / totalBase)),
  }));
}
