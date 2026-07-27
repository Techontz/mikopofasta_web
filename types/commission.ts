import { z } from "zod";

/**
 * Branch-performance-based, never individual-sales-based — backend §11.
 * distributableProfit = branchProfit - lossCarryForward - hqHoldAmount,
 * and commission cannot be created while distributableProfit <= 0.
 */
export const CommissionPoolSchema = z.object({
  id: z.string(),
  branchId: z.string(),
  period: z.string(),
  branchProfit: z.number(),
  lossCarryForward: z.number().nonnegative(),
  hqHoldAmount: z.number().nonnegative(),
  distributableProfit: z.number(),
  poolPercentage: z.number().nonnegative(),
  poolAmount: z.number().nonnegative(),
});
export type CommissionPool = z.infer<typeof CommissionPoolSchema>;

/** Distributed per staff, weighted by base-salary share (backend §11). */
export const CommissionDistributionSchema = z.object({
  id: z.string(),
  commissionPoolId: z.string(),
  staffProfileId: z.string(),
  shareAmount: z.number().nonnegative(),
});
export type CommissionDistribution = z.infer<typeof CommissionDistributionSchema>;

export const ZoneCommissionDistributionSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  period: z.string(),
  totalPoolBase: z.number().nonnegative(),
  overridePercentage: z.number().nonnegative(),
  overrideAmount: z.number().nonnegative(),
  journalEntryId: z.string(),
});
export type ZoneCommissionDistribution = z.infer<typeof ZoneCommissionDistributionSchema>;
