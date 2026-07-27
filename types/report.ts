import { z } from "zod";
import { DPD_BUCKETS, PERFORMANCE_RATINGS } from "@/types/enums";

/** Recomputed by a queued job — never a source of truth (backend §2.10). */
export const CustomerRiskScoreSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  rating: z.enum(PERFORMANCE_RATINGS),
  avgDelayDays: z.number().nonnegative(),
  onTimePct: z.number().min(0).max(100),
  latePct: z.number().min(0).max(100),
  computedAt: z.string(),
});
export type CustomerRiskScore = z.infer<typeof CustomerRiskScoreSchema>;

/** DPD buckets — backend §"Repayment Behavior Report": 0 / 1-7 / 8-30 / 30+ days. */
export function dpdBucket(daysDelayed: number): (typeof DPD_BUCKETS)[number] {
  if (daysDelayed <= 0) return "on_time";
  if (daysDelayed <= 7) return "slight_delay";
  if (daysDelayed <= 30) return "risk";
  return "default";
}

/** Shared query params every GET /reports/* endpoint accepts (backend §15.6). */
export const ReportFilterSchema = z.object({
  branchId: z.string().optional(),
  period: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ReportFilter = z.infer<typeof ReportFilterSchema>;

export interface ReportMeta {
  generatedAt: string;
  filtersApplied: ReportFilter;
}
