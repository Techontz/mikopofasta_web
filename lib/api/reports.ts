import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import { formatMoney } from "@/lib/domain/money";
import type {
  ReportColumn,
  ReportFilters,
  ReportResult,
  ReportRow,
  ReportSummary,
} from "@/lib/domain/reports/types";

/**
 * Reports — backend §15.6.
 *
 * Read-only, all of them, behind the single `reports.view` grant. What a user
 * may see is decided by branch scope (§13) rather than by a per-report
 * permission: a Loan Officer and the Finance Director call the same endpoint,
 * and the officer's results are pinned to their own branch *by the API*. That
 * is why nothing here re-applies a branch filter — doing so locally could only
 * ever narrow a result the server already decided, or contradict it.
 *
 * The catalogue is the source of truth for which reports exist. It comes from
 * the same registry that serves them, so the list can never drift from the
 * implementations behind it.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

function toId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export type ReportGroup = "Portfolio" | "Collections" | "Financial" | "Branch" | "HR" | "Compliance";
export type ReportFilterName = "branchId" | "period" | "from" | "to";

export interface ReportCatalogueEntry {
  slug: string;
  title: string;
  description: string;
  group: ReportGroup;
  /** Which of the standard filters this report actually honours. */
  filters: ReportFilterName[];
}

export async function getReportCatalogue(): Promise<ReportCatalogueEntry[]> {
  return apiData<ReportCatalogueEntry[]>("/api/v1/reports", { token: await token() });
}

/** The catalogue arranged for the index page, in the API's own group order. */
export async function getReportsByGroup(): Promise<{ group: ReportGroup; reports: ReportCatalogueEntry[] }[]> {
  const catalogue = await getReportCatalogue();
  const groups: { group: ReportGroup; reports: ReportCatalogueEntry[] }[] = [];

  for (const report of catalogue) {
    const existing = groups.find((g) => g.group === report.group);
    if (existing) existing.reports.push(report);
    else groups.push({ group: report.group, reports: [report] });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// A single report
// ---------------------------------------------------------------------------

interface ReportMetaWire {
  generated_at: string;
  filters_applied: Record<string, string>;
  report: { slug: string; title: string; description: string; group: ReportGroup; filters: ReportFilterName[] };
  columns: ReportColumn[];
  totals?: Record<string, string | number | null>;
  summary?: { label: string; value: string }[];
  emptyMessage?: string;
  reconciliation?: string;
  rowCount?: number;
}

export interface ReportPayload {
  report: ReportCatalogueEntry;
  result: ReportResult;
  generatedAt: string;
  /** Echoed by the API in its own wire names, including any branch it forced. */
  filtersApplied: Record<string, string>;
}

/**
 * A money value on the wire is a decimal string, because that is how it
 * survives a database DECIMAL without a float touching it. The table renders a
 * figure only when it is a number, so the cells the API *marks* as money or
 * percent are converted here — driven by the column metadata rather than by
 * guessing at the shape of a value.
 */
function coerceRow(row: Record<string, unknown>, numericKeys: Set<string>): ReportRow {
  const out: ReportRow = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
      continue;
    }
    if (numericKeys.has(key) && typeof value === "string" && value !== "") {
      const parsed = Number(value);
      out[key] = Number.isFinite(parsed) ? parsed : value;
      continue;
    }
    out[key] = typeof value === "number" || typeof value === "string" ? value : String(value);
  }

  return out;
}

/**
 * Summary values arrive raw: "4516666.65" for an amount, "35" for a count,
 * "Yes" for a verdict. Only the first of those is money, and a decimal string
 * with exactly two places is what distinguishes it — counts carry no decimal
 * point and verdicts are not numeric at all. Formatting the wrong one would
 * turn a headcount into a currency figure.
 */
const MONEY_VALUE = /^-?\d+\.\d{2}$/;

function formatSummary(summary: { label: string; value: string }[]): ReportSummary[] {
  return summary.map(({ label, value }) => ({
    label,
    value: MONEY_VALUE.test(value) ? formatMoney(Number(value)) : value,
  }));
}

export async function getReport(slug: string, filters: ReportFilters = {}): Promise<ReportPayload> {
  const response = await apiRequest<Record<string, unknown>[]>(`/api/v1/reports/${slug}`, {
    token: await token(),
    query: {
      branch_id: toId(filters.branchId) ?? undefined,
      period: filters.period,
      from: filters.from,
      to: filters.to,
    },
  });

  const meta = response.meta as unknown as ReportMetaWire;
  const columns = meta.columns ?? [];
  const numericKeys = new Set(columns.filter((c) => c.money || c.percent).map((c) => c.key));

  return {
    report: meta.report,
    generatedAt: meta.generated_at,
    filtersApplied: meta.filters_applied ?? {},
    result: {
      columns,
      rows: response.data.map((row) => coerceRow(row, numericKeys)),
      totals: meta.totals ? coerceRow(meta.totals, numericKeys) : undefined,
      summary: meta.summary ? formatSummary(meta.summary) : undefined,
      emptyMessage: meta.emptyMessage,
      reconciliation: meta.reconciliation,
    },
  };
}
