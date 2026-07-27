"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ADMIN_SECTIONS, isSectionVisible } from "@/config/admin-sections";
import type { AuthenticatedUser } from "@/types/auth";

export function AdminSubNav({ user }: { user: AuthenticatedUser }) {
  const pathname = usePathname();
  const sections = ADMIN_SECTIONS.filter((section) => isSectionVisible(user, section));

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <nav className="flex gap-1 border-b pb-2">
        {sections.map((section) => {
          const href = `/admin/${section.slug}`;
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={section.slug}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <section.icon className="size-4" />
              {section.title}
            </Link>
          );
        })}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
