"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { clearBreadcrumbLabel, setBreadcrumbLabel } from "@/lib/breadcrumb-store";

/**
 * Rendered by a detail page to publish the entity's real name to the header
 * breadcrumb. Renders nothing itself.
 *
 * Writing to an external store (not component state) is exactly what an
 * effect is for, so this doesn't trip the cascading-render rule.
 */
export function BreadcrumbLabel({ label }: { label: string }) {
  const pathname = usePathname();

  React.useEffect(() => {
    setBreadcrumbLabel(pathname, label);
    return () => clearBreadcrumbLabel(pathname);
  }, [pathname, label]);

  return null;
}
