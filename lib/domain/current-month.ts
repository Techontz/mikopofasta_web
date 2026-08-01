import "server-only";

/**
 * The current month as `YYYY-MM`, read on the server.
 *
 * "New this month" needs a clock, and a clock read during a client render can
 * disagree with the one the server rendered against — a hydration mismatch that
 * only appears at a month boundary, which is to say never during testing.
 * Reading it once, here, and passing it down settles that.
 *
 * Lifted out of `lib/legacy/design-mode.ts` when that file was deleted: the
 * fallback it lived beside is gone, but this has nothing to do with fixtures.
 */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
