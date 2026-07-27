import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import { hasPermission } from "@/config/permissions";
import type { RepaymentsNavItem } from "@/features/repayments/repayments-nav";

const ALL: { href: string; label: string; permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS] }[] = [
  { href: "/repayments", label: "All Payments", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { href: "/repayments/cash-entry", label: "Cash Entry", permission: PERMISSIONS.REPAYMENTS_CASH_ENTRY },
  { href: "/repayments/suspense", label: "Suspense", permission: PERMISSIONS.REPAYMENTS_MANAGE },
  { href: "/repayments/reconciliation", label: "Reconciliation", permission: PERMISSIONS.REPAYMENTS_RECONCILE },
];

export function repaymentsNavFor(user: AuthenticatedUser | null | undefined): RepaymentsNavItem[] {
  if (!user) return [];
  return ALL.filter((i) => hasPermission(user, i.permission)).map(({ href, label }) => ({ href, label }));
}
