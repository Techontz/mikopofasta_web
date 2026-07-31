import Link from "next/link";
import { Target } from "lucide-react";
import { PageHeader, SettingsCard, StatusBadge, type StatusTone } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getPerformanceRecords } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

/**
 * HRM → Performance.
 *
 * PRESENTATION ONLY. The same `getPerformanceRecords` call, the same reviewer
 * fallback, the same permission gate, the same columns and the same
 * target-versus-achieved pairs. The table keeps its own markup because each
 * cell prints two figures rather than one value — it now wears `.st-table`,
 * the skin SettingsTable renders through, so it matches the Menu modules.
 */

/** Rating → the app's own badge tone, replacing shadcn's variant names. */
const RATING_TONE: Record<string, StatusTone> = {
  A: "active",
  B: "info",
  C: "warning",
  D: "danger",
};

export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // The API already returns newest-period-first, and each record carries the
  // employee's name. `recordedBy` is a user id with no name on the resource —
  // /users needs `users.manage`, which HR-viewing roles do not hold — so the
  // reviewer falls back to the seeded user list until Users is integrated.
  const records = await getPerformanceRecords();

  return (
    <>
      <PageHeader
        icon={Target}
        title="Performance"
        description="Targets versus achieved per period, with the reviewer's rating."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Performance" }]}
      />

      <SectionNav items={hrNavFor(user)} />

      <SettingsCard
        title={`Performance Records (${records.length})`}
        bodyClassName={records.length === 0 ? undefined : "pt-0 sm:pt-0"}
      >
        {records.length === 0 ? (
          <EmptyState
            title="No performance records"
            description="Managers record targets and achievement per period."
          />
        ) : (
          <div className="st-card overflow-x-auto">
            <table className="st-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Staff</th>
                  <th className="text-left">Period</th>
                  <th className="text-right">Loans disbursed</th>
                  <th className="text-right">Collection rate</th>
                  <th className="text-right">New customers</th>
                  <th className="text-left">Recorded by</th>
                  <th className="text-left">Rating</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/hr/staff/${r.staffProfileId}`}
                        className="font-medium text-[var(--st-ink)] hover:underline"
                      >
                        {r.staffName ?? r.staffProfileId}
                      </Link>
                    </td>
                    <td>{r.period}</td>
                    <td className="font-tabular text-right">
                      {r.achieved.loans_disbursed} / {r.targets.loans_disbursed}
                    </td>
                    <td className="font-tabular text-right">
                      {r.achieved.collection_rate_pct}% / {r.targets.collection_rate_pct}%
                    </td>
                    <td className="font-tabular text-right">
                      {r.achieved.new_customers} / {r.targets.new_customers}
                    </td>
                    {/* Resolved by the API rather than looked up here. */}
                    <td>{r.recordedByName ?? "—"}</td>
                    <td>
                      <StatusBadge tone={r.rating ? (RATING_TONE[r.rating] ?? "neutral") : "neutral"}>
                        {r.rating ?? "—"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>
    </>
  );
}
