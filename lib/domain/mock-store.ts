import "server-only";

/**
 * Generic in-memory mutation helpers for the mock database. Every entity's
 * Server Actions call these against the arrays exported from
 * lib/mock-data/*. Mutating in place (push/splice) rather than reassigning
 * is what lets Server Components see fresh data on the next request within
 * the same `next dev`/`next start` process — see the frontend spec's mock
 * data layer design. None of this is durable storage; a server restart
 * resets everything to the seed.
 */

let counter = 0;
export function nextId(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function upsert<T extends { id: string }>(collection: T[], item: T): void {
  const index = collection.findIndex((x) => x.id === item.id);
  if (index >= 0) collection[index] = item;
  else collection.push(item);
}

export function removeById<T extends { id: string }>(collection: T[], id: string): boolean {
  const index = collection.findIndex((x) => x.id === id);
  if (index < 0) return false;
  collection.splice(index, 1);
  return true;
}

