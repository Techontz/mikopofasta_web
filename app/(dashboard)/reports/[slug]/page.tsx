import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getBranches } from "@/lib/api/organization";
import { getReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/errors";
import { ReportFiltersBar } from "@/features/reports/report-filters";
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

  let payload;
  try {
    payload = await getReport(slug, requested);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { report, result, generatedAt, filtersApplied } = payload;

  const seesAllBranches = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const branches = (await getBranches().catch(() => []))
    .filter((b) => b.deletedAt === null && (seesAllBranches || b.id === user.branchId))
    .map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={report.title} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reports"><ArrowLeft className="size-4" />All Reports</Link>} />

      <div>
        <h1>{report.title}</h1>
        <p className="text-sm text-muted-foreground">{report.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Loading filters…</p>}>
            <ReportFiltersBar supported={report.filters} branches={branches} />
          </Suspense>
          {!seesAllBranches && report.filters.includes("branchId") && (
            <p className="text-xs text-muted-foreground">Scoped to your branch — you don&apos;t hold cross-branch visibility.</p>
          )}
        </CardContent>
      </Card>

      {result.summary && result.summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {result.summary.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-tabular text-2xl font-semibold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{report.title} ({result.rows.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTable result={result} />
        </CardContent>
      </Card>

      {result.reconciliation && (
        <div className="flex gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <ScrollText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-foreground">How this ties back</p>
            <p>{result.reconciliation}</p>
          </div>
        </div>
      )}

      {/* meta.generated_at / filters_applied from the §15.6 envelope, surfaced so
          a figure on screen is traceable to a specific computation — and both
          are now the server's own values rather than this page's account of
          what it asked for. */}
      <p className="text-xs text-muted-foreground">
        Generated {new Date(generatedAt).toLocaleString()} · filters applied:{" "}
        {Object.keys(filtersApplied).length === 0 ? "none" : JSON.stringify(filtersApplied)}
        {!seesAllBranches && report.filters.includes("branchId") && " (branch forced by your permissions)"}
      </p>
    </div>
  );
}
