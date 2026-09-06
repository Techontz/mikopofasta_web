import assert from "node:assert/strict";
import { test } from "node:test";
import { collectPages } from "@/lib/api/paginate";
import type { ApiPagination } from "@/lib/api/types";

/**
 * Differential test: the parallel paginator against the sequential loop it
 * replaced.
 *
 * The seven `getAll*` functions each held a copy of the same `for (;;)` loop.
 * Replacing them is only safe if the new implementation returns EXACTLY what
 * the old one did — same records, same order, no duplicates, no gaps — for
 * every shape the API can produce. So the old loop is reproduced verbatim below
 * as a reference implementation, both are run against the same simulated
 * endpoint, and the outputs are compared.
 *
 * The endpoint simulates Laravel's LengthAwarePaginator exactly, because that
 * is what the API actually returns:
 *
 *   app/Support/ApiResponse.php ->
 *     ['page' => currentPage(), 'perPage' => perPage(),
 *      'total' => total(),      'lastPage' => lastPage()]
 *
 * and `lastPage()` is `max((int) ceil($total / $perPage), 1)` — which is why an
 * empty table reports `lastPage: 1`, not 0, and why that case is tested here.
 *
 * Run with `npm run test:api`.
 */

/** Laravel's LengthAwarePaginator, in miniature. */
function laravelEndpoint(total: number) {
  const records = Array.from({ length: total }, (_, i) => `row-${i + 1}`);
  let requests = 0;

  const fetchPage = async (page: number, perPage: number) => {
    requests += 1;
    // ApiResponse::perPage() clamps to [1, 100].
    const effective = Math.max(1, Math.min(perPage, 100));
    const lastPage = Math.max(Math.ceil(total / effective), 1);
    const start = (page - 1) * effective;
    const pagination: ApiPagination = { page, perPage: effective, total, lastPage };
    return { items: records.slice(start, start + effective), pagination };
  };

  return { records, fetchPage, requests: () => requests };
}

/**
 * The loop as it was written in lib/api/customers.ts, loans.ts, payments.ts,
 * ledger.ts, hr.ts, users.ts and groups.ts before this change. Reproduced
 * exactly, including the `pagination?.lastPage ?? page` fallback.
 */
async function sequentialReference<T>(
  fetchPage: (page: number, perPage: number) => Promise<{ items: T[]; pagination?: ApiPagination }>,
  perPage: number,
  pageLimit: number
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  for (;;) {
    const { items, pagination } = await fetchPage(page, perPage);
    all.push(...items);

    const lastPage = pagination?.lastPage ?? page;
    if (page >= lastPage) break;
    if (page >= pageLimit) break;

    page += 1;
  }

  return all;
}

// Every boundary that matters: empty, under one page, exactly one page, one
// past a page boundary, a partial final page, and a book big enough to exceed
// the concurrency pool several times over.
const SHAPES = [0, 1, 15, 99, 100, 101, 199, 200, 201, 250, 999, 1000, 1001];

for (const total of SHAPES) {
  test(`${total} records: identical to the sequential loop it replaced`, async () => {
    const a = laravelEndpoint(total);
    const b = laravelEndpoint(total);

    const expected = await sequentialReference(a.fetchPage, 100, 50);
    const actual = await collectPages(b.fetchPage, { pageLimit: 50, perPage: 100, label: "test" });

    assert.deepEqual(actual, expected, "record-for-record, in order");
    assert.equal(actual.length, total, "no records skipped");
    assert.equal(new Set(actual).size, total, "no records duplicated");
    assert.deepEqual(actual, a.records, "the whole table, in the API's order");
    assert.equal(b.requests(), a.requests(), "same number of API requests as before");
  });
}

test("an empty table costs exactly one request and returns nothing", async () => {
  // Laravel reports lastPage: 1 for an empty result, never 0.
  const { fetchPage, requests } = laravelEndpoint(0);
  const rows = await collectPages(fetchPage, { pageLimit: 50, perPage: 100, label: "test" });

  assert.deepEqual(rows, []);
  assert.equal(requests(), 1);
});

test("the final partial page is returned whole and is not padded", async () => {
  // 250 records at 100/page: two full pages and a 50-row tail.
  const { fetchPage } = laravelEndpoint(250);
  const rows = await collectPages(fetchPage, { pageLimit: 50, perPage: 100, label: "test" });

  assert.equal(rows.length, 250);
  assert.equal(rows[199], "row-200", "boundary between page two and three");
  assert.equal(rows[200], "row-201", "first row of the partial page");
  assert.equal(rows.at(-1), "row-250", "last row of the partial page");
});

test("a request count that will not flood the API", async () => {
  // The heaviest realistic read in the product: the loan book at its cap.
  const { fetchPage, requests } = laravelEndpoint(10_000);
  const rows = await collectPages(fetchPage, { pageLimit: 100, perPage: 100, label: "test" });

  assert.equal(rows.length, 10_000);
  assert.equal(requests(), 100, "one request per page — no more than the sequential loop made");
});

test("per_page above the API's cap is honoured as the API clamps it, not as asked", async () => {
  // ApiResponse::perPage() clamps to 100. A caller asking for 500 gets 100-row
  // pages back, and the paginator must follow the response, not the request.
  const { fetchPage } = laravelEndpoint(250);
  const rows = await collectPages(fetchPage, { pageLimit: 50, perPage: 500, label: "test" });

  assert.equal(rows.length, 250, "still the whole table");
  assert.equal(new Set(rows).size, 250, "and still no duplicates");
});

test("a page that fails rejects the whole read, exactly as the sequential loop did", async () => {
  const { fetchPage } = laravelEndpoint(500);
  const failing = async (page: number, perPage: number) => {
    if (page === 3) throw new Error("500 from the API");
    return fetchPage(page, perPage);
  };

  await assert.rejects(
    () => collectPages(failing, { pageLimit: 50, perPage: 100, label: "test" }),
    /500 from the API/,
    "a half-read list must never be presented as the whole list"
  );
});
