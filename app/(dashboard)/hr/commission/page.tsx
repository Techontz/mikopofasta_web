import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { getCommission } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

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
    <div className="space-y-6">
      <div>
        <h1>Commission</h1>
        <p className="text-sm text-muted-foreground">
          Pools come from branch profit after HQ hold and any loss carried forward. A branch in loss pays no commission until it is offset.
        </p>
      </div>

      <SectionNav items={hrNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branch Pools ({pools.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Branch profit</TableHead>
                  <TableHead className="text-right">Loss c/f</TableHead>
                  <TableHead className="text-right">HQ hold (2%)</TableHead>
                  <TableHead className="text-right">Distributable</TableHead>
                  <TableHead className="text-right">Pool (20%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{branchName(p.branchId)}</TableCell>
                    <TableCell>{p.period}</TableCell>
                    <TableCell className="font-tabular text-right">{formatMoney(p.branchProfit)}</TableCell>
                    <TableCell className="font-tabular text-right">{p.lossCarryForward > 0 ? `−${formatMoney(p.lossCarryForward)}` : "—"}</TableCell>
                    <TableCell className="font-tabular text-right">−{formatMoney(p.hqHoldAmount)}</TableCell>
                    <TableCell className="font-tabular text-right">
                      {formatMoney(p.distributableProfit)}
                      {p.distributableProfit <= 0 && (
                        <Badge variant="destructive" className="ml-2">
                          Blocked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-tabular text-right font-medium">{formatMoney(p.poolAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Distributions ({distributions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <EmptyState title="No distributions" description="Distribution happens once a pool has positive distributable profit." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributions.map((d) => {
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Link href={`/hr/staff/${d.staffProfileId}`} className="font-medium hover:underline">
                            {(d.staffName ?? d.staffProfileId)}
                          </Link>
                        </TableCell>
                        <TableCell>{d.pool.branchName ?? branchName(d.pool.branchId)}</TableCell>
                        <TableCell className="font-tabular text-right">{formatMoney(d.shareAmount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zone Manager Overrides ({zoneOverrides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {zoneOverrides.length === 0 ? (
            <EmptyState title="No zone overrides" />
          ) : (
            <ul className="space-y-2">
              {zoneOverrides.map((z) => (
                <li key={z.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{z.zoneName ?? z.zoneId}</p>
                    <p className="text-xs text-muted-foreground">
                      {z.period} · {z.overridePercentage}% of {formatMoney(z.totalPoolBase)} pool base
                    </p>
                  </div>
                  <span className="font-tabular">{formatMoney(z.overrideAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
