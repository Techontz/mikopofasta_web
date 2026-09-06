import assert from "node:assert/strict";
import { test } from "node:test";
import { collectPages } from "@/lib/api/paginate";
import type { ApiPagination } from "@/lib/api/types";

/**
 * `collectPages` assembles the whole of a paginated list.
 *
 * It replaced seven hand-written sequential loops, so what matters is that it
 * is faithful to them in the two ways a financial list can be wrong — a record
 * missing, or records out of order — while doing the fetching in parallel.
 * Parallelism is exactly what puts ordering at risk, which is why the ordering
 * test deliberately makes the LAST page resolve FIRST.
 *
 * Run with `npm run test:api`.
 */

function meta(page: number, lastPage: number, total: number): ApiPagination {
  return { page, perPage: 100, total, lastPage };
}

/** A fake endpoint of `pages` pages, each holding one predictable row. */
function fakeEndpoint(pages: number, delayFor: (page: number) => number = () => 0) {
  const calls: number[] = [];
  let inFlight = 0;
  let peakInFlight = 0;

  const fetchPage = async (page: number) => {
    calls.push(page);
    inFlight += 1;
    peakInFlight = Math.max(peakInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, delayFor(page)));
    inFlight -= 1;
    return {
      items: [`page-${page}-a`, `page-${page}-b`],
      pagination: meta(page, pages, pages * 2),
    };
  };

  return { fetchPage, calls, peak: () => peakInFlight };
}

test("a single page is returned as-is, and asks for nothing more", async () => {
  const { fetchPage, calls } = fakeEndpoint(1);
  const rows = await collectPages(fetchPage, { pageLimit: 50, label: "test" });

  assert.deepEqual(rows, ["page-1-a", "page-1-b"]);
  assert.deepEqual(calls, [1]);
});

test("an endpoint that returns no pagination block is treated as one page", async () => {
  let calls = 0;
  const rows = await collectPages(
    async () => {
      calls += 1;
      return { items: ["only"] };
    },
    { pageLimit: 50, label: "test" }
  );

  assert.deepEqual(rows, ["only"]);
  assert.equal(calls, 1, "no pagination means there is nothing after page one");
});

test("every page is fetched exactly once", async () => {
  const { fetchPage, calls } = fakeEndpoint(5);
  const rows = await collectPages(fetchPage, { pageLimit: 50, label: "test" });

  assert.deepEqual([...calls].sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  assert.equal(rows.length, 10);
});

test("rows come back in page order even when later pages resolve first", async () => {
  // Page 5 answers immediately; page 2 takes longest. Completion order is the
  // reverse of page order, which is precisely what a naive push would get wrong.
  const { fetchPage } = fakeEndpoint(5, (page) => (6 - page) * 8);
  const rows = await collectPages(fetchPage, { pageLimit: 50, label: "test" });

  assert.deepEqual(rows, [
    "page-1-a", "page-1-b",
    "page-2-a", "page-2-b",
    "page-3-a", "page-3-b",
    "page-4-a", "page-4-b",
    "page-5-a", "page-5-b",
  ]);
});

test("the page limit truncates rather than looping, and says so", async () => {
  const { fetchPage, calls } = fakeEndpoint(40);
  const warnings: string[] = [];
  const realWarn = console.warn;
  console.warn = (message: string) => void warnings.push(message);

  try {
    const rows = await collectPages(fetchPage, { pageLimit: 3, label: "getAllThings" });
    assert.equal(rows.length, 6, "three pages of two rows");
    assert.deepEqual([...calls].sort((a, b) => a - b), [1, 2, 3]);
  } finally {
    console.warn = realWarn;
  }

  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /getAllThings stopped at 3 pages \(of 40/);
});

test("a list inside the limit is never warned about", async () => {
  const { fetchPage } = fakeEndpoint(3);
  const warnings: string[] = [];
  const realWarn = console.warn;
  console.warn = (message: string) => void warnings.push(message);

  try {
    await collectPages(fetchPage, { pageLimit: 3, label: "getAllThings" });
  } finally {
    console.warn = realWarn;
  }

  assert.deepEqual(warnings, [], "reaching the last page is not truncation");
});

test("concurrency is bounded, so a long book does not burst the read throttle", async () => {
  const { fetchPage, peak } = fakeEndpoint(30, () => 5);
  await collectPages(fetchPage, { pageLimit: 100, label: "test", concurrency: 4 });

  assert.ok(peak() <= 4, `expected at most 4 requests in flight, saw ${peak()}`);
});

test("the pool never opens more workers than there are pages left", async () => {
  const { fetchPage, peak } = fakeEndpoint(3, () => 5);
  await collectPages(fetchPage, { pageLimit: 100, label: "test", concurrency: 8 });

  assert.ok(peak() <= 2, `two pages remain after page one, saw ${peak()} in flight`);
});
