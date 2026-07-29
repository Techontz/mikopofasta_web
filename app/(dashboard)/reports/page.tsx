import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getReportsByGroup } from "@/lib/api/reports";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.REPORTS_VIEW)) return <AccessDeniedState />;

  /*
   * The catalogue comes from the same registry that serves the reports, so this
   * list can never drift from what actually exists. There is no per-report
   * permission to filter on either: §15.6 puts every report behind the single
   * `reports.view` grant and decides what a caller may *see* by branch scope.
   */
  const groups = await getReportsByGroup();
  const total = groups.reduce((s, g) => s + g.reports.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1>Reports</h1>
        <p className="text-sm text-muted-foreground">
          {total} reports, every one computed from the same records the operational modules use — no separate reporting store.
        </p>
      </div>

      {groups
        .filter((g) => g.reports.length > 0)
        .map((group) => (
          <Card key={group.group}>
            <CardHeader>
              <CardTitle className="text-base">{group.group}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.reports.map((report) => (
                  <li key={report.slug}>
                    <Link
                      href={`/reports/${report.slug}`}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">{report.description}</p>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
