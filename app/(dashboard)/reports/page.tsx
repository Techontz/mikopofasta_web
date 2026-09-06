import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, SettingsCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { reportNavFor } from "@/features/ledger/nav-items";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getReportsByGroup } from "@/lib/api/reports";

/**
 * Reports → the catalogue.
 *
 * Presentation only in this pass: the same registry call, the same grouping and
 * the same per-report links as before, drawn with PageHeader and SettingsCard
 * so it sits in the same design system as every Menu-tab module.
 */
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
    <>
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description={`${total} reports, every one computed from the same records the operational modules use — no separate reporting store.`}
        breadcrumb={[{ label: "Report" }]}
      />
      <SectionNav items={reportNavFor(user)} />

      {groups
        .filter((g) => g.reports.length > 0)
        .map((group) => (
          <SettingsCard key={group.group} title={group.group}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {group.reports.map((report) => (
                <li key={report.slug}>
                  <Link
                    href={`/reports/${report.slug}`}
                    className="flex items-start justify-between gap-3 rounded-[var(--st-radius-sm)] border p-3 transition-colors hover:bg-[var(--st-subtle-strong)]"
                    style={{ borderColor: "var(--st-line-strong)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[var(--st-ink)]">{report.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--st-ink-soft)]">
                        {report.description}
                      </p>
                    </div>
                    <ArrowRight
                      className="mt-0.5 size-4 shrink-0 text-[var(--st-ink-faint)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </SettingsCard>
        ))}
    </>
  );
}
