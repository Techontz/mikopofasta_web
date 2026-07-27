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
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { findReport } from "@/lib/domain/reports/registry";
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

  const report = findReport(slug);
  if (!report) notFound();

  const user = await getCurrentUser();
  if (!user || !hasPermission(user, report.permission)) return <AccessDeniedState />;

  const single = (key: string) => {
    const v = query[key];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  // Only honour the filters this report declares — an unsupported param is
  // ignored rather than silently changing the result.
  const requested: ReportFilters = {
    branchId: report.filters.includes("branchId") ? single("branch_id") : undefined,
    period: report.filters.includes("period") ? single("period") : undefined,
    from: report.filters.includes("from") ? single("from") : undefined,
    to: report.filters.includes("to") ? single("to") : undefined,
  };
  const filtersApplied = Object.fromEntries(Object.entries(requested).filter(([, v]) => v !== undefined)) as ReportFilters;

  // meta.filters_applied echoes the wire names from §15.6, not our internal
  // camelCase keys, so what is displayed matches what the API contract uses.
  const WIRE_NAMES: Record<string, string> = { branchId: "branch_id", period: "period", from: "from", to: "to" };
  const filtersAppliedWire = Object.fromEntries(
    Object.entries(filtersApplied).map(([k, v]) => [WIRE_NAMES[k] ?? k, v])
  );

  // Branch scoping — a user without BRANCHES_VIEW_ALL only ever sees their own
  // branch, regardless of what the query string asks for (backend §13).
  const seesAllBranches = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const effective: ReportFilters =
    seesAllBranches || !report.filters.includes("branchId")
      ? filtersApplied
      : { ...filtersApplied, branchId: user.branchId ?? undefined };

  const result = report.compute(effective);
  const generatedAt = new Date();

  const branches = MOCK_BRANCHES.filter((b) => b.deletedAt === null && (seesAllBranches || b.id === user.branchId)).map((b) => ({
    id: b.id,
    name: b.name,
  }));

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
          a figure on screen is traceable to a specific computation. */}
      <p className="text-xs text-muted-foreground">
        Generated {generatedAt.toLocaleString()} · filters applied:{" "}
        {Object.keys(filtersAppliedWire).length === 0 ? "none" : JSON.stringify(filtersAppliedWire)}
        {!seesAllBranches && report.filters.includes("branchId") && " (branch forced by your permissions)"}
      </p>
    </div>
  );
}
