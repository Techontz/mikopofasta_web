import { FlaskConical } from "lucide-react";

/**
 * Says, on the screen itself, that what you are looking at is not live data.
 *
 * The point of the design-mode fallback is that a screen still renders when the
 * API is down. The risk that creates is somebody reading placeholder figures as
 * the business's real numbers — so the substitution is never silent, and this
 * banner is the half of it that the user actually sees.
 *
 * Worded as a statement of fact rather than a warning: nothing is broken from
 * the reader's point of view, the backend simply is not connected yet.
 */
export function DesignDataBanner({ reason }: { reason?: string | null }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--st-radius-sm)] border border-dashed border-[var(--st-line-strong)] bg-[var(--st-subtle)] px-4 py-3 text-[13px] text-[var(--st-ink-soft)]"
    >
      <FlaskConical className="size-4 shrink-0 text-[var(--st-ink-faint)]" aria-hidden />
      <span className="font-medium text-[var(--st-ink)]">Design data.</span>
      <span>
        The backend is not connected, so this screen is showing fixture values transcribed from the
        legacy system. Nothing here is live, and nothing you do is saved.
      </span>
      {reason && <span className="text-[var(--st-ink-faint)]">{reason}</span>}
    </div>
  );
}
