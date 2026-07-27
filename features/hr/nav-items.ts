import { PERMISSIONS, type Permission, type AuthenticatedUser } from "@/types/auth";
import { hasAnyPermission } from "@/config/permissions";
import type { SectionNavItem } from "@/features/ledger/section-nav";

/** Payroll and advances are visible to Finance too — they own the money-movement steps (§14). */
const HR: { href: string; label: string; permissions: Permission[] }[] = [
  { href: "/hr", label: "Overview", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/staff", label: "Staff", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/payroll", label: "Payroll", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/hr/commission", label: "Commission", permissions: [PERMISSIONS.HR_VIEW] },
  { href: "/hr/staff-advances", label: "Loans & Advances", permissions: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE] },
  { href: "/hr/performance", label: "Performance", permissions: [PERMISSIONS.HR_VIEW] },
];

export function hrNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return HR.filter((i) => hasAnyPermission(user, i.permissions)).map(({ href, label }) => ({ href, label }));
}
