import type { Customer } from "@/types/customer";
import type { CustomerDocument } from "@/types/customer";
import type { CustomerNote } from "@/types/customer-note";
import { AUDIT_ACTIONS, type AccountFreeze, type AuditLog } from "@/types/audit";

export interface TimelineEvent {
  id: string;
  at: string;
  kind: "registration" | "kyc" | "document" | "note" | "status" | "approval" | "audit";
  title: string;
  description?: string;
  actorId: string | null;
}

/**
 * Read-model, not a stored entity — assembled from every timestamped fact
 * already on the customer plus their documents/notes/freezes/audit trail.
 * Matches the domain layer's "reports are derived, not a source of truth"
 * philosophy (backend spec §8).
 */
export function buildCustomerTimeline(
  customer: Customer,
  documents: CustomerDocument[],
  notes: CustomerNote[],
  freezes: AccountFreeze[],
  auditLogs: AuditLog[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({ id: `reg-${customer.id}`, at: customer.createdAt, kind: "registration", title: "Customer registered", actorId: customer.createdBy });

  if (customer.nidaVerifiedAt) {
    events.push({ id: `nida-${customer.id}`, at: customer.nidaVerifiedAt, kind: "kyc", title: "NIDA identity verified", actorId: customer.createdBy });
  }
  if (customer.otpVerifiedAt) {
    events.push({ id: `otp-${customer.id}`, at: customer.otpVerifiedAt, kind: "kyc", title: "OTP verified", actorId: customer.createdBy });
  }
  if (customer.faceVerifiedAt) {
    events.push({ id: `face-${customer.id}`, at: customer.faceVerifiedAt, kind: "kyc", title: "Face liveness verified", actorId: customer.createdBy });
  }
  if (customer.kycStatus === "completed") {
    events.push({ id: `kyc-done-${customer.id}`, at: customer.faceVerifiedAt ?? customer.createdAt, kind: "kyc", title: "KYC completed", actorId: customer.createdBy });
  }

  for (const doc of documents) {
    events.push({ id: `doc-${doc.id}`, at: doc.createdAt, kind: "document", title: `Document uploaded: ${doc.documentType}`, actorId: doc.uploadedBy });
  }
  for (const note of notes) {
    events.push({ id: `note-${note.id}`, at: note.createdAt, kind: "note", title: "Note added", description: note.note, actorId: note.authorId });
  }
  for (const freeze of freezes) {
    events.push({ id: `freeze-${freeze.id}`, at: freeze.frozenAt, kind: "status", title: "Account frozen", description: freeze.reason, actorId: freeze.frozenBy });
    if (freeze.unfrozenAt) {
      events.push({ id: `unfreeze-${freeze.id}`, at: freeze.unfrozenAt, kind: "status", title: "Account unfrozen", actorId: freeze.unfrozenBy });
    }
  }
  if (customer.approvedAt) {
    events.push({
      id: `approval-${customer.id}`,
      at: customer.approvedAt,
      kind: "approval",
      title: customer.approvalStatus === "approved" ? "Approved" : "Rejected",
      description: customer.rejectionReason ?? undefined,
      actorId: customer.approvedBy,
    });
  }
  for (const log of auditLogs) {
    if (isCustomerLog(log, customer.id)) {
      events.push({
        id: `audit-${log.id}`,
        at: log.createdAt,
        kind: "audit",
        title: log.action.replace(/_/g, " "),
        /* Some audit payloads carry the fact the reader is actually after —
           whether a scan passed, why an account was suspended. "Customer
           suspended" on its own answers neither. */
        description: faceScanSummary(log) ?? statusChangeSummary(log),
        actorId: log.userId,
      });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * The one-line verdict of a face scan, for the timeline.
 *
 * Returns undefined for every other action, so the timeline's default
 * behaviour — the action name and nothing else — is unchanged.
 */
function faceScanSummary(log: AuditLog): string | undefined {
  if (log.action !== AUDIT_ACTIONS.CUSTOMER_FACE_SCANNED) return undefined;

  const after = log.afterJson ?? {};
  const status = typeof after.status === "string" ? after.status : null;
  const quality = typeof after.quality_score === "number" ? after.quality_score : null;
  const reason = typeof after.reason === "string" ? after.reason : null;

  const parts = [
    status === "passed" ? "Liveness confirmed" : status === "failed" ? "Liveness not confirmed" : null,
    quality === null ? null : `quality ${quality}%`,
    reason,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * Why a customer was suspended or reactivated.
 *
 * Both carry a required reason and optional remarks; the timeline shows them
 * so the entry stands on its own rather than sending the reader to the audit
 * trail to find out what happened.
 */
function statusChangeSummary(log: AuditLog): string | undefined {
  if (log.action !== AUDIT_ACTIONS.CUSTOMER_SUSPENDED && log.action !== AUDIT_ACTIONS.CUSTOMER_REACTIVATED) {
    return undefined;
  }

  const after = log.afterJson ?? {};
  const parts = [after.reason, after.remarks].filter((v): v is string => typeof v === "string" && v !== "");

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * Whether an audit row belongs to this customer.
 *
 * `auditableType` arrives as the fully-qualified class the row stores —
 * `App\Models\Customer` — not the short domain word. This used to compare it
 * against the literal `"customer"`, which never matched, so no audit event has
 * ever reached the customer timeline: registration and the KYC stamps came
 * from the customer record itself, and everything else was silently dropped.
 *
 * Matched on the last segment, case-insensitively, so it holds whether the API
 * emits the FQCN, a morph alias, or the bare word.
 */
function isCustomerLog(log: AuditLog, customerId: string): boolean {
  if (log.auditableId !== customerId) return false;

  const shortName = log.auditableType.split(/[\\/]/).pop() ?? log.auditableType;

  return shortName.toLowerCase() === "customer";
}
