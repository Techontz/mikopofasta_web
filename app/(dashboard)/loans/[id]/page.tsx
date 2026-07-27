import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { MOCK_LOANS, MOCK_LOAN_STATUS_HISTORY, MOCK_E_MANDATES, MOCK_TELCO_VERIFICATIONS, MOCK_DISBURSEMENT_BATCHES } from "@/lib/mock-data/loans";
import { MOCK_LOAN_SCHEDULES } from "@/lib/mock-data/payments";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_LOAN_PRODUCTS } from "@/lib/mock-data/loan-products";
import { MOCK_REPAYMENT_SCHEDULES } from "@/lib/mock-data/repayment-schedules";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { buildLoanTimeline } from "@/lib/domain/loan-timeline";
import { formatMoney } from "@/lib/domain/money";
import { formatPenaltyRate } from "@/lib/domain/penalty";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { customerFullName } from "@/types/customer";
import { LoanStatusBadge } from "@/features/loans/loan-status-badge";
import { LoanActionsPanel } from "@/features/loans/loan-actions-panel";
import { LoanSchedulePanel } from "@/features/loans/loan-schedule-panel";
import { LoanTimelinePanel } from "@/features/loans/loan-timeline-panel";
import { AuditTrailPanel } from "@/features/customers/profile/audit-trail-panel";
import { loanOutstanding } from "@/features/loans/queries";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loan = MOCK_LOANS.find((l) => l.id === id && l.deletedAt === null);
  if (!loan) notFound();

  const user = await getCurrentUser();
  if (!user) return <AccessDeniedState />;

  // Branch scoping — backend §13.
  const seesAllBranches = hasPermission(user, PERMISSIONS.BRANCHES_VIEW_ALL);
  const crossBranch = loan.branchId !== user.branchId;
  if (crossBranch && !seesAllBranches && !hasPermission(user, PERMISSIONS.LOANS_REVIEW_CROSS_BRANCH)) {
    return <AccessDeniedState />;
  }

  const customer = MOCK_CUSTOMERS.find((c) => c.id === loan.customerId);
  const branch = MOCK_BRANCHES.find((b) => b.id === loan.branchId);
  const product = MOCK_LOAN_PRODUCTS.find((p) => p.id === loan.loanProductId);
  const schedule = MOCK_REPAYMENT_SCHEDULES.find((s) => s.id === loan.repaymentScheduleId);
  const schedules = MOCK_LOAN_SCHEDULES.filter((s) => s.loanId === loan.id);
  const history = MOCK_LOAN_STATUS_HISTORY.filter((h) => h.loanId === loan.id);
  const mandates = MOCK_E_MANDATES.filter((m) => m.loanId === loan.id);
  const telco = MOCK_TELCO_VERIFICATIONS.filter((t) => t.loanId === loan.id);
  const batches = MOCK_DISBURSEMENT_BATCHES.filter((b) => b.loanId === loan.id);
  const auditLogs = MOCK_AUDIT_LOGS.filter((l) => l.auditableType === "loan" && l.auditableId === loan.id);

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));
  const timeline = buildLoanTimeline(history, mandates, telco, batches);
  const outstanding = loanOutstanding(loan.id);

  const permissions = {
    canApprove: hasPermission(user, PERMISSIONS.LOANS_APPROVE),
    canCreditReview: hasPermission(user, PERMISSIONS.LOANS_CREDIT_REVIEW),
    canDisburse: hasPermission(user, PERMISSIONS.LOANS_DISBURSE),
    isOwnApplication: loan.createdBy === user.id,
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/loans"><ArrowLeft className="size-4" />Back to Loans</Link>} />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold">{loan.loanNumber}</h1>
              <LoanStatusBadge status={loan.status} />
              {loan.requiresMandateSnapshot && <Badge variant="outline">E-Mandate</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {customer ? (
                <Link href={`/customers/${customer.id}`} className="hover:underline">
                  {customerFullName(customer)}
                </Link>
              ) : (
                "Unknown customer"
              )}{" "}
              · {branch?.name ?? "—"} · {product?.name ?? "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:text-right">
            <div>
              <p className="text-xs text-muted-foreground">Principal</p>
              <p className="font-tabular font-semibold">{formatMoney(loan.principalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-tabular font-semibold">{outstanding > 0 ? formatMoney(outstanding) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loan.rejectedReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-medium">Rejected:</span> {loan.rejectedReason}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanActionsPanel loanId={loan.id} status={loan.status} outstanding={outstanding} permissions={permissions} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({schedules.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="disbursement">Disbursement ({batches.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
              <Field label="Product">{product?.name ?? "—"}</Field>
              <Field label="Repayment schedule">{schedule ? `${schedule.name} (every ${schedule.frequencyDays}d)` : "—"}</Field>
              <Field label="Tenure">{loan.tenureDays} days</Field>
              <Field label="Interest rate (snapshot)">{loan.interestRateSnapshot}%</Field>
              <Field label="Penalty rate (snapshot)">
                {product ? formatPenaltyRate(product.penaltyType, loan.penaltyRateSnapshot) : loan.penaltyRateSnapshot}
              </Field>
              <Field label="E-Mandate required">{loan.requiresMandateSnapshot ? "Yes" : "No"}</Field>
              <Field label="Officer">{userNames[loan.officerId] ?? "—"}</Field>
              <Field label="Approved by">{loan.approvedBy ? (userNames[loan.approvedBy] ?? "—") : "—"}</Field>
              <Field label="Approved at">{loan.approvedAt ? new Date(loan.approvedAt).toLocaleString() : "—"}</Field>
              <Field label="Disbursed on">{loan.disbursementDate ?? "—"}</Field>
              <Field label="Expected completion">{loan.expectedCompletionDate ?? "—"}</Field>
              <Field label="Closed at">{loan.closedAt ? new Date(loan.closedAt).toLocaleDateString() : "—"}</Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardContent className="pt-6">
              <LoanSchedulePanel schedules={schedules} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              <LoanTimelinePanel events={timeline} actorNames={userNames} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">E-Mandate</h3>
                {mandates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {loan.requiresMandateSnapshot ? "No mandate created yet." : "This product does not require an E-Mandate."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {mandates.map((m) => (
                      <li key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div>
                          <p className="font-medium">{m.bankName}</p>
                          {m.failureReason && <p className="text-xs text-destructive">{m.failureReason}</p>}
                        </div>
                        <Badge variant={m.status === "active" ? "default" : m.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                          {m.status.replace(/_/g, " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Telco Verification</h3>
                {telco.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not yet run.</p>
                ) : (
                  <ul className="space-y-2">
                    {telco.map((t) => (
                      <li key={t.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div>
                          <p className="font-medium capitalize">{t.provider}</p>
                          <p className="text-xs text-muted-foreground">{t.verifiedAt ? new Date(t.verifiedAt).toLocaleString() : "—"}</p>
                        </div>
                        <Badge variant={t.status === "success" ? "default" : t.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                          {t.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disbursement">
          <Card>
            <CardContent className="pt-6">
              {batches.length === 0 ? (
                <EmptyState title="No disbursement attempts yet" description="Finance prepares a batch once credit review passes." />
              ) : (
                <ul className="space-y-2">
                  {[...batches]
                    .sort((a, b) => b.attemptNumber - a.attemptNumber)
                    .map((b) => (
                      <li key={b.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div>
                          <p className="font-medium">
                            Attempt #{b.attemptNumber} · {b.batchReference}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {b.channel} · requested {new Date(b.requestedAt).toLocaleString()}
                          </p>
                          {b.failureReason && <p className="text-xs text-destructive">{b.failureReason}</p>}
                        </div>
                        <Badge
                          variant={b.status === "success" ? "default" : b.status === "failed" || b.status === "escalated" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {b.status}
                        </Badge>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-6">
              <AuditTrailPanel logs={auditLogs} actorNames={userNames} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
