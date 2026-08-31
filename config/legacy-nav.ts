import type { LucideIcon } from "lucide-react";
import { Folder, House, List, Settings, User, Users } from "lucide-react";
import { PERMISSIONS, type AuthenticatedUser, type Permission } from "@/types/auth";
import { hasAnyPermission, hasPermission } from "@/config/permissions";
import { ADMIN_SECTIONS } from "@/config/admin-sections";
import { CAPITAL_SECTIONS } from "@/config/capital-sections";

/**
 * The sidebar of the system being migrated, reproduced from the screenshots.
 *
 * Structure is the old system's — the same groups, in the same order, with the
 * same entries under each. Spelling is not: the original menu carries typos
 * ("Penarty", "Headquater", "Insurelance", "Aproved", "Payrol", "Transfor")
 * and inconsistent casing, and those are corrected here on the owner's
 * instruction. What a migration must preserve is where a thing lives and what
 * it does; reproducing a typo preserves neither.
 *
 * EVERY ENTRY IN THIS FILE OPENS A PAGE. There are no `href: null` rows left.
 *
 * There used to be: entries the old system has and this one does not serve were
 * kept in place with a null href, rendering as inert spans on the reasoning
 * that a dead link is worse than an unlit one. Both are worse than not being
 * there. An unlit row still occupies the menu, still reads as a feature, and
 * still gets clicked — it just fails silently instead of loudly. The four that
 * remained (Staff Leave, Allowance, Deduction, Loan category) have no endpoint
 * at any layer and are documented where they were, in the HRM list below.
 *
 * A `href` on an EXPANDABLE row is a grouping key, not a destination — several
 * of them ("/penalty", "/expenses", "/hq/transactions") have no page. That is
 * fine: the sidebar renders an expandable row as a toggle button, never a link,
 * and uses the value only to decide which section owns the current URL. The row
 * is dropped entirely if permissions leave it with no visible entries, so it
 * can never fall through to the plain-link branch and offer that key as a
 * destination.
 */
export interface LegacyNavChild {
  label: string;
  href: string | null;
  permission?: Permission | Permission[];
}

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
  children?: LegacyNavChild[];
}

export const LEGACY_MENU: LegacyNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: House, expandable: false },
  {
    /*
     * "Administration", not "Settings".
     *
     * The section has always held the institution's configuration, and every
     * empty state in the product tells the officer where to go for it in those
     * words — "Add them under Administration → Master Data", and 26 more like
     * it, plus the fresh-install runbook, which is written as Administration →
     * this and Administration → that. The menu answered to a different name, so
     * an administrator following those instructions had nowhere to click. The
     * screens were reachable the whole time; the label was the only thing
     * hiding them.
     *
     * Renamed rather than added alongside: a second group listing the same
     * hrefs would be two doors into one room.
     */
    label: "Administration",
    href: "/admin",
    icon: Settings,
    expandable: true,
    permission: PERMISSIONS.ADMIN_ORG_SETTINGS,
    /*
     * Every entry in config/admin-sections.ts, in the order the old system
     * lists them. Menu and landing page read the same array so they can never
     * disagree about what exists or what a role sees — which is why the three
     * screens added for admin-managed reference data needed no menu change of
     * their own.
     */
    children: ADMIN_SECTIONS.map((section) => ({
      label: section.title,
      href: section.href,
      permission: section.permission,
    })),
  },
  {
    label: "Capital",
    href: "/capital/shareholders",
    icon: Folder,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    /* The six Capital entries, in the order the old sidebar lists them. */
    children: CAPITAL_SECTIONS.map((section) => ({
      label: section.title,
      href: section.href,
      permission: section.permission,
    })),
  },
  {
    label: "Bank",
    href: "/treasury",
    icon: Folder,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    /*
     * All nine Bank entries are served now, every one behind treasury.view —
     * the same gate as the section itself, so a role that can open Bank can
     * open everything under it.
     */
    children: [
      { label: "Register Account", href: "/treasury/accounts", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Account Balance", href: "/treasury/bank-accounts", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Bank Transaction", href: "/treasury/transactions", permission: PERMISSIONS.TREASURY_VIEW },
      {
        label: "Approved Transaction",
        href: "/treasury/transactions/approved",
        permission: PERMISSIONS.TREASURY_VIEW,
      },
      {
        label: "Transfer Balance / Branch Account",
        href: "/treasury/transfers/branch",
        permission: PERMISSIONS.TREASURY_VIEW,
      },
      {
        label: "Transfer Balance / Salary Advance & Disbursement Account",
        href: "/treasury/transfers/salary-advance",
        permission: PERMISSIONS.TREASURY_VIEW,
      },
      { label: "Register Bank Expenses", href: "/treasury/expenses", permission: PERMISSIONS.TREASURY_VIEW },
      {
        label: "Request Expenses",
        href: "/treasury/expenses/requests",
        permission: PERMISSIONS.TREASURY_VIEW,
      },
      { label: "Payroll", href: "/treasury/payroll", permission: PERMISSIONS.TREASURY_VIEW },

      /*
       * The four accounting screens — Decision Register D1.
       *
       * Added to the existing Bank group rather than given a group of their
       * own: they are treasury work, and a second sidebar section would split
       * "where the money is" from "what the books say about it".
       *
       * Gated more tightly than their neighbours, and deliberately not on
       * treasury.view — these act on the books. Reconciliation is the one
       * exception, because a teller must reach it to bank the day's cash and
       * holds no ledger grant.
       */
      {
        label: "Bank Reconciliation",
        href: "/treasury/reconciliation",
        permission: PERMISSIONS.REPAYMENTS_VIEW,
      },
      { label: "Accounting Periods", href: "/treasury/periods", permission: PERMISSIONS.LEDGER_VIEW },
      { label: "Reserve Fund", href: "/treasury/reserve", permission: PERMISSIONS.LEDGER_VIEW },
      { label: "Write-offs & Recovery", href: "/treasury/write-offs", permission: PERMISSIONS.LOANS_VIEW },
    ],
  },
  {
    label: "Salary Advance",
    href: "/salary-advance",
    icon: Folder,
    expandable: true,
    permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
    /* All six entries are served now, each behind the same pair the section
       itself uses. */
    children: [
      {
        label: "Salary Advance Category",
        href: "/salary-advance/categories",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
      {
        label: "Salary Advance Request",
        href: "/salary-advance/requests",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
      {
        label: "Salary Advance Approved",
        href: "/salary-advance/approved",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
      {
        label: "Active Salary Advance",
        href: "/salary-advance/active",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
      {
        label: "Salary Advance Repayment",
        href: "/salary-advance/repayments",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
      {
        label: "Salary Advance Paid List",
        href: "/salary-advance/paid",
        permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
      },
    ],
  },
  {
    label: "Penalty",
    href: "/penalty",
    icon: Folder,
    expandable: true,
    permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW],
    children: [
      { label: "Penalty List", href: "/penalty/list", permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW] },
      { label: "Paid Penalty", href: "/penalty/paid", permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW] },
    ],
  },
  {
    label: "Loan Fee",
    href: "/loan-fee",
    icon: Folder,
    expandable: true,
    permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW],
    children: [{ label: "Deducted Income", href: "/loan-fee/deducted-income", permission: [PERMISSIONS.LOANS_VIEW, PERMISSIONS.REPAYMENTS_VIEW] }],
  },
  {
    label: "Expenses",
    href: "/expenses",
    icon: List,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    children: [
      { label: "Register Branch Expenses", href: "/expenses/register", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "All Expenses Request", href: "/expenses/requests", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "All Approved Expenses", href: "/expenses/approved", permission: PERMISSIONS.TREASURY_VIEW },
    ],
  },
  {
    label: "Headquarters Expenses",
    href: "/hq/expenses",
    icon: List,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    children: [
      { label: "Register Expenses", href: "/hq/expenses/register", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "All Expenses Requested", href: "/hq/expenses/requests", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "All Approved Expenses", href: "/hq/expenses/approved", permission: PERMISSIONS.TREASURY_VIEW },
    ],
  },
  {
    label: "Headquarters Transaction",
    href: "/hq/transactions",
    icon: List,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    children: [
      { label: "Headquarters Account Balance", href: "/hq/transactions/balance", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Requested Transactions", href: "/hq/transactions/requests", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Approved Transactions", href: "/hq/transactions/approved", permission: PERMISSIONS.TREASURY_VIEW },
    ],
  },
  {
    label: "Customer",
    href: "/customers",
    icon: User,
    expandable: true,
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    children: [
      { label: "Register Customer", href: "/customers/new", permission: PERMISSIONS.CUSTOMERS_MANAGE },
      { label: "All Customer", href: "/customers", permission: PERMISSIONS.CUSTOMERS_VIEW },
      { label: "Customer Profile", href: "/customers/profile", permission: PERMISSIONS.CUSTOMERS_VIEW },
    ],
  },
  {
    label: "Group",
    href: "/groups",
    icon: Users,
    expandable: true,
    permission: PERMISSIONS.CUSTOMERS_VIEW,
    children: [{ label: "All Groups", href: "/groups", permission: PERMISSIONS.CUSTOMERS_VIEW }],
  },
  {
    label: "Loan",
    href: "/loans",
    icon: List,
    expandable: true,
    permission: PERMISSIONS.LOANS_VIEW,
    children: [
      { label: "Loan Application", href: "/loans/new", permission: PERMISSIONS.LOANS_CREATE },
      { label: "Loan Pending Approve", href: "/loans/pending", permission: PERMISSIONS.LOANS_VIEW },
      { label: "Loan Disbursed", href: "/loans/disbursed", permission: PERMISSIONS.LOANS_VIEW },
      { label: "Loan Withdrawal", href: "/loans/withdrawal", permission: PERMISSIONS.LOANS_VIEW },
      { label: "Loan Rejected", href: "/loans/rejected", permission: PERMISSIONS.LOANS_VIEW },
    ],
  },
  /* Teller and VISA carry no chevron in the screenshots — they are single
     destinations, not groups. */
  { label: "Teller", href: "/teller", icon: List, expandable: false, permission: PERMISSIONS.TREASURY_VIEW },
  {
    label: "Agent",
    href: "/agent/payment-modes",
    icon: Folder,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    children: [
      { label: "Payment Mode", href: "/agent/payment-modes", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Record Transaction", href: "/agent/transactions", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Deposit Transaction", href: "/agent/deposits", permission: PERMISSIONS.TREASURY_VIEW },
    ],
  },
  {
    label: "Insurance",
    href: "/insurance/movements",
    icon: Folder,
    expandable: true,
    permission: PERMISSIONS.TREASURY_VIEW,
    children: [
      { label: "Deposit & Withdrawal", href: "/insurance/movements", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Today Insurance", href: "/insurance/today", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Today Withdrawal Insurance", href: "/insurance/today-withdrawals", permission: PERMISSIONS.TREASURY_VIEW },
      { label: "Insurance Balance", href: "/insurance/balance", permission: PERMISSIONS.TREASURY_VIEW },
    ],
  },
  /*
   * The menu ends at VISA, exactly as the old one does.
   *
   * Two entries used to sit below this line — Repayment and Ledger — which were
   * this system's own modules rather than the legacy system's. Both have been
   * removed on the owner's instruction, along with their routes and their
   * feature code.
   */
  { label: "VISA", href: "/visa", icon: List, expandable: false, permission: PERMISSIONS.TREASURY_VIEW },
];

/**
 * The Report tab's menu, transcribed from the capture.
 *
 * Thirteen entries in the old system's order. Cash Transaction and Daily Report
 * carry the folder icon, which is how that menu marks a group that opens —
 * neither has been captured open, so what is inside them is unknown and they
 * are drawn as single entries for now.
 *
 * All thirteen are served now, each from its own captured screen. They sit at
 * readable slugs under /reports rather than at the legacy URLs, and they take
 * precedence over the API-backed /reports/[slug] route — which is correct:
 * these are the legacy reports, not the new system's.
 *
 * "Wright-off" is the old menu's spelling; corrected here, like every other
 * label this app draws.
 */
export const LEGACY_REPORT_MENU: LegacyNavItem[] = [
  { label: "Cash Transaction", href: "/reports/cash-transaction", icon: Folder, expandable: true, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Branch Wise Report", href: "/reports/branch-wise", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "File", href: "/reports/file", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Loan Pending", href: "/reports/loan-pending", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Loan Repayment", href: "/reports/loan-repayment", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Default Loan", href: "/reports/default-loan", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Write-off Loan", href: "/reports/write-off", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Loan Collection", href: "/reports/loan-collection", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Customer statement", href: "/reports/customer-statement", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Today Receivable", href: "/reports/today-receivable", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Today Received", href: "/reports/today-received", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Daily Report", href: "/reports/daily", icon: Folder, expandable: true, permission: PERMISSIONS.REPORTS_VIEW },
  { label: "Customer Development", href: "/reports/customer-development", icon: List, expandable: false, permission: PERMISSIONS.REPORTS_VIEW },
];

/**
 * The HRM tab's menu, transcribed from the capture.
 *
 * Eleven entries. The last two carry the gear icon rather than the list one —
 * the old menu marks a configuration screen that way, and the distinction is
 * kept because it tells a reader which entries change settings rather than
 * showing records.
 *
 * Four are served. The rest are inert for the same reason as the Report tab's.
 *
 * Note what is NOT here: this system's own /hr/commission and /hr/performance.
 * The legacy HRM menu has neither, and this list follows the capture.
 */
export const LEGACY_HRM_MENU: LegacyNavItem[] = [
  { label: "All active staff", href: "/hr/staff", icon: List, expandable: false, permission: PERMISSIONS.HR_VIEW },
  /*
   * The legacy label is "All Rejected staff". It is renamed here because
   * employmentStatus is active | suspended | terminated — there is no `rejected`,
   * and calling a terminated employee "rejected" would be a claim the data does
   * not make. Rename back once a true rejected status exists.
   */
  {
    label: "Inactive Staff",
    href: "/hr/inactive-staff",
    icon: List,
    expandable: false,
    permission: PERMISSIONS.HR_VIEW,
  },
  {
    label: "Branch & Staff",
    href: "/hr/branches",
    icon: List,
    expandable: false,
    permission: PERMISSIONS.HR_VIEW,
  },
  /*
   * Staff Leave, Staff Allowance, Staff Deduction and Staff Loan category are
   * NOT listed here, and the omission is deliberate.
   *
   * The legacy HRM menu has all four. They were carried over as rows with
   * `href: null`, which render as inert spans — menu items that sit in the list
   * looking like every other one and do nothing when clicked. That is a dead
   * menu item, and there is no version of it that is honest: it either reads as
   * broken or as "not for you", and neither is true. What is true is that the
   * feature does not exist yet.
   *
   * And it does not exist at any layer. A search of every route file in the API
   * for leave, allowance, deduction and loan-category matches nothing; Allowance
   * and Deduction exist as Eloquent models that feed PayrollLine, with no
   * controller, no route and no resource. There is no endpoint to point a page
   * at, so there is no page to link to.
   *
   * Restore these four rows — with real hrefs — on the day those endpoints ship.
   */
  { label: "Salary Sheet", href: "/hr/payroll", icon: List, expandable: false, permission: PERMISSIONS.HR_VIEW },
  {
    label: "Salary Advanced",
    href: "/hr/staff-advances",
    icon: List,
    expandable: false,
    permission: PERMISSIONS.HR_VIEW,
  },
  {
    label: "Staff Loan",
    href: "/hr/staff-loans",
    icon: List,
    expandable: false,
    permission: PERMISSIONS.HR_VIEW,
  },
  {
    label: "Staff salary advance category",
    href: "/salary-advance/categories",
    icon: Settings,
    expandable: false,
    permission: [PERMISSIONS.HR_VIEW, PERMISSIONS.PAYROLL_FINALIZE],
  },
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

/** The list a tab swaps in below itself. */
export function legacyMenuFor(tab: string): LegacyNavItem[] {
  if (tab === "Report") return LEGACY_REPORT_MENU;
  if (tab === "HRM") return LEGACY_HRM_MENU;
  return LEGACY_MENU;
}

export function isLegacyItemVisible(
  user: Pick<AuthenticatedUser, "role" | "extraPermissions">,
  item: { permission?: Permission | Permission[] }
): boolean {
  if (!item.permission) return true;
  return Array.isArray(item.permission)
    ? hasAnyPermission(user, item.permission)
    : hasPermission(user, item.permission);
}
