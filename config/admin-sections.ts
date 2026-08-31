import type { LucideIcon } from "lucide-react";
import { Building2, Database, GitBranch, HandCoins, MapPinned, Percent, Receipt, Scale, SlidersHorizontal, Tags, Vault } from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";

/**
 * The Settings menu, exactly as the system being migrated presents it.
 *
 * This list is workflow, not decoration — operators have navigated it for
 * years — so the entries, their order and their wording are reproduced
 * verbatim from the old system, including its spellings ("Interest Formula",
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
    title: "Interest Formula",
    description: "Simple, flat rate, and reducing balance calculation methods.",
    icon: Percent,
    href: "/admin/interest-formulas",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Customer Types",
    description: "The broad classifications a customer is registered under. Created and retired here; nothing is shipped with the application.",
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
    href: "/admin/loan-fees",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Penalty",
    description: "Penalty calculation type and amount.",
    icon: Scale,
    href: "/admin/penalty",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Reserve Setting",
    description: "Reserve percentage held against the portfolio.",
    icon: Vault,
    href: "/admin/reserve-setting",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  /*
   * APPENDED, not inserted. Everything above reproduces the legacy Settings
   * menu in its original order, and reordering it would change how people
   * work. Geography is a capability the old system did not have — it let an
   * officer type a ward — so it has no legacy position to take. It goes last.
   */
  {
    title: "Master Data",
    description: "Customer and account types, banks, ID and document types, sectors and cadres, employers. The institution's own reference data — this application ships none of it.",
    icon: Database,
    href: "/admin/master-data",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Registration & Eligibility",
    description: "What registration demands of a customer, and which loan products each category may borrow.",
    icon: SlidersHorizontal,
    href: "/admin/registration-rules",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Loan Approval Chain",
    description: "Who signs a loan off, and in what order. Configuration, not code.",
    icon: GitBranch,
    href: "/admin/approval-stages",
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
  },
  {
    title: "Geography",
    description: "Region → District → Ward → Street. Imported from a CSV; registration can only offer what these tables hold.",
    icon: MapPinned,
    href: "/admin/geography",
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
