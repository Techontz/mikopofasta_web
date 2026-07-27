import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import { hasPermission } from "@/config/permissions";
import type { SectionNavItem } from "@/features/ledger/section-nav";

const LEDGER: { href: string; label: string; permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS] }[] = [
  { href: "/ledger", label: "Trial Balance", permission: PERMISSIONS.LEDGER_VIEW },
  { href: "/ledger/entries", label: "Journal Entries", permission: PERMISSIONS.LEDGER_VIEW },
  { href: "/ledger/sub-ledgers", label: "Sub-Ledgers", permission: PERMISSIONS.LEDGER_VIEW },
  { href: "/ledger/reversals", label: "Reversals", permission: PERMISSIONS.LEDGER_VIEW },
];

const TREASURY: { href: string; label: string; permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS] }[] = [
  { href: "/treasury", label: "Overview", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/bank-accounts", label: "Bank Accounts", permission: PERMISSIONS.TREASURY_VIEW },
  { href: "/treasury/capital", label: "Capital & Dividends", permission: PERMISSIONS.TREASURY_VIEW },
];

export function ledgerNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return LEDGER.filter((i) => hasPermission(user, i.permission)).map(({ href, label }) => ({ href, label }));
}

export function treasuryNavFor(user: AuthenticatedUser | null | undefined): SectionNavItem[] {
  if (!user) return [];
  return TREASURY.filter((i) => hasPermission(user, i.permission)).map(({ href, label }) => ({ href, label }));
}
