import type { LucideIcon } from "lucide-react";
import { Building2, HandCoins, Percent, Receipt, Scale, Tags, Vault } from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";

/**
 * The Settings menu, exactly as the system being migrated presents it.
 *
 * This list is workflow, not decoration — operators have navigated it for
 * years — so the entries, their order and their wording are reproduced
 * verbatim from the old system, including its spellings ("Interest Formular",
 * "Reserve Setting"). Nothing may be added here, and nothing reordered,
 * without that being a change to how people work.
 *
 * `href: null` marks an entry the old system serves and this one cannot yet:
 * it keeps its place in the menu rather than being quietly dropped.
 */
export interface AdminSection {
  /** Legacy label, shown in the menu and as the page title. */
  title: string;
  description: string;
  icon: LucideIcon;
  /** Existing route this entry opens, or null where no route serves it yet. */
  href: string | null;
  permission: Permission | Permission[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    title: "Branch",
    description: "Branches, and the region and zone hierarchy every record is scoped by.",
    icon: Building2,
    href: "/admin/organization",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Interest Formular",
    description: "Simple, flat rate, and reducing balance calculation methods.",
    icon: Percent,
    href: "/admin/interest-formulas",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Main Loan Category",
    description: "Customer categories — risk tier, required documents, and dynamic KYC fields.",
    icon: Tags,
    href: "/admin/customer-categories",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Loan Category",
    description: "Loan levels, interest, tenure, mandate, and penalty configuration.",
    icon: HandCoins,
    href: "/admin/loan-products",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Loan Fee",
    description: "Loan fee and insurance per loan category.",
    icon: Receipt,
    href: null,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Penalty",
    description: "Penalty calculation type and amount.",
    icon: Scale,
    href: null,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Reserve Setting",
    description: "Reserve percentage held against the portfolio.",
    icon: Vault,
    href: null,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
];

export function isSectionVisible(
  user: Pick<AuthenticatedUser, "role" | "extraPermissions">,
  section: Pick<AdminSection, "permission">
): boolean {
  return Array.isArray(section.permission)
    ? hasAnyPermission(user, section.permission)
    : hasPermission(user, section.permission);
}
