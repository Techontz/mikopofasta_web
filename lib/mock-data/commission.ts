import type { CommissionPool, CommissionDistribution } from "@/types/commission";
import { round2 } from "@/lib/domain/money";
import { computeCommissionPool, distributePool } from "@/lib/domain/payroll-engine";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";

const PERIOD = "2026-06";

/**
 * Pure data — no ledger posting here. lib/mock-data/payroll.ts is what
 * actually posts commission through the ledger, folding each staff
 * member's share (and, for the zone manager, their override too) into
 * their single payroll journal entry rather than double-posting the same
 * money via a separate pool-level entry.
 */
const BRANCH_PROFIT: Record<string, { profit: number; lossCarryForward: number }> = {
  "br-kakonko": { profit: 1_200_000, lossCarryForward: 0 },
  "br-missenyi": { profit: 900_000, lossCarryForward: 0 },
  "br-lindi": { profit: 600_000, lossCarryForward: 100_000 },
  // Still working off a prior loss — exercises §11's hard rule that no
  // commission may be created while distributable profit is not positive.
  "br-kalenge": { profit: 150_000, lossCarryForward: 400_000 },
};

export const MOCK_COMMISSION_POOLS: CommissionPool[] = Object.entries(BRANCH_PROFIT).map(([branchId, { profit, lossCarryForward }], i) => {
  // §11 pool maths lives in the domain engine — the seed must not restate it.
  const computed = computeCommissionPool(profit, lossCarryForward);
  return {
    id: `cpool-${i + 1}`,
    branchId,
    period: PERIOD,
    branchProfit: computed.branchProfit,
    lossCarryForward: computed.lossCarryForward,
    hqHoldAmount: computed.hqHoldAmount,
    distributableProfit: computed.distributableProfit,
    poolPercentage: computed.poolPercentage,
    poolAmount: computed.poolAmount,
  };
});

export const MOCK_COMMISSION_DISTRIBUTIONS: CommissionDistribution[] = [];
let distSeq = 0;
for (const pool of MOCK_COMMISSION_POOLS) {
  const eligibleStaff = MOCK_STAFF_PROFILES.filter((s) => s.branchId === pool.branchId && s.commissionEligible);
  for (const share of distributePool(pool.poolAmount, eligibleStaff)) {
    distSeq++;
    MOCK_COMMISSION_DISTRIBUTIONS.push({
      id: `cdist-${distSeq}`,
      commissionPoolId: pool.id,
      staffProfileId: share.staffProfileId,
      shareAmount: share.shareAmount,
    });
  }
}

/** Zone-West override: 5% of the total pool base of the branches Hamisi Ally oversees. */
export const ZONE_OVERRIDE_PCT = 0.05;
export const ZONE_WEST_POOL_BASE = round2(
  MOCK_COMMISSION_POOLS.filter((p) => ["br-kakonko", "br-missenyi"].includes(p.branchId)).reduce((sum, p) => sum + p.poolAmount, 0)
);
export const ZONE_WEST_OVERRIDE_AMOUNT = round2(ZONE_WEST_POOL_BASE * ZONE_OVERRIDE_PCT);
export const COMMISSION_PERIOD = PERIOD;
