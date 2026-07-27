import { PERMISSIONS, type Permission } from "@/types/auth";

/**
 * Single source of truth for "which permission does this route need" —
 * consumed by BOTH proxy.ts (actual enforcement) and config/nav.ts (nav
 * visibility), so a route's guard and its nav entry can never drift apart.
 * Mirrors backend spec §14's permission strings 1:1.
 *
 * A route may require ANY ONE of several permissions (array) — needed for
 * /admin/audit-logs: it lives under Administration per the module list, but
 * the Auditor role must reach it without holding admin.org_settings (that
 * permission is deliberately scoped to org-configuration actions only).
 * More specific prefixes are listed first; matching picks the longest
 * (most specific) prefix, not first-in-array, so order here doesn't matter
 * for correctness — it's just readability.
 */
export const ROUTE_PERMISSIONS: { prefix: string; permission: Permission | Permission[] }[] = [
  { prefix: "/admin/audit-logs", permission: [PERMISSIONS.ADMIN_ORG_SETTINGS, PERMISSIONS.AUDIT_VIEW] },
  { prefix: "/admin", permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  // Finance must reach payroll to finalise/pay it and advances to disburse them
  // (§14) without holding hr.view — same any-of pattern as /admin/audit-logs.
  { prefix: "/hr/payroll", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { prefix: "/hr/staff-advances", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { prefix: "/hr", permission: PERMISSIONS.HR_VIEW },
  { prefix: "/ledger", permission: PERMISSIONS.LEDGER_VIEW },
  { prefix: "/treasury", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
  { prefix: "/loans/new", permission: PERMISSIONS.LOANS_CREATE },
  { prefix: "/loans", permission: PERMISSIONS.LOANS_VIEW },
  { prefix: "/repayments/cash-entry", permission: PERMISSIONS.REPAYMENTS_CASH_ENTRY },
  { prefix: "/repayments/suspense", permission: PERMISSIONS.REPAYMENTS_MANAGE },
  { prefix: "/repayments/reconciliation", permission: PERMISSIONS.REPAYMENTS_RECONCILE },
  { prefix: "/repayments", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { prefix: "/reports", permission: PERMISSIONS.REPORTS_VIEW },
];

export function getRequiredPermission(pathname: string): Permission | Permission[] | undefined {
  const matches = ROUTE_PERMISSIONS.filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (matches.length === 0) return undefined;
  return matches.reduce((longest, current) => (current.prefix.length > longest.prefix.length ? current : longest)).permission;
}
