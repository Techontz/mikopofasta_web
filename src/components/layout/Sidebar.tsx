"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import type { CrmBadges } from "@/components/crm/types";
import { HRM_ROLES, useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { crmMenu, menu, type MenuBadge, type MenuItem, type MenuLink, type MenuTab } from "@/lib/menu";

/** Red count beside a CRM queue; nothing when the queue is empty. */
function Count({ badge, counts }: { badge?: MenuBadge; counts?: CrmBadges }) {
  const value = badge && counts ? counts[badge] : 0;
  return value > 0 ? <span className="badge badge-danger float-right ml-1">{value}</span> : null;
}

/** A closed group shows how much waits in its queues altogether. */
function GroupCount({ links, counts }: { links: MenuLink[]; counts: CrmBadges }) {
  const total = links.reduce((sum, link) => sum + (link.badge ? counts[link.badge] : 0), 0);
  return total > 0 ? <span className="badge badge-danger ml-1">{total}</span> : null;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

/** Among sibling links, only the most specific match is active (e.g. /teller/bank-deposits, not also /teller). */
function isActiveChild(pathname: string, href: string, siblings: MenuLink[]): boolean {
  return isActive(pathname, href) && !siblings.some((sibling) => sibling.href.length > href.length && isActive(pathname, sibling.href));
}

/**
 * HRM tab only for HR, Admin and Super Admin (enhancement §14, by the role the session acts as). Other roles keep the HRM
 * entries their permissions allow (Finance's payroll, everyone's own requests) in a Payroll & Staff group of the Menu tab.
 */
function withoutHrmTab(tabs: MenuTab[], showsHrm: boolean): MenuTab[] {
  const hrm = tabs.find((tab) => tab.key === "setting");
  if (showsHrm || !hrm) {
    return tabs;
  }
  const moved: MenuItem = {
    label: "Payroll & Staff",
    icon: "icon-briefcase",
    children: hrm.items.filter((item) => item.href).map((item) => ({ label: item.label, href: item.href as string, permission: item.permission, roles: item.roles })),
  };

  return tabs
    .filter((tab) => tab.key !== "setting")
    .map((tab) => (tab.key === "menu" ? { ...tab, items: [...tab.items, moved] } : tab));
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, can, logout } = useAuth();

  const roleKey = user?.role?.key ?? "";
  const allowed = (entry: MenuItem | MenuLink) => (!entry.permission || can(entry.permission)) && (!entry.roles || entry.roles.includes(roleKey));
  const { data: counts } = useApi<CrmBadges>(user && can("crm.use") ? "crm/badges" : null);

  const tabs = useMemo(
    () =>
      withoutHrmTab(user?.role?.key === "crm" ? crmMenu : menu, HRM_ROLES.includes(roleKey))
        .map((tab) => ({
          ...tab,
          items: tab.items
            .map((item) => (item.children ? { ...item, children: item.children.filter(allowed) } : item))
            .filter((item) => allowed(item) && (!item.children || item.children.length > 0)),
        }))
        .filter((tab) => tab.items.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  const tabForPath =
    tabs.find((tab) => tab.items.some((item) => (item.href && isActive(pathname, item.href)) || item.children?.some((child) => isActive(pathname, child.href))))?.key ??
    tabs[0]?.key;

  const groupForPath = tabs.flatMap((tab) => tab.items).find((item) => item.children?.some((child) => isActive(pathname, child.href)))?.label ?? null;

  const [activeTab, setActiveTab] = useState<string | undefined>(tabForPath);
  const [openGroup, setOpenGroup] = useState<string | null>(groupForPath);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [syncedPath, setSyncedPath] = useState(`${pathname}|${tabForPath}`);

  if (syncedPath !== `${pathname}|${tabForPath}`) {
    setSyncedPath(`${pathname}|${tabForPath}`);
    setActiveTab(tabForPath);
    setOpenGroup(groupForPath);
  }

  return (
    <div id="left-sidebar" className="sidebar">
      <div className="sidebar-scroll">
        <div className="user-account">
          <div className={`dropdown ${accountMenuOpen ? "show" : ""}`}>
            <a href="#" className="dropdown-toggle user-name" onClick={(e) => { e.preventDefault(); setAccountMenuOpen(!accountMenuOpen); }}>
              <strong>{user?.company.name.toUpperCase()}</strong>
            </a>
            <ul className={`dropdown-menu account list-unstyled ${accountMenuOpen ? "show" : ""}`}>
              <li><a href="#" onClick={(e) => e.preventDefault()}><i className="icon-user" />{user?.full_name}</a></li>
              <li><a href="#" onClick={(e) => e.preventDefault()}><i className="icon-badge" />{user?.role?.name}{user?.branch ? ` · ${user.branch.name}` : ""}</a></li>
              <li><Link href="/settings/company"><i className="icon-settings" />Settings</Link></li>
              <li className="divider" />
              <li><a href="#" onClick={(e) => { e.preventDefault(); logout(); }}><i className="icon-power" />Logout</a></li>
            </ul>
          </div>
        </div>

        <ul className="nav nav-tabs">
          {tabs.map((tab) => (
            <li className="nav-item" key={tab.key}>
              <a href="#" className={`nav-link ${activeTab === tab.key ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveTab(tab.key); }}>
                {tab.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="tab-content p-l-0 p-r-0">
          {tabs.map((tab) => (
            <div className={`tab-pane ${activeTab === tab.key ? "active" : ""}`} key={tab.key} style={{ display: activeTab === tab.key ? "block" : "none" }}>
              <nav className="sidebar-nav">
                <ul className="metismenu">
                  {tab.items.map((item) =>
                    item.children ? (
                      <li key={item.label} className={`${openGroup === item.label ? "open" : ""} ${item.children.some((child) => isActive(pathname, child.href)) ? "active" : ""}`}>
                        <a href="#" className="has-arrow" onClick={(e) => { e.preventDefault(); setOpenGroup(openGroup === item.label ? null : item.label); }}>
                          <i className={item.icon} /> <span>{item.label}</span>
                          {counts && <GroupCount links={item.children} counts={counts} />}
                        </a>
                        <ul className="collapse">
                          {item.children.map((child) => (
                            <li key={child.href} className={isActiveChild(pathname, child.href, item.children ?? []) ? "active" : ""}>
                              <Link href={child.href}>{child.label}<Count badge={child.badge} counts={counts} /></Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ) : (
                      <li key={item.label} className={item.href && isActive(pathname, item.href) ? "active" : ""}>
                        <Link href={item.href ?? "#"}>
                          <i className={item.icon} /> <span>{item.label}</span>
                          <Count badge={item.badge} counts={counts} />
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </nav>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
