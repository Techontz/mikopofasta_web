/**
 * Roles mirror docs/backend-architecture-specification.md §14 exactly —
 * this list must never drift from the backend `roles` table.
 */
export const ROLES = [
  "super_admin",
  "admin",
  "finance",
  "branch_manager",
  "loan_officer",
  "credit_officer",
  "hr",
  "zone_manager",
  "regional_manager",
  "teller",
  "auditor",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Permission strings mirror the backend spec's permission naming (§14).
 * Only the subset needed for Phase 1 (nav gating, route protection) is
 * defined here — later phases extend this as business modules land.
 */
export const PERMISSIONS = {
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  CUSTOMERS_APPROVE: "customers.approve",
  LOANS_VIEW: "loans.view",
  LOANS_CREATE: "loans.create",
  LOANS_APPROVE: "loans.approve",
  LOANS_CREDIT_REVIEW: "loans.credit_review",
  LOANS_DISBURSE: "loans.disburse",
  LOANS_REVIEW_CROSS_BRANCH: "loans.review_cross_branch",
  REPAYMENTS_VIEW: "repayments.view",
  REPAYMENTS_MANAGE: "repayments.manage",
  REPAYMENTS_CASH_ENTRY: "repayments.cash_entry",
  REPAYMENTS_RECONCILE: "repayments.reconcile",
  LEDGER_VIEW: "ledger.view",
  LEDGER_REVERSE_REQUEST: "ledger.reverse.request",
  LEDGER_REVERSE_APPROVE: "ledger.reverse.approve",
  TREASURY_VIEW: "treasury.view",
  TREASURY_MANAGE: "treasury.manage",
  HR_VIEW: "hr.view",
  HR_MANAGE: "hr.manage",
  PAYROLL_GENERATE: "payroll.generate",
  PAYROLL_FINALIZE: "payroll.finalize",
  REPORTS_VIEW: "reports.view",
  ADMIN_ORG_SETTINGS: "admin.org_settings",
  BRANCHES_VIEW_ALL: "branches.view_all",
  AUDIT_VIEW: "audit.view",
  USERS_MANAGE: "users.manage",
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Mirrors `users.status` (backend §2.1). */
export type UserStatus = "active" | "suspended";

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  /**
   * Home/base branch — always assigned, including HQ-wide roles (they're
   * based at the Head Office branch, per backend spec §12 Decision 2: HQ is
   * a branch, not a separate entity). Cross-branch visibility is decided by
   * the BRANCHES_VIEW_ALL permission, never by this field being null.
   * Nullable in the type only for schema flexibility.
   */
  branchId: string | null;
  zoneId: string | null;
  regionId: string | null;
  /**
   * Permissions granted on top of the role's defaults — this is how
   * "explicit permission" cross-branch review (backend spec §13/§14
   * Decision 1) is represented: never implied by role, always an
   * additional, visible grant.
   */
  extraPermissions: Permission[];
  /**
   * The effective set, already resolved by the API as role grants ∪
   * extraPermissions.
   *
   * This is authoritative and the local ROLE_PERMISSIONS map is not: the §14
   * matrix is editable at runtime through the permission-matrix screen, so
   * once an administrator changes it the server's answer is the only correct
   * one. See getEffectivePermissions in config/permissions.ts.
   */
  permissions: Permission[];
  avatarInitials: string;
  email: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
}
