import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission, ROLE_LABELS } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { formatMoney } from "@/lib/domain/money";
import { MOCK_STAFF_PROFILES, MOCK_STAFF_BANK_DETAILS } from "@/lib/mock-data/staff-profiles";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { ZONES } from "@/lib/mock-data/zones";
import { MOCK_PAYROLL_LINES, MOCK_PAYROLL_RUNS } from "@/lib/mock-data/payroll";
import { MOCK_STAFF_LOANS } from "@/lib/mock-data/staff-loans";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";
import { MOCK_STAFF_PERFORMANCE_RECORDS } from "@/lib/mock-data/staff-performance";

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  const staff = MOCK_STAFF_PROFILES.find((s) => s.id === id && s.deletedAt === null);
  if (!staff) notFound();

  const account = MOCK_USERS.find((u) => u.id === staff.userId);
  const branch = staff.branchId ? MOCK_BRANCHES.find((b) => b.id === staff.branchId) : undefined;
  const zone = staff.zoneId ? ZONES.find((z) => z.id === staff.zoneId) : undefined;
  const bank = MOCK_STAFF_BANK_DETAILS.find((b) => b.staffProfileId === staff.id);
  const lines = MOCK_PAYROLL_LINES.filter((l) => l.staffProfileId === staff.id);
  const loans = MOCK_STAFF_LOANS.filter((l) => l.staffProfileId === staff.id);
  const advances = MOCK_STAFF_ADVANCES.filter((a) => a.staffProfileId === staff.id);
  const performance = MOCK_STAFF_PERFORMANCE_RECORDS.filter((p) => p.staffProfileId === staff.id);

  const name = account?.name ?? staff.employeeNumber;

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={name} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/hr/staff"><ArrowLeft className="size-4" />Back to Staff</Link>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{account?.avatarInitials ?? "—"}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{account ? ROLE_LABELS[account.role] : "—"}</p>
            </div>
            <Badge variant="outline" className="capitalize">
              {staff.employmentStatus}
            </Badge>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Employment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee number">{staff.employeeNumber}</Field>
            <Field label="Hired">{staff.hiredAt}</Field>
            <Field label="Base salary">{formatMoney(staff.baseSalary)}</Field>
            <Field label="Commission eligible">{staff.commissionEligible ? "Yes" : "No"}</Field>
            <Field label="Branch">{branch?.name ?? "—"}</Field>
            <Field label="Zone">{zone?.name ?? "—"}</Field>
            <Field label="Payment method">
              <span className="capitalize">{staff.paymentMethod}</span>
            </Field>
            <Field label="Bank">{bank ? `${bank.bankName} — ${bank.accountNumber}` : "—"}</Field>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payslip History ({lines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <EmptyState title="No payslips yet" description="Payslips appear once a payroll run including this employee is generated." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => {
                    const run = MOCK_PAYROLL_RUNS.find((r) => r.id === l.payrollRunId);
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          {run ? (
                            <Link href={`/hr/payroll/${run.period}`} className="hover:underline">
                              {run.period}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="font-tabular text-right">{formatMoney(l.baseSalary)}</TableCell>
                        <TableCell className="font-tabular text-right">{l.commissionAmount > 0 ? formatMoney(l.commissionAmount) : "—"}</TableCell>
                        <TableCell className="font-tabular text-right">{formatMoney(l.allowancesTotal)}</TableCell>
                        <TableCell className="font-tabular text-right">−{formatMoney(l.deductionsTotal)}</TableCell>
                        <TableCell className="font-tabular text-right font-medium">{formatMoney(l.netSalary)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Loans &amp; Advances</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 && advances.length === 0 ? (
              <EmptyState title="None on record" />
            ) : (
              <ul className="space-y-2">
                {loans.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">Staff loan</p>
                      <p className="text-xs text-muted-foreground">Disbursed {l.disbursedAt}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-tabular">{formatMoney(l.amount)}</span>
                      <Badge variant="outline" className="capitalize">
                        {l.status}
                      </Badge>
                    </div>
                  </li>
                ))}
                {advances.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">Salary advance</p>
                      <p className="text-xs text-muted-foreground">Requested {new Date(a.requestedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-tabular">{formatMoney(a.amount)}</span>
                      <Badge variant="outline" className="capitalize">
                        {a.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {performance.length === 0 ? (
              <EmptyState title="No performance records" />
            ) : (
              <ul className="space-y-2">
                {performance.map((p) => (
                  <li key={p.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{p.period}</p>
                      <Badge variant={p.rating === "A" ? "default" : p.rating === "D" ? "destructive" : "secondary"}>{p.rating ?? "—"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Object.entries(p.achieved)
                        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}/${p.targets[k] ?? "—"}`)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  );
}
