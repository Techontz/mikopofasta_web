import { PERMISSIONS, type Permission, type AuthenticatedUser } from "@/types/auth";
import { hasAnyPermission } from "@/config/permissions";
import type { SectionNavItem } from "@/features/ledger/section-nav";

/** Payroll and advances are visible to Finance too — they own the money-movement steps (§14). */
const HR: { href: string; label: string; permissions: Permission[] }[] = [
  { href: "/hr", label: "Overview", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/staff", label: "Staff", permissions: [PERMISSIONS.HR_VIEW] },
  /*
   * Inactive Staff reads the same `GET /staff` as Staff and only filters it,
   * so it carries the same gate. It is not called "Rejected": this system's
   * employmentStatus has no such value — see the note on the page itself.
   */
  { href: "/hr/inactive-staff", label: "Inactive Staff", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/branches", label: "Branch & Staff", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/payroll", label: "Payroll", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/hr/commission", label: "Commission", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/staff-advances", label: "Loans & Advances", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  /*
   * Reading loans needs `hr.view`; §16.8 gives their disbursement to Finance,
   * exactly as it does an advance's, so this is on both grants now that the
   * lifecycle exists.
   */
  { href: "/hr/staff-loans", label: "Staff Loan", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  /* §12's revolving fund, and §17's "Staff Fund Balance". */
  { href: "/hr/staff-fund", label: "Staff Fund", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/performance", label: "Performance", permissions: [PERMISSIONS.HR_VIEW] },
];

export function hrNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return HR.filter((i) => hasAnyPermission(user, i.permissions)).map(({ href, label }) => ({ href, label }));
}
