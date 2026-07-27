import type { Permission } from "@/types/auth";

/**
 * Reports are read-models over the operational arrays — there is no parallel
 * reporting store and no report-only seed data (frontend spec F-3). Every
 * figure below is recomputed from the same source the module screens use, so
 * a report can never disagree with the screen it summarises.
 */

/** Mirrors the `?branch_id=&period=&from=&to=` contract in backend §15.6. */
export interface ReportFilters {
  branchId?: string;
  period?: string;
  from?: string;
  to?: string;
}

export type CellAlign = "left" | "right";

export interface ReportColumn {
  key: string;
  label: string;
  align?: CellAlign;
  /** Render as currency; the value must be a number. */
  money?: boolean;
  /** Render as a percentage; the value must be a number. */
  percent?: boolean;
}

export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportSummary {
  label: string;
  value: string;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Optional footer row of totals, keyed the same way as `rows`. */
  totals?: ReportRow;
  /** Headline figures rendered above the table. */
  summary?: ReportSummary[];
  /** Shown when the report is empty, tailored per report. */
  emptyMessage?: string;
  /**
   * How this report's figures tie back to the ledger, when they should.
   * Rendered so an auditor can see the provenance rather than trusting it.
   */
  reconciliation?: string;
}

export interface ReportDefinition {
  slug: string;
  title: string;
  description: string;
  group: "Portfolio" | "Collections" | "Financial" | "Branch" | "HR" | "Compliance";
  permission: Permission;
  /** Which of the standard filters this report actually honours. */
  filters: ("branchId" | "period" | "from" | "to")[];
  compute: (filters: ReportFilters) => ReportResult;
}

