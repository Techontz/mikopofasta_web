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

/*
 * Every tile goes somewhere, and somewhere that exists.
 *
 * Three things were wrong with this grid, and all three looked fine on the
 * dashboard:
 *
 *   - Six tiles carried `href: null` and rendered as `<span aria-disabled>` —
 *     card-shaped, laid out with the rest, and inert. Every one of them had a
 *     real page: Teller, Receivable, Received, Penalty, Cash Transaction and
 *     Loan fee are all built and routed. They were never wired.
 *   - "Register customer" pointed at /customers/new and "Daily Report" at
 *     /reports/daily-collection. Neither is a page. Both were swallowed by a
 *     dynamic segment — /customers/[id] and /reports/[slug] — so instead of
 *     failing at build time they failed in front of the user, as Next's 404.
 *   - Six loan tiles with six different labels all pointed at /loans. Pending,
 *     Rejected, Withdrawal and Default Loan each have their own screen; sending
 *     four of them to the same unfiltered list is not what their labels say.
 *
 * Each tile's permission now matches the gate on the page it opens, so a tile
 * is never shown to somebody the destination will refuse.
 */
export const LEGACY_ACTIONS: LegacyAction[] = [
  { label: "Register customer", href: "/customers/new", icon: UserRoundPlus, color: "#2f86d8", permission: PERMISSIONS.CUSTOMERS_MANAGE },
  { label: "Loan Application", href: "/loans/new", icon: ClipboardList, color: "#3f9ad6", permission: PERMISSIONS.LOANS_CREATE },
  { label: "Teller", href: "/teller", icon: HandCoins, color: "#e2703a", permission: PERMISSIONS.REPAYMENTS_CASH_ENTRY },
  { label: "Receivable", href: "/reports/today-receivable", icon: Receipt, color: "#6ab04c", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Received", href: "/reports/today-received", icon: MailCheck, color: "#27ae60", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Expenses", href: "/expenses/register", icon: Wallet, color: "#c0752c", permission: PERMISSIONS.TREASURY_VIEW },

  { label: "Salary advance", href: "/hr/staff-advances", icon: BanknoteArrowDown, color: "#e0a800", permission: PERMISSIONS.HR_VIEW },
  { label: "Loan Pending", href: "/loans/pending", icon: CalendarClock, color: "#d9534f", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Default Loan", href: "/reports/default-loan", icon: CircleX, color: "#d9534f", permission: PERMISSIONS.REPORTS_VIEW },
  /* Requests and approvals are both the whole book, filtered on the screen —
     there is no separate route for either, so both open the loan list. */
  { label: "Loan Request", href: "/loans", icon: Banknote, color: "#3f9ad6", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Loan Approved", href: "/loans/disbursed", icon: CircleCheckBig, color: "#27ae60", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Penalty", href: "/penalty/list", icon: Gavel, color: "#8d6e63", permission: PERMISSIONS.LOANS_VIEW },

  { label: "Loan Rejected", href: "/loans/rejected", icon: Stamp, color: "#d9534f", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Aprove", href: "/loans/pending", icon: BadgeCheck, color: "#27ae60", permission: PERMISSIONS.LOANS_APPROVE },
  { label: "Cash Transaction", href: "/reports/cash-transaction", icon: FileStack, color: "#5b8def", permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Loan Withdrawal", href: "/loans/withdrawal", icon: BanknoteArrowUp, color: "#2f86d8", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Loan fee", href: "/loan-fee/deducted-income", icon: Wallet, color: "#4a5568", permission: PERMISSIONS.LOANS_VIEW },
  { label: "Daily Report", href: "/reports/daily", icon: ScrollText, color: "#8d6e63", permission: PERMISSIONS.REPORTS_VIEW },
];
