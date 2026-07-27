import type { DisbursementBatch, EMandate, LoanStatusHistory, TelcoVerification } from "@/types/loan";
import { LOAN_STATUS_LABELS } from "@/lib/domain/loan-status-machine";

export interface LoanTimelineEvent {
  id: string;
  at: string;
  kind: "status" | "mandate" | "telco" | "disbursement" | "decision";
  title: string;
  description?: string;
  actorId: string | null;
}

/**
 * Derived read-model, never stored — assembled from loan_status_history plus
 * the mandate/telco/disbursement side tables. Same philosophy as
 * buildCustomerTimeline: the timeline is a projection, not a source of truth.
 */
export function buildLoanTimeline(
  history: LoanStatusHistory[],
  mandates: EMandate[],
  telcoVerifications: TelcoVerification[],
  batches: DisbursementBatch[]
): LoanTimelineEvent[] {
  const events: LoanTimelineEvent[] = [];

  for (const h of history) {
    events.push({
      id: `hist-${h.id}`,
      at: h.createdAt,
      kind: "status",
      title: h.fromStatus ? `${LOAN_STATUS_LABELS[h.fromStatus]} → ${LOAN_STATUS_LABELS[h.toStatus]}` : LOAN_STATUS_LABELS[h.toStatus],
      description: h.reason ?? undefined,
      actorId: h.changedBy,
    });
  }

  // A failed mandate carries no timestamp of its own; loan_status_history
  // already records the mandate_failed transition, so only the verified
  // case adds anything the history doesn't have.
  for (const m of mandates) {
    if (m.verifiedAt) {
      events.push({ id: `mandate-${m.id}`, at: m.verifiedAt, kind: "mandate", title: `E-Mandate verified with ${m.bankName}`, actorId: null });
    }
  }

  for (const t of telcoVerifications) {
    if (t.verifiedAt) {
      events.push({
        id: `telco-${t.id}`,
        at: t.verifiedAt,
        kind: "telco",
        title: `Telco verification ${t.status} (${t.provider})`,
        actorId: null,
      });
    }
  }

  for (const b of batches) {
    events.push({
      id: `batch-req-${b.id}`,
      at: b.requestedAt,
      kind: "disbursement",
      title: `Disbursement attempt #${b.attemptNumber} requested (${b.channel})`,
      description: b.batchReference,
      actorId: b.requestedBy,
    });
    if (b.completedAt) {
      events.push({
        id: `batch-done-${b.id}`,
        at: b.completedAt,
        kind: "disbursement",
        title: `Disbursement attempt #${b.attemptNumber} ${b.status}`,
        description: b.failureReason ?? undefined,
        actorId: b.requestedBy,
      });
    }
  }

  return events.filter((e) => e.at).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
