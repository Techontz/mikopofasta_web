import {
  portfolioReport,
  arrearsReport,
  ageAnalysisReport,
  repaymentBehaviorReport,
  segmentationReport,
  recoveryReport,
} from "@/lib/domain/reports/portfolio-reports";
import {
  financialStatementsReport,
  cashflowReport,
  hqCashflowReport,
  branchPnlReport,
  branchRankingReport,
  branchEfficiencyReport,
  reversalsReport,
} from "@/lib/domain/reports/financial-reports";
import {
  repaymentReport,
  dailyCollectionReport,
  dailyDisbursementReport,
  suspenseReport,
  auditTrailReport,
  payrollReport,
  commissionReport,
  zoneCommissionReport,
} from "@/lib/domain/reports/operations-reports";
import type { ReportDefinition, ReportEnvelope, ReportFilters } from "@/lib/domain/reports/types";

/** The 21 reports named in backend §15.6 — no more, no fewer. */
export const REPORTS: ReportDefinition[] = [
  portfolioReport,
  repaymentReport,
  arrearsReport,
  recoveryReport,
  cashflowReport,
  branchPnlReport,
  branchEfficiencyReport,
  hqCashflowReport,
  payrollReport,
  commissionReport,
  zoneCommissionReport,
  financialStatementsReport,
  auditTrailReport,
  suspenseReport,
  reversalsReport,
  dailyCollectionReport,
  dailyDisbursementReport,
  branchRankingReport,
  segmentationReport,
  ageAnalysisReport,
  repaymentBehaviorReport,
];

export function findReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}

export const REPORT_GROUPS = ["Portfolio", "Collections", "Financial", "Branch", "HR", "Compliance"] as const;

export function reportsByGroup(): { group: string; reports: ReportDefinition[] }[] {
  return REPORT_GROUPS.map((group) => ({ group, reports: REPORTS.filter((r) => r.group === group) })).filter(
    (g) => g.reports.length > 0
  );
}

/** Preserves backend §15.6's `{ data, meta }` envelope so the shape is portable. */
export function runReport(slug: string, filters: ReportFilters): ReportEnvelope | undefined {
  const report = findReport(slug);
  if (!report) return undefined;
  const result = report.compute(filters);
  return {
    data: result.rows,
    meta: { generatedAt: new Date().toISOString(), filtersApplied: filters },
  };
}
