/**
 * Deterministic seeded PRNG (mulberry32) so seed data is stable across
 * reloads/restarts — same "story" every time, which matters for a demo
 * dataset and for the integrity-check script to reproduce exact numbers.
 */
export function createRng(seed: number) {
  let a = seed;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}


export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function daysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function dateOnlyDaysAgo(n: number, from: Date = new Date()): string {
  return daysAgo(n, from).slice(0, 10);
}

export function daysFromNow(n: number, from: Date = new Date()): string {
  return daysAgo(-n, from);
}

