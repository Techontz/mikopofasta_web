import type { ApiPagination } from "@/lib/api/types";

/*
 * Deliberately NOT marked `server-only`, unlike the rest of lib/api.
 *
 * That marker exists to keep the bearer token out of the browser bundle, and
 * this module never touches it: it takes a callback and decides what order to
 * call it in. The guard stays where the secret is — on every module that reads
 * the session — and leaving it off here is what lets the ordering be tested
 * directly under node:test rather than only through a running server.
 */

/**
 * Reads a paginated endpoint to the end.
 *
 * ## The problem this solves
 *
 * Seven modules needed "the whole list" — customers, loans, payments, journal
 * entries, staff, payroll runs, users, groups — because the screens that show
 * them search, sort and total in the browser and the API has no aggregate
 * endpoint to ask instead. Each had written the same loop: fetch page one, wait
 * for it, fetch page two, wait for it, and so on.
 *
 * That ordering is the expensive part, and none of it was necessary. Page four
 * does not depend on page three; the only thing the first response tells you
 * that you did not already know is how many pages there are. So a book of two
 * thousand customers cost twenty round-trips to a remote API laid end to end,
 * before the page could render a single row — and the loan book's cap allowed a
 * hundred.
 *
 * ## What it does instead
 *
 * Page one is fetched, `lastPage` is read off it, and the rest are fetched
 * together. Two waves, not N. The common case in this system — a few hundred
 * records, so two to five pages — collapses to exactly two round-trips.
 *
 * ## Why the concurrency cap
 *
 * `Promise.all` over ninety-nine pages would open ninety-nine sockets at once
 * and walk straight into the API's read throttle. A bounded pool keeps the
 * burst civil while still collapsing the wall-clock: at eight in flight, the
 * worst case in this codebase goes from a hundred sequential trips to thirteen
 * waves, and every realistic case is still two.
 *
 * Results are assembled by page index, not by completion order, so the list is
 * in exactly the order the API returned it — the same order the sequential
 * loops produced.
 */
const DEFAULT_CONCURRENCY = 8;

export interface CollectPagesOptions {
  /**
   * A backstop, not a policy. Reaching it logs rather than silently
   * truncating: a list that quietly stops short reads as "that is everyone"
   * when it is not.
   */
  pageLimit: number;
  /** Names the caller in the truncation warning. */
  label: string;
  /** Rows per request. The API caps this at 100. */
  perPage?: number;
  concurrency?: number;
}

export async function collectPages<T>(
  fetchPage: (page: number, perPage: number) => Promise<{ items: T[]; pagination?: ApiPagination }>,
  { pageLimit, label, perPage = 100, concurrency = DEFAULT_CONCURRENCY }: CollectPagesOptions
): Promise<T[]> {
  const first = await fetchPage(1, perPage);

  // An endpoint that returns no pagination block has told us there is one page.
  const lastPage = first.pagination?.lastPage ?? 1;
  const stopAt = Math.min(lastPage, pageLimit);

  if (lastPage > pageLimit) {
    console.warn(
      `${label} stopped at ${pageLimit} pages (of ${lastPage}; ${first.pagination?.total ?? "?"} records reported).`
    );
  }

  if (stopAt <= 1) return first.items;

  // Slot 0 is page one; slot i is page i + 1. Filled by index so the assembled
  // list follows page order regardless of which request finishes first.
  const pages: T[][] = new Array(stopAt);
  pages[0] = first.items;

  let next = 2;
  const workers = Array.from({ length: Math.min(concurrency, stopAt - 1) }, async () => {
    for (;;) {
      const page = next++;
      if (page > stopAt) return;
      pages[page - 1] = (await fetchPage(page, perPage)).items;
    }
  });

  await Promise.all(workers);

  return pages.flat();
}
