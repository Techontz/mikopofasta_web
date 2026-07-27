import type { Customer } from "@/types/customer";
import type { CustomerDocument } from "@/types/customer";
import type { CustomerNote } from "@/types/customer-note";
import type { AccountFreeze, AuditLog } from "@/types/audit";

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
    if (log.auditableType === "customer" && log.auditableId === customer.id) {
      events.push({ id: `audit-${log.id}`, at: log.createdAt, kind: "audit", title: log.action.replace(/_/g, " "), actorId: log.userId });
    }
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
