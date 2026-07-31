import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Banknote, CheckCircle2, Landmark, Users, Wallet } from "lucide-react";
import { PERMISSIONS, type Permission } from "@/types/auth";

/**
 * The Capital menu, exactly as the system being migrated presents it.
 *
 * Like Settings, this list is workflow: the entries, their order and their
 * wording come from the legacy sidebar and are not to be rearranged. Its
 * spellings are kept — "Approved Float", "Float Ac-Ac".
 */
export interface CapitalSection {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string | null;
  permission: Permission;
}

export const CAPITAL_SECTIONS: CapitalSection[] = [
  {
    title: "Share Holders",
    description: "The people holding equity in the company.",
    icon: Users,
    href: "/capital/shareholders",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
  {
    title: "Add Capitals",
    description: "Record capital paid in by a shareholder.",
    icon: Wallet,
    href: "/capital/contributions",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
  {
    title: "Float",
    description: "Move float from the company account to a branch.",
    icon: Banknote,
    href: "/capital/float",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
  {
    title: "Float Branch To Branch",
    description: "Transfers between branches, pending approval.",
    icon: ArrowLeftRight,
    href: "/capital/float-branch",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
  {
    title: "Approved Float",
    description: "Branch transfers that have been approved.",
    icon: CheckCircle2,
    href: "/capital/float-approved",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
  {
    title: "Float Ac-Ac",
    description: "Move float between two accounts of a branch.",
    icon: Landmark,
    href: "/capital/float-accounts",
    permission: PERMISSIONS.TREASURY_VIEW,
  },
];
