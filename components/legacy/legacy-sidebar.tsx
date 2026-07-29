"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LEGACY_MENU, LEGACY_TABS, isLegacyItemVisible } from "@/config/legacy-nav";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * The old system's left rail: tenant name, three tabs, then a flat icon+label
 * menu. Reproduced from screenshots — see config/legacy-nav.ts for why the
 * labels are spelled the way they are.
 */
export function LegacySidebar({ user, tenantName }: { user: AuthenticatedUser; tenantName: string }) {
  const pathname = usePathname();
  /*
   * null means "nobody has clicked yet", which lets the section containing the
   * current page start open. Once the user picks, their choice wins — clicking
   * a group closed keeps it closed while they browse inside it.
   */
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  const items = LEGACY_MENU.filter((item) => isLegacyItemVisible(user, item));
  const tabs = LEGACY_TABS.filter((tab) => isLegacyItemVisible(user, tab));

  // "Report" and "HRM" own their whole subtree; everything else sits under Menu.
  const activeTab =
    pathname.startsWith("/reports") ? "Report" : pathname.startsWith("/hr") ? "HRM" : "Menu";

  return (
    <aside
      className="hidden w-[var(--lg-sidebar-w)] shrink-0 flex-col border-r bg-white lg:flex"
      style={{ borderColor: "var(--lg-line)" }}
    >
      <div className="px-4 pb-3 pt-5">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[14px] font-bold tracking-wide text-[#3d3d3d]"
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
          const active = item.href
            ? pathname === item.href || pathname.startsWith(`${item.href}/`)
            : false;
          const children = item.children?.filter((child) => isLegacyItemVisible(user, child)) ?? [];
          const expandable = children.length > 0;
          const open = expandable && (openMenu === item.label || (openMenu === null && active));

          const body = (
            <>
              <item.icon className="size-[17px] shrink-0 text-[#7b8087]" strokeWidth={1.6} aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {item.expandable && (
                <ChevronRight
                  className="lg-chevron size-3 shrink-0 text-[#a8adb3]"
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
                      /* The old menu prefixes every Settings entry with "--". */
                      const body = (
                        <>
                          <span className="lg-submenu-dash" aria-hidden>
                            --
                          </span>
                          <span className="truncate">{child.label}</span>
                        </>
                      );

                      return child.href ? (
                        <Link
                          key={child.label}
                          href={child.href}
                          tabIndex={open ? undefined : -1}
                          aria-hidden={open ? undefined : true}
                          data-active={pathname === child.href || pathname.startsWith(`${child.href}/`)}
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
