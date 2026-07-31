import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Landmark,
  UsersRound,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Undefined = visible to every authenticated user (e.g. Dashboard). Array = any one grants visibility. */
  permission?: Permission | Permission[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Matches the approved Information Architecture (module list + IA
 * recommendation). Each item's `permission` matches
 * config/route-permissions.ts exactly — nav visibility and route
 * enforcement are always a matched pair, never independently invented.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Customers & KYC",
    items: [{ label: "Customers", href: "/customers", icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW }],
  },
  {
    label: "Loans",
    items: [{ label: "Loans", href: "/loans", icon: HandCoins, permission: PERMISSIONS.LOANS_VIEW }],
  },
  {
    label: "Treasury",
    items: [{ label: "Treasury", href: "/treasury", icon: Landmark, permission: PERMISSIONS.TREASURY_VIEW }],
  },
  {
    label: "HR & Payroll",
    items: [{ label: "HR & Payroll", href: "/hr", icon: UsersRound, permission: PERMISSIONS.HR_VIEW }],
  },
  {
    label: "Reports",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW }],
  },
  {
    label: "Administration",
    items: [
      { label: "Administration", href: "/admin", icon: Settings, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ShieldCheck,
        permission: [PERMISSIONS.ADMIN_ORG_SETTINGS, PERMISSIONS.AUDIT_VIEW],
      },
    ],
  },
];

export function isNavItemVisible(user: Pick<AuthenticatedUser, "role" | "extraPermissions">, item: NavItem): boolean {
  if (!item.permission) return true;
  return Array.isArray(item.permission) ? hasAnyPermission(user, item.permission) : hasPermission(user, item.permission);
}
