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
import { MOCK_COMMISSION_POOLS, MOCK_COMMISSION_DISTRIBUTIONS } from "@/lib/mock-data/commission";
import { MOCK_ZONE_COMMISSION_DISTRIBUTIONS } from "@/lib/mock-data/payroll";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { staffName } from "@/features/hr/queries";

export default async function CommissionPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const branchName = (id: string) => MOCK_BRANCHES.find((b) => b.id === id)?.name ?? id;

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
          <CardTitle className="text-base">Branch Pools ({MOCK_COMMISSION_POOLS.length})</CardTitle>
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
                {MOCK_COMMISSION_POOLS.map((p) => (
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
          <CardTitle className="text-base">Staff Distributions ({MOCK_COMMISSION_DISTRIBUTIONS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_COMMISSION_DISTRIBUTIONS.length === 0 ? (
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
                  {MOCK_COMMISSION_DISTRIBUTIONS.map((d) => {
                    const pool = MOCK_COMMISSION_POOLS.find((p) => p.id === d.commissionPoolId);
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Link href={`/hr/staff/${d.staffProfileId}`} className="font-medium hover:underline">
                            {staffName(d.staffProfileId)}
                          </Link>
                        </TableCell>
                        <TableCell>{pool ? branchName(pool.branchId) : "—"}</TableCell>
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
          <CardTitle className="text-base">Zone Manager Overrides ({MOCK_ZONE_COMMISSION_DISTRIBUTIONS.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {MOCK_ZONE_COMMISSION_DISTRIBUTIONS.length === 0 ? (
            <EmptyState title="No zone overrides" />
          ) : (
            <ul className="space-y-2">
              {MOCK_ZONE_COMMISSION_DISTRIBUTIONS.map((z) => (
                <li key={z.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{ZONES.find((x) => x.id === z.zoneId)?.name ?? z.zoneId}</p>
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
