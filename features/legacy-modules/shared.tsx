/**
 * Shared by the Agent, Insurance and VISA screens.
 *
 * This file used to hold a dozen small helpers — cell wrappers, a branch
 * filter, a choice filter, a status badge, a note about inferred layouts. Every
 * one of them had exactly one job: to make screens that could not load data
 * look as though they might. The filters filtered permanently empty tables and
 * offered branch names transcribed off a screenshot; the cell wrappers were
 * never called, because there were no cells.
 *
 * They are gone with the toolbars they sat beside. What is left is the one
 * thing those screens genuinely need: a way to say out loud that they are
 * waiting on a backend.
 */

/**
 * Says on the screen that the module has no backend yet.
 *
 * Agent, Insurance and VISA were built from screenshots of the old system while
 * the API for them did not exist — and still does not: none of the routes the
 * backend serves touches an agent, a savings account or a card. Their tables
 * are therefore hardcoded to `[]`, and every toolbar button on them used to be
 * rendered permanently `disabled`.
 *
 * A greyed-out Export button is a promise the software cannot keep. Someone
 * evaluating this system sees a toolbar and reads "this works, just not for
 * me" — the wrong conclusion, and one they only discover is wrong after
 * committing to it. So the buttons are gone and this stands in their place: the
 * columns still show what the screen will be, and the screen says why it is
 * empty.
 *
 * Delete this, restore the toolbar and wire the table the day the endpoints
 * ship.
 */
export function AwaitingBackendNote({ module: moduleName }: { module: string }) {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--st-radius-sm)] border border-dashed border-[var(--st-line-strong)] bg-[var(--st-subtle)] px-4 py-3 text-[13px] text-[var(--st-ink-soft)]"
    >
      <span className="font-medium text-[var(--st-ink)]">Awaiting backend.</span>
      <span>
        The {moduleName} module has no API yet, so this screen can show its layout but cannot load,
        record, filter or export anything. The columns below are the old system&rsquo;s.
      </span>
    </div>
  );
}
