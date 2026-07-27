import Link from "next/link";
import { Banknote, HandCoins, TrendingUp, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_PAYROLL_RUNS, MOCK_PAYROLL_LINES } from "@/lib/mock-data/payroll";
import { MOCK_COMMISSION_POOLS } from "@/lib/mock-data/commission";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";
import { MOCK_STAFF_LOANS } from "@/lib/mock-data/staff-loans";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";
import { staffName } from "@/features/hr/queries";

export default async function HrPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const active = MOCK_STAFF_PROFILES.filter((s) => s.deletedAt === null && s.employmentStatus === "active");
  const monthlySalary = round2(active.reduce((s, p) => s + p.baseSalary, 0));
  const openAdvances = MOCK_STAFF_ADVANCES.filter((a) => ["requested", "approved", "disbursed"].includes(a.status));
  const poolTotal = round2(MOCK_COMMISSION_POOLS.reduce((s, p) => s + p.poolAmount, 0));

  const runs = [...MOCK_PAYROLL_RUNS].sort((a, b) => b.period.localeCompare(a.period));
  const blockedPools = MOCK_COMMISSION_POOLS.filter((p) => p.distributableProfit <= 0);

  const tiles = [
    { label: "Active Staff", value: String(active.length), icon: UsersRound },
    { label: "Monthly Base Salary", value: formatMoney(monthlySalary), icon: Banknote },
    { label: "Commission Pools", value: formatMoney(poolTotal), icon: TrendingUp },
    { label: "Open Advances", value: String(openAdvances.length), icon: HandCoins },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1>HR, Payroll &amp; Commission</h1>
        <p className="text-sm text-muted-foreground">
          HR generates payroll; Finance finalizes and pays it. Commission follows branch performance, never individual sales.
        </p>
      </div>

      <SectionNav items={hrNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {blockedPools.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          {blockedPools.length} branch pool{blockedPools.length === 1 ? "" : "s"} cannot pay commission — the branch loss must be offset first.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {runs.map((run) => {
                const lines = MOCK_PAYROLL_LINES.filter((l) => l.payrollRunId === run.id);
                const net = round2(lines.reduce((s, l) => s + l.netSalary, 0));
                return (
                  <li key={run.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <Link href={`/hr/payroll/${run.period}`} className="font-medium hover:underline">
                        {run.period}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lines.length} staff · {formatMoney(net)} net
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {run.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Loans &amp; Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {MOCK_STAFF_LOANS.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{staffName(l.staffProfileId)}</p>
                    <p className="text-xs text-muted-foreground">Staff loan · {l.disbursedAt}</p>
                  </div>
                  <span className="font-tabular">{formatMoney(l.amount)}</span>
                </li>
              ))}
              {openAdvances.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{staffName(a.staffProfileId)}</p>
                    <p className="text-xs capitalize text-muted-foreground">Advance · {a.status}</p>
                  </div>
                  <span className="font-tabular">{formatMoney(a.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
