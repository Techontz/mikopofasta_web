/**
 * A deterministic pseudo-random generator for the demo data.
 *
 * Every figure in the ERP demo is generated, and all of it has to be IDENTICAL
 * on the server and in the browser. `Math.random()` cannot do that: the server
 * renders one number, the client hydrates with another, and React tears the
 * tree down with a hydration mismatch. The same applies to `new Date()` — hence
 * the fixed `TODAY` below.
 *
 * This is a mulberry32 PRNG: tiny, fast, and stable for a given seed. Seeding
 * per dataset rather than globally means adding a customer does not reshuffle
 * every loan, which matters when the point is to eyeball the same screen twice.
 */
export function makeRandom(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** Float in [0, 1). */
    next,
    /** Integer in [min, max], inclusive. */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** One element of a non-empty list. */
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    /** True with the given probability. */
    chance: (probability: number) => next() < probability,
    /**
     * A money amount, rounded to the nearest `step`.
     *
     * Real loan amounts are round numbers — nobody borrows 487,213 shillings —
     * so unrounded figures are the fastest way to make demo data look fake.
     */
    money: (min: number, max: number, step = 10_000) => {
      const raw = min + next() * (max - min);
      return Math.max(step, Math.round(raw / step) * step);
    },
    /** N distinct elements, or as many as the list holds. */
    sample: <T,>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const out: T[] = [];
      const take = Math.min(count, pool.length);
      for (let i = 0; i < take; i++) out.push(...pool.splice(Math.floor(next() * pool.length), 1));
      return out;
    },
  };
}

/**
 * The date the whole demo is anchored to.
 *
 * Fixed rather than `new Date()`, for the hydration reason above and because a
 * demo whose "today" moves produces different screenshots every day.
 */
export const TODAY = new Date("2026-07-30T00:00:00Z");

/** `days` before TODAY, as an ISO date string. */
export function daysAgo(days: number): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** `days` after an ISO date, as an ISO date string. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole years between an ISO date of birth and TODAY. */
export function ageFrom(dobIso: string): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  let age = TODAY.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = TODAY.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && TODAY.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}
