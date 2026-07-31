import type { StatusTone } from "@/components/settings";
import type { ApprovalStatus } from "@/types/operations";

/**
 * What the five operational modules share.
 *
 * Approval means the same thing on a branch expense, a headquarters expense and
 * a headquarters transaction, so it gets one tone map and one set of labels —
 * a reader learns the palette once and it holds across the section.
 */
export const APPROVAL_TONE: Record<ApprovalStatus, StatusTone> = {
  pending: "warning",
  approved: "active",
  rejected: "danger",
};

export const APPROVAL_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Pinned locale and zone so a server render and its hydration agree (#418). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatOpsDate(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : DATE.format(parsed);
}

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

/** "2026-07" → "Jul 26", for chart axis labels. */
export function formatMonthShort(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return MONTH.format(new Date(Date.UTC(year, month - 1, 1)));
}
