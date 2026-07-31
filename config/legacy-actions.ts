import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Banknote,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarClock,
  CircleCheckBig,
  CircleX,
  ClipboardList,
  FileStack,
  Gavel,
  HandCoins,
  MailCheck,
  Receipt,
  ScrollText,
  Stamp,
  UserRoundPlus,
  Wallet,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/types/auth";

/**
 * The eighteen shortcuts on the old dashboard, in the order they appear.
 *
 * Labels are transcribed from the screenshots, including the old system's
 * spelling and casing — "Aprove", "Loan Approved", "Penalty", "Loan fee".
 *
 * The old grid used colour illustrations (one PNG per tile). Those assets do
 * not ship with this repo, so each tile carries the closest line icon and the
 * tile's own colour. Dropping the original PNGs in and pointing `image` at
 * them is the only change needed to complete the match.
 */
export interface LegacyAction {
  label: string;
  href: string | null;
  icon: LucideIcon;
  color: string;
  permission?: Permission;
}

export const LEGACY_ACTIONS: LegacyAction[] = [
  { label: "Register customer", href: "/customers/new", icon: UserRoundPlus, color: "#2f86d8", permission: PERMISSIONS.CUSTOMERS_MANAGE },
  { label: "Loan Application", href: "/loans/new", icon: ClipboardList, color: "#3f9ad6", permission: PERMISSIONS.LOANS_CREATE },
  { label: "Teller", href: null, icon: HandCoins, color: "#e2703a", permission: PERMISSIONS.REPAYMENTS_CASH_ENTRY },
  { label: "Receivable", href: null, icon: Receipt, color: "#6ab04c", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { label: "Received", href: null, icon: MailCheck, color: "#27ae60", permission: PERMISSIONS.REPAYMENTS_VIEW },
  { label: "Expenses", href: "/admin/expense-categories", icon: Wallet, color: "#c0752c", permission: PERMISSIONS.ADMIN_ORG_SETTINGS },

  { label: "Salary advance", href: "/hr/staff-advances", icon: BanknoteArrowDown, color: "#e0a800", permission: PERMISSIONS.HR_VIEW },
  { label: "Loan Pending", href: "/loans", icon: CalendarClock, color: "#d9534f", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Default Loan", href: "/loans", icon: CircleX, color: "#d9534f", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Loan Request", href: "/loans", icon: Banknote, color: "#3f9ad6", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Loan Approved", href: "/loans", icon: CircleCheckBig, color: "#27ae60", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Penalty", href: null, icon: Gavel, color: "#8d6e63" },

  { label: "Loan Rejected", href: "/loans", icon: Stamp, color: "#d9534f", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Aprove", href: "/loans", icon: BadgeCheck, color: "#27ae60", permission: PERMISSIONS.LOANS_APPROVE },
  { label: "Cash Transaction", href: null, icon: FileStack, color: "#5b8def", permission: PERMISSIONS.REPAYMENTS_CASH_ENTRY },
  { label: "Loan Withdrawal", href: "/treasury", icon: BanknoteArrowUp, color: "#2f86d8", permission: PERMISSIONS.TREASURY_VIEW },
  { label: "Loan fee", href: null, icon: Wallet, color: "#4a5568" },
  { label: "Daily Report", href: "/reports/daily-collection", icon: ScrollText, color: "#8d6e63", permission: PERMISSIONS.REPORTS_VIEW },
];
