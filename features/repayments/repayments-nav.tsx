"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface RepaymentsNavItem {
  href: string;
  label: string;
}

/**
 * Sub-navigation for the Repayments module — mirrors the route map's
 * `/repayments/{suspense,cash-entry,reconciliation}` split (frontend §10).
 * Items are pre-filtered server-side by permission before being passed in.
 */
export function RepaymentsNav({ items }: { items: RepaymentsNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
