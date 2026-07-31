"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  href: string;
  label: string;
}

/**
 * Shared sub-navigation for the Ledger and Treasury sections (frontend §10).
 *
 * One component, two skins. The `st-section-nav` hook is inert outside a
 * `.st-scope` subtree; inside one, globals.css repaints it from the
 * configuration tokens. That keeps a single implementation — and a single set
 * of active-route rules — rather than a near-copy per surface.
 *
 * The rail scrolls rather than wraps: a second row of tabs pushes the page
 * content down and reads as a different component.
 */
/**
 * Which tab is lit for the current path.
 *
 * The longest matching tab wins, which is what makes a rail whose first tab is
 * the module root work: on /loans/pending both "/loans" and "/loans/pending"
 * match by prefix, and only the second should light. Previously this was
 * handled by naming the two known offenders — /ledger and /treasury — in the
 * condition, which meant every rail added after that quietly lit two tabs.
 */
function isActive(pathname: string, href: string, items: SectionNavItem[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !items.some(
    (other) =>
      other.href !== href &&
      other.href.length > href.length &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`))
  );
}

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname();
  const ref = React.useRef<HTMLElement | null>(null);
  const [overflowing, setOverflowing] = React.useState(false);

  /*
   * A rail wider than its container is scrollable, and the last tab lands
   * hard-cut against the edge — which reads as a clipping bug rather than as
   * "there is more this way". Measuring lets globals.css fade the edge instead,
   * and only when there is actually something beyond it.
   */
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length]);

  return (
    <nav
      ref={ref}
      data-overflowing={overflowing}
      className="st-section-nav flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Section"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href, items);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-active={active}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition-colors",
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
