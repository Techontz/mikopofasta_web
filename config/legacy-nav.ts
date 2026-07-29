import type { LucideIcon } from "lucide-react";
import { Folder, House, List, Settings, User, Users } from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { ADMIN_SECTIONS } from "@/config/admin-sections";

/**
 * The sidebar of the system being migrated, reproduced from the screenshots.
 *
 * Labels are transcribed exactly as they appear on screen, including the
 * spellings the old system uses — "Penarty", "Headquater". They are not
 * corrected here: operators read this menu by shape, and a migration that
 * silently fixes spelling is a migration the user can tell apart from the
 * original.
 *
 * `href: null` marks an entry the old system has and this one does not yet
 * serve. It renders identically and is inert rather than pointing at a page
 * that does not exist — a dead link is worse than an unlit one, and inventing
 * the page would be inventing the module.
 */
export interface LegacyNavItem {
  label: string;
  href: string | null;
  icon: LucideIcon;
  /** The old menu drew a chevron on every entry that opens a submenu. */
  expandable: boolean;
  permission?: Permission | Permission[];
  /**
   * Entries that actually open. The chevron is drawn on every expandable row
   * to match the original, but only a row with children unfolds — the rest
   * are single destinations, exactly as they were.
   */
  children?: { label: string; href: string | null; permission?: Permission | Permission[] }[];
}

export const LEGACY_MENU: LegacyNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House, expandable: false },
  {
    label: "Settings",
    href: "/admin",
    icon: Settings,
    expandable: true,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
    /*
     * The seven Settings entries, straight from config/admin-sections.ts, in
     * the order the old system lists them. Menu and landing page read the same
     * array so they can never disagree about what exists or what a role sees.
     */
    children: ADMIN_SECTIONS.map((section) => ({
      label: section.title,
      href: section.href,
      permission: section.permission,
    })),
  },
  { label: "Capital", href: "/treasury/capital", icon: Folder, expandable: true, permission: PERMISSIONS.TREASURY_VIEW },
  { label: "Bank", href: "/treasury/bank-accounts", icon: Folder, expandable: true, permission: PERMISSIONS.TREASURY_VIEW },
  { label: "Salary Advance", href: "/hr/staff-advances", icon: Folder, expandable: true, permission: PERMISSIONS.HR_VIEW },
  { label: "Penarty", href: null, icon: Folder, expandable: true },
  { label: "Loan Fee", href: null, icon: Folder, expandable: true },
  {
    label: "Expenses",
    href: "/admin/expense-categories",
    icon: List,
    expandable: true,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  { label: "Headquater Expenses", href: null, icon: List, expandable: true },
  { label: "Headquater Transaction", href: null, icon: List, expandable: true },
  { label: "Customer", href: "/customers", icon: User, expandable: true, permission: PERMISSIONS.CUSTOMERS_VIEW },
  { label: "Group", href: null, icon: Users, expandable: true },
  { label: "Loan", href: "/loans", icon: List, expandable: true, permission: PERMISSIONS.LOANS_VIEW },
  /*
   * Below the fold in the screenshots. The old menu continues past "Loan";
   * these are this system's remaining modules, carrying the same treatment so
   * nothing that works becomes unreachable from the sidebar.
   */
  { label: "Repayment", href: "/repayments", icon: List, expandable: true, permission: PERMISSIONS.REPAYMENTS_VIEW },
  { label: "Ledger", href: "/ledger", icon: List, expandable: true, permission: PERMISSIONS.LEDGER_VIEW },
];

/** The three tabs above the menu. Each swaps the list below it. */
export interface LegacyTab {
  label: string;
  href: string;
  permission?: Permission | Permission[];
}

export const LEGACY_TABS: LegacyTab[] = [
  { label: "Menu", href: "/dashboard" },
  { label: "Report", href: "/reports", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "HRM", href: "/hr", permission: PERMISSIONS.HR_VIEW },
];

export function isLegacyItemVisible(
  user: Pick<AuthenticatedUser, "role" | "extraPermissions">,
  item: { permission?: Permission | Permission[] }
): boolean {
  if (!item.permission) return true;
  return Array.isArray(item.permission)
    ? hasAnyPermission(user, item.permission)
    : hasPermission(user, item.permission);
}
