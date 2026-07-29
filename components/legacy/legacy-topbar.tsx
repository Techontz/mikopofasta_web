"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, LogOut, Mail, MessageSquare, SlidersHorizontal } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
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
      className="flex h-[var(--lg-topbar-h)] shrink-0 items-center gap-4 border-b bg-white px-4"
      style={{ borderColor: "var(--lg-line)" }}
    >
      <Link
        href="/dashboard"
        className="hidden w-[calc(var(--lg-sidebar-w)-16px)] shrink-0 text-[13px] font-bold leading-none tracking-tight lg:block"
      >
        <span className="text-[#e8710a]">mikopofasta</span>
        <span className="text-[#4a9d2f]">software</span>
      </Link>

      <div className="relative w-full max-w-[300px]">
        <select
          aria-label="Select customer"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) router.push(`/customers/${e.target.value}`);
          }}
          className="h-11 w-full appearance-none rounded border bg-white px-3 pr-9 text-[15px] text-[#6b7075] outline-none focus:border-[#3c8dbc]"
          style={{ borderColor: "#ced4da" }}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7075]"
          aria-hidden
        />
      </div>

      <div className="ml-auto flex items-center gap-5 sm:gap-7">
        <IconAction label="Calendar" icon={CalendarDays} />
        <IconAction label="Messages" icon={MessageSquare} />
        <IconAction label="Mail" icon={Mail} dot="#2fa84f" />
        <IconAction label="Notifications" icon={Bell} dot={hasUnread ? "#2c2c2c" : undefined} />
        <IconAction label="Preferences" icon={SlidersHorizontal} />
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            className="block text-[#3d3d3d] transition-opacity hover:opacity-60"
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
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  dot?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative block text-[#3d3d3d] transition-opacity hover:opacity-60"
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
