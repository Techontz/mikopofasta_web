"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CustomerJump } from "@/components/legacy/customer-jump";
import { MobileNavTrigger } from "@/components/legacy/mobile-nav";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification";

/**
 * The old system's top bar: wordmark, a customer jump-to box, then the icon
 * actions at the right. Reproduced from screenshots.
 *
 * Two things here are deliberately NOT the screenshots.
 *
 * The selector is a search box rather than a `<select>`. The original lists
 * every customer; reproducing that meant the layout fetching the whole customer
 * book — page by page, up to fifty round trips — before any screen in the
 * application could paint. See `CustomerJump`.
 *
 * And the row is three icons shorter. Calendar, Messages and Mail were inert in
 * the original and were reproduced inert, which made three of the six controls
 * in the application's permanent chrome do nothing on every page. There is no
 * calendar, no messaging and no mailbox behind this product, so they are gone
 * rather than mimed. The Preferences slot went the other way and became the
 * theme control — a dead control turned live.
 */
export function LegacyTopbar({ notifications }: { notifications: AppNotification[] }) {
  return (
    <header
      className="flex h-[var(--lg-topbar-h)] shrink-0 items-center gap-4 border-b px-4"
      style={{ borderColor: "var(--lg-line)", background: "var(--lg-surface)" }}
    >
      <MobileNavTrigger />

      <Link
        href="/dashboard"
        className="hidden w-[calc(var(--lg-sidebar-w)-16px)] shrink-0 text-[13px] font-bold leading-none tracking-tight lg:block"
      >
        <span style={{ color: "var(--lg-brand-a)" }}>mikopofasta</span>
        <span style={{ color: "var(--lg-brand-b)" }}>software</span>
      </Link>

      {/* min-w-0 so the box yields to the icon row on a narrow viewport
          instead of pushing it past the edge. */}
      <CustomerJump />

      <div className="ml-auto flex shrink-0 items-center gap-4 sm:gap-5 lg:gap-7">
        <NotificationBell notifications={notifications} />
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

/**
 * The bell, which now opens.
 *
 * It carried an unread dot and no click handler, so the one control in the bar
 * that told the reader something had happened gave them no way to find out
 * what. The list it opens is whatever the layout passed in.
 *
 * There is no notifications endpoint yet — `lib/api/notifications.ts` says so
 * at length — so this can read but not mark-as-read: an action that cannot
 * persist would lie the moment the page reloaded. The panel says where the
 * list comes from instead of pretending to be complete.
 */
function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  React.useEffect(() => {
    if (!open) return;
    /* Click-away is FloatingPanel's — the panel is portalled, so a check
       against this subtree would close it on every click inside. Escape stays
       here: it is a document-level key, not a hit test. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="relative block transition-opacity hover:opacity-60"
        style={{ color: "var(--lg-icon-action)" }}
      >
        <Bell className="size-[22px]" strokeWidth={1.5} aria-hidden />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full"
            style={{ background: "var(--lg-ink-strong)" }}
            aria-hidden
          />
        )}
      </button>

      <FloatingPanel
        anchorRef={ref}
        open={open}
        onDismiss={() => setOpen(false)}
        /* Its own width, right-aligned to the bell: the trigger is an icon and
           matching its width would give a 22px panel. */
        matchWidth={false}
        align="end"
        offset={8}
        className="w-80 rounded border shadow-lg"
        style={{ borderColor: "var(--lg-ctrl-line)", background: "var(--lg-surface)" }}
      >
        <div role="dialog" aria-label="Notifications">
          <p
            className="border-b px-3 py-2 text-[12px] font-semibold uppercase tracking-wide"
            style={{ borderColor: "var(--lg-ctrl-line)", color: "var(--lg-ink-tab)" }}
          >
            Notifications{unread > 0 && ` · ${unread} unread`}
          </p>
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-[13px]" style={{ color: "var(--lg-ink-tab)" }}>
              Nothing to show.
            </p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="border-b px-3 py-2.5 last:border-b-0"
                  style={{ borderColor: "var(--lg-ctrl-line)" }}
                >
                  <p
                    className={cn("text-[13.5px]", !n.read && "font-semibold")}
                    style={{ color: "var(--lg-ink-tab)" }}
                  >
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[12px] opacity-75" style={{ color: "var(--lg-ink-tab)" }}>
                    {n.description}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </FloatingPanel>
    </div>
  );
}
