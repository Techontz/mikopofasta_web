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

  /*
   * The operational roles the enterprise structure names.
   *
   * "Head Office Teller" is not among them on purpose: that is a `teller`
   * posted to the Head Office branch, which is how a branch-scoped system
   * already says where somebody works. Minting an office-specific twin of
   * every role would record the office twice — in the role and in the posting
   * — free to disagree the day somebody transfers.
   */
  "head_office_manager",
  "accountant",
  "cashier",
  "recovery_officer",
  "customer_care",

  /** The automation — non-login, no permissions. See the backend's RoleName. */
  "system",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * The roles a human may hold, and the only ones any administration screen
 * should offer.
 *
 * `system` is excluded: it is the automation's identity, holds no permissions,
 * can never hold any, and cannot be logged into. Offering it in a user form
 * would let an administrator create a real person who is powerless and looks
 * like the automation in every audit row; offering it in the permission matrix
 * would be a column of checkboxes that can never be ticked.
 *
 * It stays in ROLES so a response carrying it still parses.
 */
export const ASSIGNABLE_ROLES = ROLES.filter((role) => role !== "system");

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
  /*
   * The zone tier of the approval chain, and the right to pause or return an
   * application. Separate grants, not extensions of `loans.approve` — see
   * docs/modules/loan-approval-workflow.md §3.
   */
  LOANS_ZONE_APPROVE: "loans.zone_approve",
  /** Closing a live loan early, which cancels its remaining installments. */
  LOANS_SETTLE_EARLY: "loans.settle_early",
  LOANS_HOLD: "loans.hold",
  LOANS_CREDIT_REVIEW: "loans.credit_review",
  LOANS_DISBURSE: "loans.disburse",
  LOANS_REVIEW_CROSS_BRANCH: "loans.review_cross_branch",
  REPAYMENTS_VIEW: "repayments.view",
  REPAYMENTS_MANAGE: "repayments.manage",
  REPAYMENTS_CASH_ENTRY: "repayments.cash_entry",
  REPAYMENTS_RECONCILE: "repayments.reconcile",
  // Month-end close, the Reserve fund, and bad debt — Decision Register D1.
  // Reserve is split in two on purpose: Finance proposes, Admin releases.
  ACCOUNTING_PERIOD_CLOSE: "accounting.period_close",
  RESERVE_REQUEST: "reserve.request",
  RESERVE_APPROVE: "reserve.approve",
  LOANS_WRITE_OFF: "loans.write_off",
  LOANS_RECOVER: "loans.recover",
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
