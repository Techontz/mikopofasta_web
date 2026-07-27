"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  href: string;
  label: string;
}

/** Shared sub-navigation for the Ledger and Treasury sections (frontend §10). */
export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/ledger" && item.href !== "/treasury" && pathname.startsWith(`${item.href}/`));
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
