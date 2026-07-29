import Link from "next/link";
import { Banknote, HandCoins, TrendingUp, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney, round2 } from "@/lib/domain/money";
import { getAllPayrollRuns, getAllStaff, getCommission, getStaffAdvances, getStaffLoans } from "@/lib/api/hr";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

export default async function HrPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const [staff, runs, commission, advances, loans] = await Promise.all([
    getAllStaff(),
    getAllPayrollRuns(),
    getCommission(),
    getStaffAdvances(),
    getStaffLoans(),
  ]);

  const active = staff.filter((s) => s.deletedAt === null && s.employmentStatus === "active");
  const monthlySalary = round2(active.reduce((s, p) => s + p.baseSalary, 0));
  const openAdvances = advances.filter((a) => ["requested", "approved", "disbursed"].includes(a.status));
  const poolTotal = commission.totalPool;

  // §11's hard rule, as the API states it: a branch that made a loss pays no
  // commission until the loss is offset.
  const blockedPools = commission.pools.filter((p) => !p.distributable);

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
                return (
                  <li key={run.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <Link href={`/hr/payroll/${run.period}`} className="font-medium hover:underline">
                        {run.period}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {run.lineCount} staff · {formatMoney(run.netTotal)} net
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
              {loans.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{l.staffName ?? l.staffProfileId}</p>
                    <p className="text-xs text-muted-foreground">Staff loan · {l.disbursedAt}</p>
                  </div>
                  <span className="font-tabular">{formatMoney(l.amount)}</span>
                </li>
              ))}
              {openAdvances.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{a.staffName ?? a.staffProfileId}</p>
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
