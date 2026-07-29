import { round2 } from "@/lib/domain/money";

/*
 * What is left of the frontend's §11 engine.
 *
 * The payroll half is gone. `computePayrollLine` computed a payslip — base
 * salary, the transport allowance branch-based staff draw, the Staff Fund
 * withholding, and loan and advance recovery — and `generatePayroll` then
 * turned it into rows. `POST /payroll/generate` now does all of it, inside the
 * same transaction as the run it creates, so a second implementation here
 * could only ever produce a payslip the books disagree with.
 *
 * The commission-pool helpers below stay for one reason: lib/mock-data
 * /commission.ts seeds itself with them, and Reports still reads that seed.
 * They go when Reports is integrated.
 */

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
