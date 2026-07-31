import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  getLoan,
  getLoanHistory,
  getLoanProduct,
  getRepaymentSchedules,
  getTopupEligibility,
} from "@/lib/api/loans";
import { ApiError } from "@/lib/api/errors";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { getAuditLogs } from "@/lib/api/system-configuration";
import { buildLoanTimeline } from "@/lib/domain/loan-timeline";
import { LOAN_STATUS_LABELS } from "@/lib/domain/loan-status-machine";
import { formatMoney } from "@/lib/domain/money";
import { formatPenaltyRate } from "@/lib/domain/penalty";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { LoanStatusBadge } from "@/features/loans/loan-status-badge";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { LoanActionsPanel } from "@/features/loans/loan-actions-panel";
import { LoanSchedulePanel } from "@/features/loans/loan-schedule-panel";
import { LoanTimelinePanel } from "@/features/loans/loan-timeline-panel";
import { AuditTrailPanel } from "@/features/customers/profile/audit-trail-panel";
import type { LoanStatus } from "@/types/enums";

/** The §10 transitions each tab reports on, since neither has an endpoint of its own. */
const MANDATE_STATUSES: LoanStatus[] = ["mandate_pending_otp", "mandate_active", "mandate_failed"];
const DISBURSEMENT_EVENT_STATUSES: LoanStatus[] = ["awaiting_disbursement", "disbursement_failed", "escalated", "active"];

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Outside this officer's branch scope comes back 403, missing comes back 404.
  // Both mean "no such loan, for you" and belong on the not-found page.
  let loan;
  try {
    loan = await getLoan(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }

  const user = await getCurrentUser();
  if (!user) return <AccessDeniedState />;

  const [history, product, schedules, topup] = await Promise.all([
    getLoanHistory(id),
    getLoanProduct(loan.loanProductId),
    getRepaymentSchedules(),
    // Only a loan on the book can be topped up, so the check is only worth
    // making once it is there.
    loan.status === "active" || loan.status === "arrears"
      ? getTopupEligibility(id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const schedule = schedules.find((s) => s.id === loan.repaymentScheduleId);
  /*
   * This record's own history, from the audit trail.
   *
   * The whole trail needs `audit.view`; a read pinned to one record is
   * authorised against the record's own policy instead, so anyone who may see
   * this page may see how it got here. An empty list if that read is refused —
   * the panel is context, not the reason the page exists.
   */
  const auditLogs = await getAuditLogs({
    auditableType: "Loan",
    auditableId: loan.id,
    perPage: 100,
  })
    .then((result) => result.logs)
    .catch(() => []);

  // The API resolves no names for officer/approver/actor ids, and /users needs
  // `users.manage`, which the roles that work loans do not hold — so these read
  // "—" for API-created loans until the Users module is integrated.
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  // Mandates, telco runs and disbursement batches have no list endpoint, so all
  // three tabs are projections of loan_status_history — which is the API's own
  // record of every one of those events.
  const timeline = buildLoanTimeline(history, [], [], []);
  const mandateEvents = history.filter((h) => MANDATE_STATUSES.includes(h.toStatus));
  const disbursementEvents = history.filter((h) => DISBURSEMENT_EVENT_STATUSES.includes(h.toStatus));
  const creditReviewEvents = history.filter(
    (h) => h.fromStatus === "pending_credit_review" || h.toStatus === "pending_credit_review"
  );

  const permissions = {
    canApprove: hasPermission(user, PERMISSIONS.LOANS_APPROVE),
    canCreditReview: hasPermission(user, PERMISSIONS.LOANS_CREDIT_REVIEW),
    canDisburse: hasPermission(user, PERMISSIONS.LOANS_DISBURSE),
    isOwnApplication: loan.createdBy === user.id,
  };

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={loan.loanNumber} />
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
              <Link href={`/customers/${loan.customerId}`} className="hover:underline">
                {loan.customerName ?? "Unknown customer"}
              </Link>{" "}
              · {loan.branchName ?? "—"} · {loan.productName ?? "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:text-right">
            <div>
              <p className="text-xs text-muted-foreground">Principal</p>
              <p className="font-tabular font-semibold">{formatMoney(loan.principalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-tabular font-semibold">{loan.outstanding > 0 ? formatMoney(loan.outstanding) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loan.rejectedReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="font-medium">Rejected:</span> {loan.rejectedReason}
        </div>
      )}

      {topup && (
        <div
          className={
            topup.eligible
              ? "rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm"
              : "rounded-lg border px-4 py-3 text-sm text-muted-foreground"
          }
        >
          <span className="font-medium text-foreground">Top-up eligibility:</span>{" "}
          {topup.eligible ? `Eligible — ${topup.paidPercent}% repaid.` : topup.reasons.join(" ")}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanActionsPanel loanId={loan.id} status={loan.status} outstanding={loan.outstanding} permissions={permissions} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule ({loan.schedules.length})</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="disbursement">Disbursement ({disbursementEvents.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
              <Field label="Product">{loan.productName ?? "—"}</Field>
              <Field label="Repayment schedule">{schedule ? `${schedule.name} (every ${schedule.frequencyDays}d)` : "—"}</Field>
              <Field label="Tenure">{loan.tenureDays} days</Field>
              <Field label="Interest rate (snapshot)">{loan.interestRateSnapshot}%</Field>
              <Field label="Penalty rate (snapshot)">{formatPenaltyRate(product.penaltyType, loan.penaltyRateSnapshot)}</Field>
              <Field label="E-Mandate required">{loan.requiresMandateSnapshot ? "Yes" : "No"}</Field>
              <Field label="Officer">{userNames[loan.officerId] ?? "—"}</Field>
              <Field label="Approved by">{loan.approvedBy ? (userNames[loan.approvedBy] ?? "—") : "—"}</Field>
              <Field label="Approved at">{loan.approvedAt ? new Date(loan.approvedAt).toLocaleString() : "—"}</Field>
              <Field label="Disbursed on">{loan.disbursementDate ?? "—"}</Field>
              <Field label="Expected completion">{loan.expectedCompletionDate ?? "—"}</Field>
              <Field label="Closed at">{loan.closedAt ? new Date(loan.closedAt).toLocaleDateString() : "—"}</Field>
              <Field label="Total payable">{loan.totalPayable > 0 ? formatMoney(loan.totalPayable) : "—"}</Field>
              <Field label="Cooldown until">{loan.frozenUntil ?? "—"}</Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardContent className="pt-6">
              <LoanSchedulePanel schedules={loan.schedules} />
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
                {mandateEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {loan.requiresMandateSnapshot ? "No mandate activity yet." : "This product does not require an E-Mandate."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {mandateEvents.map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{LOAN_STATUS_LABELS[event.toStatus]}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                            {event.reason ? ` · ${event.reason}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={event.toStatus === "mandate_active" ? "default" : event.toStatus === "mandate_failed" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {event.toStatus === "mandate_active" ? "Verified" : event.toStatus === "mandate_failed" ? "Failed" : "Pending"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Telco Verification</h3>
                {creditReviewEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not yet run.</p>
                ) : (
                  <ul className="space-y-2">
                    {creditReviewEvents.map((event) => (
                      <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{LOAN_STATUS_LABELS[event.toStatus]}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                            {event.reason ? ` · ${event.reason}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant={event.toStatus === "pending_finance" ? "default" : event.toStatus === "rejected" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {event.toStatus === "pending_finance" ? "Passed" : event.toStatus === "rejected" ? "Failed" : "In review"}
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
              {disbursementEvents.length === 0 ? (
                <EmptyState title="No disbursement attempts yet" description="Finance prepares a batch once credit review passes." />
              ) : (
                <ul className="space-y-2">
                  {[...disbursementEvents].reverse().map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{LOAN_STATUS_LABELS[event.toStatus]}</p>
                        <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</p>
                        {event.reason && <p className="text-xs text-destructive">{event.reason}</p>}
                      </div>
                      <Badge
                        variant={
                          event.toStatus === "active"
                            ? "default"
                            : event.toStatus === "disbursement_failed" || event.toStatus === "escalated"
                              ? "destructive"
                              : "secondary"
                        }
                        className="shrink-0"
                      >
                        {event.toStatus === "active" ? "Settled" : event.toStatus === "awaiting_disbursement" ? "In flight" : "Failed"}
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
              <AuditTrailPanel logs={auditLogs} />
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
