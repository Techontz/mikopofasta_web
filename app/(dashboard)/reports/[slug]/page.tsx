import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ScrollText } from "lucide-react";
import { PageHeader, SettingsCard, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getBranches } from "@/lib/api/organization";
import { getReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/errors";
import { ReportFiltersBar } from "@/features/reports/report-filters";
import { ReportControls } from "@/features/reports/report-controls";
import { ReportTable } from "@/features/reports/report-table";
import type { ReportFilters } from "@/lib/domain/reports/types";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  const single = (key: string) => {
    const v = query[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  /*
   * Every filter in the query string is passed through as-is. Two things that
   * used to happen here no longer do, because the API owns them:
   *
   *   - Discarding a filter the report does not declare. The server drops it,
   *     and the echoed `filters_applied` shows exactly what survived.
   *   - Pinning the branch for a user without cross-branch visibility (§13).
   *     The server forces it, so asking for another branch cannot widen the
   *     result — and the echo below reports the branch it actually used.
   */
  const requested: ReportFilters = {
    branchId: single("branch_id"),
    period: single("period"),
    from: single("from"),
    to: single("to"),
  };

  /*
   * Presentation, kept apart from the filters above. These decide which of the
   * computed rows are shown and in what order; the filters decide what the
   * figures are. The API keeps the same separation — only the filters appear in
   * `filters_applied`, so nothing tells a reader that sorting moved a total.
   */
  const presentation = {
    search: single("search"),
    sort: single("sort"),
    direction: single("direction") === "desc" ? ("desc" as const) : undefined,
    page: single("page") ? Number(single("page")) : undefined,
    perPage: single("per_page") ? Number(single("per_page")) : undefined,
  };

  /* The branch list does not depend on the report, so it is asked for at the
     same time rather than after it. `catch` is attached here rather than at
     the await so an early notFound() below cannot leave it unhandled. */
  const branchesRequest = getBranches().catch(() => []);

  let payload;
  try {
    payload = await getReport(slug, requested, presentation);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { report, result, generatedAt, filtersApplied, pagination, matchedRows, totalRows, sortIgnored } =
    payload;

  const seesAllBranches = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const branches = (await branchesRequest)
    .filter((b) => b.deletedAt === null && (seesAllBranches || b.id === user.branchId))
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <BreadcrumbLabel label={report.title} />
      <PageHeader
        icon={ScrollText}
        title={report.title}
        description={report.description}
        breadcrumb={[{ label: "Report", href: "/reports" }, { label: report.title }]}
        actions={
          <Link href="/reports" className="st-btn st-btn-secondary">
            <ArrowLeft className="size-4" strokeWidth={1.9} aria-hidden />
            All Reports
          </Link>
        }
      />
      <SectionNav items={reportNavFor(user)} />

      <SettingsCard title="Filters">
        <div className="space-y-3">
          <Suspense fallback={<p className="text-[14px] text-[var(--st-ink-soft)]">Loading filters…</p>}>
            <ReportFiltersBar supported={report.filters} branches={branches} />
          </Suspense>
          {!seesAllBranches && report.filters.includes("branchId") && (
            <p className="text-[13px] text-[var(--st-ink-soft)]">Scoped to your branch — you don&apos;t hold cross-branch visibility.</p>
          )}
        </div>
      </SettingsCard>

      {result.summary && result.summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {result.summary.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      )}

      <SettingsCard title={`${report.title} (${result.rows.length})`} bodyClassName="pt-0 sm:pt-0">
        <div className="space-y-3">
          <Suspense fallback={<p className="text-[14px] text-[var(--st-ink-soft)]">Loading controls…</p>}>
            <ReportControls
              slug={report.slug}
              pagination={pagination}
              matchedRows={matchedRows}
              totalRows={totalRows}
              rowCount={result.rows.length}
            />
          </Suspense>

          {sortIgnored && (
            /* Surfaced rather than swallowed: the reader believes the order
               means something, and an unsorted list reads as wrong data. */
            <p className="text-[13px] text-[var(--st-warning-ink,var(--st-ink-soft))]">
              This report has no “{sortIgnored}” column, so the rows are in their natural order.
            </p>
          )}

          <ReportTable result={result} sortable={report.sortable} />
        </div>
      </SettingsCard>

      {result.reconciliation && (
        <div
          className="flex gap-2 rounded-[var(--st-radius-sm)] border px-4 py-3 text-[14px] text-[var(--st-ink-soft)]"
          style={{ borderColor: "var(--st-line-strong)", background: "var(--st-subtle)" }}
        >
          <ScrollText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-[var(--st-ink)]">How this ties back</p>
            <p>{result.reconciliation}</p>
          </div>
        </div>
      )}

      {/* meta.generated_at / filters_applied from the §15.6 envelope, surfaced so
          a figure on screen is traceable to a specific computation — and both
          are now the server's own values rather than this page's account of
          what it asked for. */}
      <p className="text-[12.5px] text-[var(--st-ink-faint)]">
        Generated {new Date(generatedAt).toLocaleString()} · filters applied:{" "}
        {Object.keys(filtersApplied).length === 0 ? "none" : JSON.stringify(filtersApplied)}
        {!seesAllBranches && report.filters.includes("branchId") && " (branch forced by your permissions)"}
      </p>
    </>
  );
}
