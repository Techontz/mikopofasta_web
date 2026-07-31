import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Money, PageHeader, SettingsCard, StatusBadge } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { getCommission } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

/**
 * HRM → Commission.
 *
 * PRESENTATION ONLY. The same `getCommission` call, the same pool/distribution
 * flattening, the same branch-name lookup, the same blocked-pool rule and the
 * same three sections. Cards and badges are the Menu module's; the tables keep
 * their own markup — they are read-only summaries with computed cells rather
 * than sortable lists — and now wear `.st-table`.
 */
export default async function CommissionPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // Branch and staff names travel with the pools; the zone overrides carry
  // their own zone name. Nothing here needs a second lookup.
  const commission = await getCommission();
  const pools = commission.pools;
  const distributions = pools.flatMap((p) => p.distributions.map((d) => ({ ...d, pool: p })));
  const zoneOverrides = commission.zoneOverrides;
  const branchName = (id: string) => pools.find((p) => p.branchId === id)?.branchName ?? id;

  return (
    <>
      <PageHeader
        icon={TrendingUp}
        title="Commission"
        description="Pools come from branch profit after HQ hold and any loss carried forward. A branch in loss pays no commission until it is offset."
        breadcrumb={[{ label: "HRM", href: "/hr" }, { label: "Commission" }]}
      />

      <SectionNav items={hrNavFor(user)} />

      <SettingsCard title={`Branch Pools (${pools.length})`} bodyClassName="pt-0 sm:pt-0">
        <div className="st-card overflow-x-auto">
          <table className="st-table w-full">
            <thead>
              <tr>
                <th className="text-left">Branch</th>
                <th className="text-left">Period</th>
                <th className="text-right">Branch profit</th>
                <th className="text-right">Loss c/f</th>
                <th className="text-right">HQ hold (2%)</th>
                <th className="text-right">Distributable</th>
                <th className="text-right">Pool (20%)</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-[var(--st-ink)]">{branchName(p.branchId)}</td>
                  <td>{p.period}</td>
                  <td>
                    <Money>{formatMoney(p.branchProfit)}</Money>
                  </td>
                  <td>
                    <Money muted={p.lossCarryForward <= 0}>
                      {p.lossCarryForward > 0 ? `−${formatMoney(p.lossCarryForward)}` : "—"}
                    </Money>
                  </td>
                  <td>
                    <Money>−{formatMoney(p.hqHoldAmount)}</Money>
                  </td>
                  <td className="text-right">
                    <span className="font-tabular">{formatMoney(p.distributableProfit)}</span>
                    {p.distributableProfit <= 0 && (
                      <StatusBadge tone="danger" className="ml-2">
                        Blocked
                      </StatusBadge>
                    )}
                  </td>
                  <td>
                    <Money strong>{formatMoney(p.poolAmount)}</Money>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsCard>

      <SettingsCard
        title={`Staff Distributions (${distributions.length})`}
        bodyClassName={distributions.length === 0 ? undefined : "pt-0 sm:pt-0"}
      >
        {distributions.length === 0 ? (
          <EmptyState
            title="No distributions"
            description="Distribution happens once a pool has positive distributable profit."
          />
        ) : (
          <div className="st-card overflow-x-auto">
            <table className="st-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Staff</th>
                  <th className="text-left">Branch</th>
                  <th className="text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        href={`/hr/staff/${d.staffProfileId}`}
                        className="font-medium text-[var(--st-ink)] hover:underline"
                      >
                        {d.staffName ?? d.staffProfileId}
                      </Link>
                    </td>
                    <td>{d.pool.branchName ?? branchName(d.pool.branchId)}</td>
                    <td>
                      <Money>{formatMoney(d.shareAmount)}</Money>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      <SettingsCard title={`Zone Manager Overrides (${zoneOverrides.length})`}>
        {zoneOverrides.length === 0 ? (
          <EmptyState title="No zone overrides" />
        ) : (
          <ul className="space-y-2">
            {zoneOverrides.map((z) => (
              <li
                key={z.id}
                className="flex items-center justify-between rounded-[var(--st-radius-sm)] border p-3 text-[13px]"
                style={{ borderColor: "var(--st-line-strong)" }}
              >
                <div>
                  <p className="font-medium text-[var(--st-ink)]">{z.zoneName ?? z.zoneId}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--st-ink-soft)]">
                    {z.period} · {z.overridePercentage}% of {formatMoney(z.totalPoolBase)} pool base
                  </p>
                </div>
                <span className="font-tabular text-[var(--st-ink)]">{formatMoney(z.overrideAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </>
  );
}
