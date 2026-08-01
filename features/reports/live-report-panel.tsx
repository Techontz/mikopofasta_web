import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { SettingsCard, StatCard } from "@/components/settings";
import { getReport } from "@/lib/api/reports";
import { ReportControls } from "@/features/reports/report-controls";
import { ReportTable } from "@/features/reports/report-table";
import type { ReportFilters } from "@/lib/domain/reports/types";

/**
 * A named legacy report screen, served by a real report.
 *
 * The thirteen Report screens were transcriptions: their columns came off
 * screenshots and their rows came from `lib/legacy/report-source.ts` — mostly
 * zero, because most of them were captured empty. Each is now the API report
 * that answers the same question.
 *
 * ## Why they are not just links to /reports/{slug}
 *
 * Because the legacy sidebar has these entries and people will look for them
 * there. What changes is the data, not the navigation: the screen keeps its
 * name, its place and its breadcrumb, and gains the live figures, the search,
 * the sorting, the paging and the CSV/XLSX/PDF export the generic report screen
 * already has.
 *
 * ## Why the columns changed
 *
 * They are the report's now. A legacy column the API cannot fill would be empty
 * for ever, which reads as missing data rather than as a decision — the same
 * reasoning the loan queues followed. Where a legacy screen asked a question no
 * report answers, the page says so rather than drawing headers over nothing.
 */
export async function LiveReportPanel({
  slug,
  filters = {},
  searchParams = {},
  note,
}: {
  slug: string;
  /** Defaults the screen imposes — a date window, a branch. */
  filters?: ReportFilters;
  /** The URL's own query, so search/sort/paging survive a reload. */
  searchParams?: Record<string, string | undefined>;
  /** Shown above the table when this screen is not a plain rendering. */
  note?: string;
}) {
  const merged: ReportFilters = {
    branchId: searchParams.branch_id ?? filters.branchId,
    period: searchParams.period ?? filters.period,
    from: searchParams.from ?? filters.from,
    to: searchParams.to ?? filters.to,
  };

  const presentation = {
    search: searchParams.search,
    sort: searchParams.sort,
    direction: searchParams.direction === "desc" ? ("desc" as const) : undefined,
    page: searchParams.page ? Number(searchParams.page) : undefined,
    perPage: searchParams.per_page ? Number(searchParams.per_page) : undefined,
  };

  const { report, result, generatedAt, pagination, matchedRows, totalRows } = await getReport(
    slug,
    merged,
    presentation
  );

  return (
    <div className="space-y-4">
      {note && (
        <div
          className="flex items-start gap-2 rounded-[var(--st-radius-sm)] border px-4 py-3 text-[13px] text-[var(--st-ink-soft)]"
          style={{ borderColor: "var(--st-line-strong)", background: "var(--st-subtle)" }}
        >
          <ScrollText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{note}</p>
        </div>
      )}

      {result.summary && result.summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {result.summary.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      <SettingsCard title={`${report.title} (${result.rows.length})`} bodyClassName="pt-0 sm:pt-0">
        <div className="space-y-3">
          <Suspense fallback={<p className="text-[13px] text-[var(--st-ink-soft)]">Loading controls…</p>}>
            <ReportControls
              slug={report.slug}
              pagination={pagination}
              matchedRows={matchedRows}
              totalRows={totalRows}
              rowCount={result.rows.length}
            />
          </Suspense>
          <ReportTable result={result} sortable={report.sortable} />
        </div>
      </SettingsCard>

      {result.reconciliation && (
        <div
          className="flex gap-2 rounded-[var(--st-radius-sm)] border px-4 py-3 text-[13px] text-[var(--st-ink-soft)]"
          style={{ borderColor: "var(--st-line-strong)", background: "var(--st-subtle)" }}
        >
          <ScrollText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-[var(--st-ink)]">How this ties back</p>
            <p>{result.reconciliation}</p>
          </div>
        </div>
      )}

      {/* §15.6's traceability rule: a figure on screen names the computation
          it came from. */}
      <p className="text-[12px] text-[var(--st-ink-faint)]">
        Generated {new Date(generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
