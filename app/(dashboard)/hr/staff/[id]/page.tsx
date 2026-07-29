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
import { getAllPayrollRuns, getStaffMember } from "@/lib/api/hr";
import { getZones } from "@/lib/api/organization";
import { ApiError } from "@/lib/api/errors";

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // `show` carries this employee's loans, advances and performance in its
  // meta, so the profile is one request rather than four.
  let detail;
  try {
    detail = await getStaffMember(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }

  const { staff, loans, advances, performance } = detail;

  // Payroll history for this employee: the runs index eager-loads its lines,
  // so the employee's payslips are filtered out of them rather than fetched
  // per run. Zones are a separate lookup — the staff resource carries only the
  // id — and it fails soft.
  const [runs, zones] = await Promise.all([getAllPayrollRuns(), getZones().catch(() => [])]);
  const runById = new Map(runs.map((r) => [r.id, r]));
  const lines = runs.flatMap((r) => r.lines).filter((l) => l.staffProfileId === staff.id);

  const zone = staff.zoneId ? zones.find((z) => z.id === staff.zoneId) : undefined;
  const bank = staff.bankDetails;
  const name = staff.name ?? staff.employeeNumber;
  // The staff resource carries the employee's name but not the avatar initials
  // the user record computes, so they are derived from the name here.
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "—";

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={name} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/hr/staff"><ArrowLeft className="size-4" />Back to Staff</Link>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-sm text-muted-foreground">{staff.role ? (ROLE_LABELS[staff.role] ?? staff.role) : "—"}</p>
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
            <Field label="Branch">{staff.branchName ?? "—"}</Field>
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
                    const run = runById.get(l.payrollRunId);
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
