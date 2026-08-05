"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LEGACY_TABS, isLegacyItemVisible, legacyMenuFor } from "@/config/legacy-nav";
import { useMobileNav } from "@/components/legacy/mobile-nav";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * The old system's left rail: tenant name, three tabs, then a flat icon+label
 * menu. Structure reproduced from screenshots; labels are spell-corrected —
 * see config/legacy-nav.ts.
 */
export function LegacySidebar({ user, tenantName }: { user: AuthenticatedUser; tenantName: string }) {
  const pathname = usePathname();
  /*
   * null means "nobody has clicked yet", which lets the section containing the
   * current page start open. Once the user picks, their choice wins — clicking
   * a group closed keeps it closed while they browse inside it.
   */
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const { open: mobileOpen } = useMobileNav();

  const tabs = LEGACY_TABS.filter((tab) => isLegacyItemVisible(user, tab));

  // "Report" and "HRM" own their whole subtree; everything else sits under Menu.
  const activeTab =
    pathname.startsWith("/reports") ? "Report" : pathname.startsWith("/hr") ? "HRM" : "Menu";

  /*
   * Each tab swaps the list beneath it, which is what the old rail does and
   * what this one previously did not — every tab showed the Menu list, so
   * Report and HRM looked identical to Menu once you were inside them.
   */
  const items = React.useMemo(
    () => legacyMenuFor(activeTab).filter((item) => isLegacyItemVisible(user, item)),
    [activeTab, user]
  );

  /**
   * Which single destination the current page belongs to.
   *
   * Matching each entry independently by prefix highlighted several at once:
   * on /treasury/transactions/approved both "Bank Transaction"
   * (/treasury/transactions) and "Approved Transaction" matched, and on
   * /admin/expense-categories both Settings (/admin) and Expenses did. Any
   * entry whose route is an ancestor of another entry's route had the same
   * problem.
   *
   * So the menu resolves one winner instead of asking each entry separately:
   * every visible route that is a prefix of the current path is a candidate,
   * and the longest — the most specific — wins. Exactly one entry can hold it.
   *
   * Plain equality would not do, because a detail page has no entry of its own:
   * /treasury/payroll/pay-1 has to light up Payroll, and /customers/abc has to
   * light up All Customer. Longest-prefix keeps those working while still
   * letting a more specific sibling take precedence when one exists.
   *
   * This is the same rule config/route-permissions.ts already uses to pick a
   * route's permission, for the same reason.
   */
  const currentHref = React.useMemo(() => {
    const covers = (href: string | null): href is string =>
      href !== null && (pathname === href || pathname.startsWith(`${href}/`));

    const candidates: string[] = [];
    for (const item of items) {
      if (covers(item.href)) candidates.push(item.href);
      for (const child of item.children ?? []) {
        if (!isLegacyItemVisible(user, child)) continue;
        if (covers(child.href)) candidates.push(child.href);
      }
    }
    return candidates.reduce<string | null>(
      (longest, href) => (href.length > (longest?.length ?? -1) ? href : longest),
      null
    );
  }, [items, pathname, user]);

  return (
    <aside
      id="legacy-sidebar"
      /*
       * A column on a wide screen, a drawer on a narrow one.
       *
       * Below `lg` it used to be `hidden` with nothing to reveal it, which left
       * every phone and tablet with no navigation at all. It is now positioned
       * off-canvas and slid in by MobileNavTrigger; at `lg` and up the
       * translate and the fixed positioning are dropped and it is the ordinary
       * static rail again, unchanged.
       */
      className={`fixed inset-y-0 left-0 z-50 flex w-[var(--lg-sidebar-w)] shrink-0 flex-col border-r transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:transition-none ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ borderColor: "var(--lg-line)", background: "var(--lg-surface)" }}
    >
      <div className="px-4 pb-3 pt-5">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[14px] font-bold tracking-wide"
          style={{ color: "var(--lg-icon-action)" }}
        >
          {tenantName}
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex px-2" style={{ borderBottom: "1px solid var(--lg-line)" }} role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            role="tab"
            aria-selected={activeTab === tab.label}
            data-active={activeTab === tab.label}
            className="lg-tab"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {items.map((item) => {
          const children = item.children?.filter((child) => isLegacyItemVisible(user, child)) ?? [];
          const expandable = children.length > 0;

          /*
           * A section whose entries are all hidden is dropped, not flattened.
           *
           * `expandable` is computed from the *visible* children, so a section
           * that permissions emptied fell through to the plain-link branch at
           * the bottom of this function and rendered a link to its own `href`.
           * That href is a grouping key — "/penalty", "/expenses",
           * "/hq/transactions" — and no page answers on it; the section's real
           * destinations are the entries underneath. The result would have been
           * a menu row that looks like every other one and lands on a 404.
           *
           * Today no section can reach that state, because each one's entries
           * carry the same permission the section itself is gated on. That is a
           * coincidence of the current configuration, not a property of it: the
           * first entry given a narrower permission than its parent would
           * reintroduce the bug silently. An empty section is nothing to click
           * anyway, so it is removed here rather than left to fall through.
           */
          if (item.children !== undefined && !expandable) return null;

          /*
           * A section is current when it owns the winning destination — either
           * as its own landing route or through one of its entries. Without the
           * second half, opening a section's entry left the section itself
           * unhighlighted and collapsed, so the menu disagreed with the page it
           * had just navigated to.
           */
          const active =
            currentHref !== null &&
            (item.href === currentHref || children.some((child) => child.href === currentHref));

          const open = expandable && (openMenu === item.label || (openMenu === null && active));

          const body = (
            <>
              <item.icon
                className="size-[17px] shrink-0"
                style={{ color: "var(--lg-icon)" }}
                strokeWidth={1.6}
                aria-hidden
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.expandable && (
                <ChevronRight
                  className="lg-chevron size-3 shrink-0"
                  style={{ color: "var(--lg-icon-faint)" }}
                  data-open={open}
                  aria-hidden
                />
              )}
            </>
          );

          /*
           * A row with children toggles its list instead of navigating away —
           * the section it would have opened is the first entry underneath.
           * Everything else behaves exactly as before.
           */
          if (expandable) {
            return (
              <div key={item.label}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenMenu(open ? "" : item.label)}
                  data-active={active}
                  className="lg-menu-item w-full text-left"
                >
                  {body}
                </button>
                <div className="lg-submenu" data-open={open}>
                  <div>
                    {children.map((child) => {
                      /*
                       * The old menu prefixes every submenu entry with "--".
                       *
                       * The label wraps rather than truncating: the longest
                       * entries — "Transfer Balance /Salary advance &
                       * disbursement Acc", "Today Withdrawal Insurance" —
                       * run to two lines in the original, and an ellipsis
                       * would hide which of two similarly-named screens this
                       * is. The dash stays on the first line.
                       */
                      const body = (
                        <>
                          <span className="lg-submenu-dash" aria-hidden>
                            --
                          </span>
                          <span className="min-w-0">{child.label}</span>
                        </>
                      );

                      return child.href ? (
                        <Link
                          key={child.label}
                          href={child.href}
                          tabIndex={open ? undefined : -1}
                          aria-hidden={open ? undefined : true}
                          /* Equality against the one resolved winner, so at
                             most one entry in the menu is ever current. */
                          data-active={child.href === currentHref}
                          aria-current={child.href === currentHref ? "page" : undefined}
                          className="lg-submenu-item"
                        >
                          {body}
                        </Link>
                      ) : (
                        <span
                          key={child.label}
                          data-inert="true"
                          aria-disabled="true"
                          className="lg-submenu-item"
                        >
                          {body}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          /*
           * An entry the old system has and this one does not serve yet is a
           * span, not a link: it keeps its place in the menu without offering
           * navigation that would 404.
           */
          return item.href ? (
            <Link key={item.label} href={item.href} data-active={active} className="lg-menu-item">
              {body}
            </Link>
          ) : (
            <span key={item.label} data-inert="true" className="lg-menu-item" aria-disabled="true">
              {body}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
