import { z } from "zod";
import { FREEZABLE_TYPES } from "@/types/enums";

/**
 * Action names are intentionally free-text (VARCHAR in the backend, not an
 * ENUM) — the docs call for an extensible audit vocabulary — but the common
 * ones used across seed data/helpers are collected here so call sites don't
 * invent slightly different strings for the same event.
 */
export const AUDIT_ACTIONS = {
  LOAN_APPLIED: "LOAN_APPLIED",
  LOAN_APPROVED: "LOAN_APPROVED",
  LOAN_REJECTED: "LOAN_REJECTED",
  LOAN_DISBURSED: "LOAN_DISBURSED",
  DISBURSEMENT_RETRIED: "RETRY_DISBURSEMENT",
  PAYMENT_ALLOCATED: "PAYMENT_ALLOCATED",
  PAYMENT_REVERSED: "PAYMENT_REVERSED",
  LEDGER_ENTRY_REVERSED: "LEDGER_ENTRY_REVERSED",
  PAYROLL_FINALIZED: "PAYROLL_FINALIZED",
  STAFF_ADVANCE_APPROVED: "STAFF_ADVANCE_APPROVED",
  CUSTOMER_FROZEN: "CUSTOMER_FROZEN",
  CUSTOMER_UNFROZEN: "CUSTOMER_UNFROZEN",
  CUSTOMER_REGISTERED: "CUSTOMER_REGISTERED",
  CUSTOMER_APPROVED: "CUSTOMER_APPROVED",
  CUSTOMER_REJECTED: "CUSTOMER_REJECTED",
  CUSTOMER_SUSPENDED: "CUSTOMER_SUSPENDED",
  CUSTOMER_REACTIVATED: "CUSTOMER_REACTIVATED",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | (string & {});

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  action: z.string(),
  auditableType: z.string(),
  auditableId: z.string(),
  beforeJson: z.record(z.string(), z.unknown()).nullable(),
  afterJson: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AccountFreezeSchema = z.object({
  id: z.string(),
  freezableType: z.enum(FREEZABLE_TYPES),
  freezableId: z.string(),
  reason: z.string(),
  frozenBy: z.string(),
  frozenAt: z.string(),
  unfrozenBy: z.string().nullable(),
  unfrozenAt: z.string().nullable(),
});
export type AccountFreeze = z.infer<typeof AccountFreezeSchema>;
