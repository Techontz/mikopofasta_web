import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Users,
  ShieldCheck,
  Tags,
  HandCoins,
  Percent,
  CalendarClock,
  Receipt,
  BellRing,
  History,
} from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";

export interface AdminSection {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Sub-nav/landing-card visibility — most require org settings; audit logs also admits Auditors. */
  permission: Permission | Permission[];
}

/** Backs both the /admin landing page cards and the shared sub-nav in app/(dashboard)/admin/layout.tsx. */
export const ADMIN_SECTIONS: AdminSection[] = [
  { slug: "organization", title: "Organization Setup", description: "Company profile, regions, zones, and branches.", icon: Building2, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "users", title: "User Management", description: "Staff accounts, branch assignment, and access status.", icon: Users, permission: PERMISSIONS.USERS_MANAGE },
  { slug: "roles", title: "Roles & Permissions", description: "Role definitions and the system-wide permission matrix.", icon: ShieldCheck, permission: PERMISSIONS.ROLES_VIEW },
  { slug: "customer-categories", title: "Customer Categories", description: "KYC rule engine — risk tier, required docs, dynamic forms.", icon: Tags, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "loan-products", title: "Loan Products", description: "Interest, limits, tenure, mandate, and penalty configuration.", icon: HandCoins, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "interest-formulas", title: "Interest Formulas", description: "Simple, flat rate, and reducing balance calculation methods.", icon: Percent, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "repayment-schedules", title: "Repayment Schedules", description: "Daily, weekly, monthly, and group repayment cadences.", icon: CalendarClock, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "expense-categories", title: "Expense Categories", description: "Branch and HQ expense classifications.", icon: Receipt, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "notification-templates", title: "Notification Templates", description: "SMS and email templates for system-triggered events.", icon: BellRing, permission: PERMISSIONS.ADMIN_ORG_SETTINGS },
  { slug: "audit-logs", title: "Audit Logs", description: "Full system audit trail — who did what, and when.", icon: History, permission: [PERMISSIONS.ADMIN_ORG_SETTINGS, PERMISSIONS.AUDIT_VIEW] },
];

export function isSectionVisible(user: Pick<AuthenticatedUser, "role" | "extraPermissions">, section: AdminSection): boolean {
  return Array.isArray(section.permission) ? hasAnyPermission(user, section.permission) : hasPermission(user, section.permission);
}
