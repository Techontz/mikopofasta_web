import { PERMISSIONS, type AuthenticatedUser, type Permission, type Role } from "@/types/auth";

/**
 * Default permission grants per role — mirrors
 * docs/backend-architecture-specification.md §14.
 *
 * Deliberately NOT included anywhere by default: LOANS_REVIEW_CROSS_BRANCH.
 * Per Decision 1, cross-branch loan review is always an explicit, additional
 * grant (see AuthenticatedUser.extraPermissions), never bundled into a role.
 */
/**
 * Mutated in place (never reassigned) by setRolePermissions — this is what
 * makes the Permission Matrix screen a real, functional control over RBAC
 * rather than a cosmetic form. super_admin is intentionally never editable
 * here (see setRolePermissions) so an admin can never lock everyone out.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CUSTOMERS_APPROVE,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_CREATE,
    PERMISSIONS.LOANS_APPROVE,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.REPAYMENTS_MANAGE,
    PERMISSIONS.REPAYMENTS_CASH_ENTRY,
    PERMISSIONS.LEDGER_VIEW,
    PERMISSIONS.LEDGER_REVERSE_REQUEST,
    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.HR_MANAGE,
    PERMISSIONS.PAYROLL_GENERATE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.ADMIN_ORG_SETTINGS,
    PERMISSIONS.BRANCHES_VIEW_ALL,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_VIEW,
  ],
  finance: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_DISBURSE,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.REPAYMENTS_MANAGE,
    PERMISSIONS.REPAYMENTS_CASH_ENTRY,
    PERMISSIONS.REPAYMENTS_RECONCILE,
    PERMISSIONS.LEDGER_VIEW,
    PERMISSIONS.LEDGER_REVERSE_REQUEST,
    PERMISSIONS.LEDGER_REVERSE_APPROVE,
    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.TREASURY_MANAGE,
    PERMISSIONS.PAYROLL_FINALIZE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BRANCHES_VIEW_ALL,
  ],
  branch_manager: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.CUSTOMERS_APPROVE,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_CREATE,
    PERMISSIONS.LOANS_APPROVE,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  loan_officer: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.LOANS_CREATE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  // Telco verification + credit review only — never approval, never creation (§14).
  credit_officer: [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.LOANS_VIEW, PERMISSIONS.LOANS_CREDIT_REVIEW, PERMISSIONS.REPORTS_VIEW],
  hr: [PERMISSIONS.HR_VIEW, PERMISSIONS.HR_MANAGE, PERMISSIONS.PAYROLL_GENERATE, PERMISSIONS.REPORTS_VIEW],
  zone_manager: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BRANCHES_VIEW_ALL,
  ],
  regional_manager: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BRANCHES_VIEW_ALL,
  ],
  // Cash payment entry only — no reconciliation, no confirmation (§14).
  teller: [PERMISSIONS.REPAYMENTS_VIEW, PERMISSIONS.REPAYMENTS_CASH_ENTRY],
  // Read-only, cross-branch, by design: an auditor can see everything
  // financial (ledger, treasury, HR, reports, audit trail) but holds no
  // manage/approve/finalize/reverse permission anywhere in the system.
  auditor: [
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.LOANS_VIEW,
    PERMISSIONS.REPAYMENTS_VIEW,
    PERMISSIONS.LEDGER_VIEW,
    PERMISSIONS.TREASURY_VIEW,
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BRANCHES_VIEW_ALL,
    PERMISSIONS.AUDIT_VIEW,
  ],
};

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function setRolePermissions(role: Role, permissions: Permission[]): { ok: boolean; message?: string } {
  if (role === "super_admin") {
    return { ok: false, message: "Super Admin always holds every permission — it can't be edited." };
  }
  ROLE_PERMISSIONS[role] = Array.from(new Set(permissions));
  return { ok: true };
}

/** Groups the flat permission list for the Permission Matrix UI. */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Customers", permissions: [PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.CUSTOMERS_MANAGE, PERMISSIONS.CUSTOMERS_APPROVE] },
  {
    label: "Loans",
    permissions: [
      PERMISSIONS.LOANS_VIEW,
      PERMISSIONS.LOANS_CREATE,
      PERMISSIONS.LOANS_APPROVE,
      PERMISSIONS.LOANS_CREDIT_REVIEW,
      PERMISSIONS.LOANS_DISBURSE,
      PERMISSIONS.LOANS_REVIEW_CROSS_BRANCH,
    ],
  },
  {
    label: "Repayments",
    permissions: [
      PERMISSIONS.REPAYMENTS_VIEW,
      PERMISSIONS.REPAYMENTS_MANAGE,
      PERMISSIONS.REPAYMENTS_CASH_ENTRY,
      PERMISSIONS.REPAYMENTS_RECONCILE,
    ],
  },
  { label: "Ledger", permissions: [PERMISSIONS.LEDGER_VIEW, PERMISSIONS.LEDGER_REVERSE_REQUEST, PERMISSIONS.LEDGER_REVERSE_APPROVE] },
  { label: "Treasury", permissions: [PERMISSIONS.TREASURY_VIEW, PERMISSIONS.TREASURY_MANAGE] },
  { label: "HR & Payroll", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.HR_MANAGE, PERMISSIONS.PAYROLL_GENERATE, PERMISSIONS.PAYROLL_FINALIZE] },
  { label: "Reports", permissions: [PERMISSIONS.REPORTS_VIEW] },
  { label: "Administration", permissions: [PERMISSIONS.ADMIN_ORG_SETTINGS, PERMISSIONS.BRANCHES_VIEW_ALL, PERMISSIONS.USERS_MANAGE, PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE] },
  { label: "Audit", permissions: [PERMISSIONS.AUDIT_VIEW] },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.CUSTOMERS_VIEW]: "View customers",
  [PERMISSIONS.CUSTOMERS_MANAGE]: "Create/edit customers",
  [PERMISSIONS.CUSTOMERS_APPROVE]: "Approve/reject customer registrations",
  [PERMISSIONS.LOANS_VIEW]: "View loans",
  [PERMISSIONS.LOANS_CREATE]: "Create loan applications",
  [PERMISSIONS.LOANS_APPROVE]: "Approve loans",
  [PERMISSIONS.LOANS_CREDIT_REVIEW]: "Run credit/telco review",
  [PERMISSIONS.LOANS_DISBURSE]: "Execute disbursement",
  [PERMISSIONS.LOANS_REVIEW_CROSS_BRANCH]: "Review loans cross-branch",
  [PERMISSIONS.REPAYMENTS_VIEW]: "View repayments",
  [PERMISSIONS.REPAYMENTS_MANAGE]: "Confirm/allocate repayments",
  [PERMISSIONS.REPAYMENTS_CASH_ENTRY]: "Record cash payments",
  [PERMISSIONS.REPAYMENTS_RECONCILE]: "Bank reconciliation",
  [PERMISSIONS.LEDGER_VIEW]: "View ledger",
  [PERMISSIONS.LEDGER_REVERSE_REQUEST]: "Request reversal",
  [PERMISSIONS.LEDGER_REVERSE_APPROVE]: "Approve reversal",
  [PERMISSIONS.TREASURY_VIEW]: "View treasury",
  [PERMISSIONS.TREASURY_MANAGE]: "Record capital & dividends",
  [PERMISSIONS.HR_VIEW]: "View HR",
  [PERMISSIONS.HR_MANAGE]: "Manage HR",
  [PERMISSIONS.PAYROLL_GENERATE]: "Generate payroll",
  [PERMISSIONS.PAYROLL_FINALIZE]: "Finalize payroll",
  [PERMISSIONS.REPORTS_VIEW]: "View reports",
  [PERMISSIONS.ADMIN_ORG_SETTINGS]: "Manage org settings",
  [PERMISSIONS.BRANCHES_VIEW_ALL]: "View all branches",
  [PERMISSIONS.AUDIT_VIEW]: "View audit trail",
  [PERMISSIONS.USERS_MANAGE]: "Manage users",
  [PERMISSIONS.ROLES_VIEW]: "View roles",
  [PERMISSIONS.ROLES_MANAGE]: "Manage permission matrix",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full, unrestricted access to every module and permission.",
  admin: "Org setup, user management, and operational approvals — no ledger reversal approval.",
  finance: "Disbursement, payment confirmation, reconciliation, and payroll finalization.",
  branch_manager: "Loan approval, staff advance approval, and branch expense entry — own branch.",
  loan_officer: "Loan application and KYC capture — own branch, cannot approve own submissions.",
  credit_officer: "Telco verification and credit review — strictly branch-scoped.",
  hr: "Staff registration and payroll generation — finalization is Finance's job.",
  zone_manager: "Branch performance oversight for one zone, plus commission override.",
  regional_manager: "Branch performance oversight for one region.",
  teller: "Cash payment entry only — own branch.",
  auditor: "Read-only, cross-branch access to ledger, treasury, HR, and the full audit trail.",
};

export function getEffectivePermissions(user: Pick<AuthenticatedUser, "role" | "extraPermissions">): Permission[] {
  return Array.from(new Set([...ROLE_PERMISSIONS[user.role], ...user.extraPermissions]));
}

export function hasPermission(
  user: Pick<AuthenticatedUser, "role" | "extraPermissions">,
  permission: Permission
): boolean {
  return getEffectivePermissions(user).includes(permission);
}

export function hasAnyPermission(
  user: Pick<AuthenticatedUser, "role" | "extraPermissions">,
  permissions: Permission[]
): boolean {
  const effective = getEffectivePermissions(user);
  return permissions.some((p) => effective.includes(p));
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  finance: "Finance Officer",
  branch_manager: "Branch Manager",
  loan_officer: "Loan Officer",
  credit_officer: "Credit Officer",
  hr: "HR Officer",
  zone_manager: "Zone Manager",
  regional_manager: "Regional Manager",
  teller: "Teller",
  auditor: "Auditor",
};
