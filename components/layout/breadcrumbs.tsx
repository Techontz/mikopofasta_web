"use client";

import { Fragment, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NAV_GROUPS } from "@/config/nav";
import {
  getBreadcrumbLabelServerSnapshot,
  getBreadcrumbLabelSnapshot,
  subscribeToBreadcrumbLabel,
} from "@/lib/breadcrumb-store";

const LABEL_OVERRIDES: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((group) => group.items).map((item) => [item.href, item.label])
);

/**
 * Neutral placeholder for an entity segment in the one frame before the page
 * publishes its real label (and if a page ever forgets to). Keyed by the
 * parent route so it reads "Customer" rather than "Cust 1".
 */
const ENTITY_FALLBACKS: { prefix: string; label: string }[] = [
  { prefix: "/customers", label: "Customer" },
  { prefix: "/loans", label: "Loan" },
  { prefix: "/admin/users", label: "Staff" },
  { prefix: "/hr/staff", label: "Staff" },
  { prefix: "/hr/payroll", label: "Payroll Run" },
];

/** Generated ids ("je-14", "cust-ms31rpce-1") are never meaningful to a reader. */
function looksLikeEntityId(segment: string): boolean {
  return /\d/.test(segment) && segment.includes("-");
}

function labelFor(segment: string, href: string, parentHref: string): string {
  const override = LABEL_OVERRIDES[href];
  if (override) return override;

  if (looksLikeEntityId(segment)) {
    const fallback = ENTITY_FALLBACKS.find((f) => parentHref === f.prefix || parentHref.startsWith(`${f.prefix}/`));
    if (fallback) return fallback.label;
  }

  return segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const published = useSyncExternalStore(
    subscribeToBreadcrumbLabel,
    getBreadcrumbLabelSnapshot,
    getBreadcrumbLabelServerSnapshot
  );

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const parentHref = `/${segments.slice(0, index).join("/")}`;
    return { href, label: labelFor(segment, href, parentHref) };
  });

  // A published label always describes the deepest segment of its own route;
  // the pathname check stops a stale label leaking onto a different page.
  if (published && published.pathname === pathname) {
    crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], label: published.label };
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={crumb.href}>
              <BreadcrumbItem className="min-w-0">
                {isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="truncate">
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="shrink-0" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
