"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, LogOut, Mail, MessageSquare, Moon, Sun } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";

export interface CustomerOption {
  id: string;
  label: string;
}

/**
 * The old system's top bar: wordmark, a customer jump-to selector, then six
 * icon actions at the right. Reproduced from screenshots.
 *
 * The two dotted icons (mail, bell) carry the same unread affordance the old
 * bar used — a small filled dot on the icon's top-right corner, not a count.
 *
 * One slot has changed meaning. The sixth action was "Preferences", an inert
 * button in the original screenshots and inert here; it is now the theme
 * control. Putting the toggle in an existing slot rather than appending a
 * seventh icon keeps the row's geometry identical to the screenshots, and
 * turning a dead control live costs nothing that was working.
 */
export function LegacyTopbar({
  customers,
  notifications,
}: {
  customers: CustomerOption[];
  notifications: AppNotification[];
}) {
  const router = useRouter();
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <header
      className="flex h-[var(--lg-topbar-h)] shrink-0 items-center gap-4 border-b px-4"
      style={{ borderColor: "var(--lg-line)", background: "var(--lg-surface)" }}
    >
      <Link
        href="/dashboard"
        className="hidden w-[calc(var(--lg-sidebar-w)-16px)] shrink-0 text-[13px] font-bold leading-none tracking-tight lg:block"
      >
        <span style={{ color: "var(--lg-brand-a)" }}>mikopofasta</span>
        <span style={{ color: "var(--lg-brand-b)" }}>software</span>
      </Link>

      {/* min-w-0 so the selector yields to the icon row on a narrow viewport
          instead of pushing it past the edge. */}
      <div className="relative w-full min-w-0 max-w-[300px]">
        <select
          aria-label="Select customer"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) router.push(`/customers/${e.target.value}`);
          }}
          className="h-11 w-full appearance-none rounded border px-3 pr-9 text-[15px] outline-none focus:border-[var(--lg-link)]"
          style={{
            borderColor: "var(--lg-ctrl-line)",
            background: "var(--lg-surface)",
            color: "var(--lg-ink-tab)",
          }}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
          style={{ color: "var(--lg-ink-tab)" }}
          aria-hidden
        />
      </div>

      {/*
        The icon row sheds its lowest-value actions before it wraps. Calendar
        and Messages are inert in the original too, so on a phone they are the
        first to go — the theme control and Log out always stay.
      */}
      <div className="ml-auto flex shrink-0 items-center gap-4 sm:gap-5 lg:gap-7">
        <IconAction label="Calendar" icon={CalendarDays} className="hidden md:block" />
        <IconAction label="Messages" icon={MessageSquare} className="hidden md:block" />
        <IconAction label="Mail" icon={Mail} dot="var(--lg-dot)" className="hidden sm:block" />
        <IconAction
          label="Notifications"
          icon={Bell}
          dot={hasUnread ? "var(--lg-ink-strong)" : undefined}
        />
        <ThemeToggle
          trigger={
            <button
              type="button"
              aria-label="Theme"
              title="Theme"
              className="relative block transition-opacity hover:opacity-60"
              style={{ color: "var(--lg-icon-action)" }}
            >
              <Sun className="size-[22px] dark:hidden" strokeWidth={1.5} aria-hidden />
              <Moon className="hidden size-[22px] dark:block" strokeWidth={1.5} aria-hidden />
            </button>
          }
        />
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            className="block transition-opacity hover:opacity-60"
            style={{ color: "var(--lg-icon-action)" }}
          >
            <LogOut className="size-[22px]" strokeWidth={1.5} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}

function IconAction({
  label,
  icon: Icon,
  dot,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  dot?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("relative block transition-opacity hover:opacity-60", className)}
      style={{ color: "var(--lg-icon-action)" }}
    >
      <Icon className="size-[22px]" strokeWidth={1.5} aria-hidden />
      {dot && (
        <span
          className="absolute -right-0.5 -top-0.5 size-2 rounded-full"
          style={{ background: dot }}
          aria-hidden
        />
      )}
    </button>
  );
}
