/**
 * Date and period formatting for the accounting screens.
 *
 * Deliberately NOT a `"use client"` module, and that is the whole point of it
 * living apart from `shared.tsx`. These are plain functions, and both the
 * Server Components (the Treasury overview, the periods page) and the Client
 * Components (the tables, the close dialog) call them. A `"use client"` file
 * exports client references, so calling one of these from a server render fails
 * at request time with "Attempted to call formatPeriod() from the server" —
 * which type-checks, lints and builds cleanly, and only shows up when the page
 * is actually rendered.
 *
 * Every formatter pins the time zone and the locale. An unpinned Intl formatter
 * renders differently on the server and the client, and React refuses the
 * hydration (#418) — the same discipline the float and treasury screens follow.
 */

export const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const PERIOD_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string | null | undefined): string {
  return iso ? DATE_ONLY.format(new Date(iso)) : "—";
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? DATE_TIME.format(new Date(iso)) : "—";
}

/**
 * `2026-07` → `July 2026`.
 *
 * Built from a UTC midnight on the first of the month so the pinned formatter
 * cannot roll it back into the previous month in a western time zone.
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return PERIOD_LABEL.format(new Date(Date.UTC(year, month - 1, 1)));
}
