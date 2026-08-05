import { PERMISSIONS, type Permission } from "@/types/auth";

/**
 * Single source of truth for "which permission does this route need" —
 * consumed by BOTH proxy.ts (actual enforcement) and config/legacy-nav.ts (nav
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
  // Salary Advance is the same work as staff advances, so it carries the same
  // gate — a role that can see one can see the other.
  { prefix: "/salary-advance", permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  // Penalty and Loan Fee are loan work; the expense and headquarters
  // transaction sections are money movement, gated like the rest of treasury.
  { prefix: "/penalty", permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW] },
  { prefix: "/loan-fee", permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW] },
  { prefix: "/expenses", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/hq", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/hr", permission: PERMISSIONS.HR_VIEW },
  /*
   * The four accounting screens sit under /treasury but are NOT treasury.view
   * work — Decision Register D1. Listed before the section itself only for
   * readability; matching picks the longest prefix, so these win regardless.
   *
   * Reconciliation is the one that matters most here. A teller banks the day's
   * cash and holds neither treasury.view nor ledger.view, so without its own
   * entry the section gate would redirect them away from their own workflow —
   * which is exactly what happened before this was added.
   */
  { prefix: "/treasury/reconciliation", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { prefix: "/treasury/periods", permission: PERMISSIONS.LEDGER_VIEW },
  { prefix: "/treasury/reserve", permission: PERMISSIONS.LEDGER_VIEW },
  { prefix: "/treasury/write-offs", permission: PERMISSIONS.LOANS_VIEW },
  { prefix: "/treasury", permission: PERMISSIONS.TREASURY_VIEW },
  // Capital is treasury work, not administration: it sits at its own prefix
  // so it is not caught by the /admin rule's admin.org_settings requirement.
  { prefix: "/capital", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
  // Groups are customer work — a group is a set of customers who guarantee
  // each other — so they ride on customers.view rather than a permission of
  // their own.
  { prefix: "/groups", permission: PERMISSIONS.CUSTOMERS_VIEW },
  /*
   * Teller, Agent, Insurance and VISA all handle money moving through a branch,
   * so they ride on treasury.view. None has ever been captured from the legacy
   * system, so the permission is a judgement rather than a reproduction — if a
   * capture later shows these are branch-officer screens, this is the line to
   * revisit.
   */
  { prefix: "/teller", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/agent", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/insurance", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/visa", permission: PERMISSIONS.TREASURY_VIEW },
  { prefix: "/loans/new", permission: PERMISSIONS.LOANS_CREATE },
  { prefix: "/loans", permission: PERMISSIONS.LOANS_VIEW },
  { prefix: "/reports", permission: PERMISSIONS.REPORTS_VIEW },
];

export function getRequiredPermission(pathname: string): Permission | Permission[] | undefined {
  const matches = ROUTE_PERMISSIONS.filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (matches.length === 0) return undefined;
  return matches.reduce((longest, current) => (current.prefix.length > longest.prefix.length ? current : longest)).permission;
}
