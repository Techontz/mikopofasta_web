"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

/**
 * The old "All Customer" grid — a jQuery DataTable. Its behaviour is part of
 * what the screen is: the whole set is held client-side and the entries
 * selector, the search box and the pager all act on it without a round trip.
 * Reproduced here rather than swapped for server pagination, which would look
 * the same standing still and behave differently under the hand.
 */
export interface LegacyCustomerRow {
  id: string;
  photoUrl: string | null;
  name: string;
  customerId: string;
  checkNumber: string | null;
  accountNumber: string | null;
  dob: string | null;
  age: number | null;
  gender: string;
  phone: string;
  /** Raw status, which decides the badge colour. */
  loanStatus: string | null;
  /** The API's human label — what the badge prints. */
  loanStatusLabel: string | null;
}

const COLUMNS = [
  "Photo",
  "customer name",
  "Customer ID",
  "Check number",
  "Account number",
  "Date of birth",
  "Age",
  "Gender",
  "Phone number",
  "Loan status",
];

/** DataTables' default page-length menu. */
const PAGE_SIZES = [10, 25, 50, 100];

/** Green when the loan is running, grey once it is not — as the old grid drew it. */
const RUNNING = new Set(["active", "arrears", "frozen"]);

export function LegacyCustomerTable({ rows }: { rows: LegacyCustomerRow[] }) {
  const [pageSize, setPageSize] = React.useState(10);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.name, row.customerId, row.checkNumber, row.accountNumber, row.dob, row.gender, row.phone]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle))
    );
  }, [rows, query]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, lastPage);
  const start = (current - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  // DataTables reports a 0-of-0 window when a search matches nothing.
  const firstShown = filtered.length === 0 ? 0 : start + 1;
  const lastShown = Math.min(start + pageSize, filtered.length);

  return (
    <>
      <div className="-mt-9 mb-3 flex justify-end">
        <button
          type="button"
          aria-label="Search"
          className="h-[30px] rounded px-3.5"
          style={{ background: "var(--lg-link)", color: "var(--lg-on-link)" }}
        >
          <Search className="size-4" strokeWidth={2.2} aria-hidden />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-[14px] text-[var(--lg-text)]">
          Show
          <select
            aria-label="Entries per page"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-[27px] w-[71px] rounded border px-2 text-[14px]"
            style={{ borderColor: "var(--lg-ctrl-line)", background: "var(--lg-surface)" }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          entries
        </label>

        <label className="flex items-center gap-2 text-[14px] text-[var(--lg-text)]">
          Search:
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="h-[29px] w-[160px] rounded border px-2 text-[14px] outline-none focus:border-[var(--lg-link)]"
            style={{ borderColor: "var(--lg-ctrl-line)", background: "var(--lg-surface)" }}
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr style={{ background: "var(--lg-thead)" }}>
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="lg-sort whitespace-nowrap px-3 py-2 text-left text-[14px] font-bold text-[var(--lg-on-thead)]"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="hover:bg-[var(--lg-hover)]">
                <Cell className="w-[126px]">
                  {row.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- customer
                       photos are served from the API host, not the image pipeline. */
                    <img
                      src={row.photoUrl}
                      alt=""
                      className="h-[84px] w-[101px] border object-cover"
                      style={{ borderColor: "var(--lg-photo-line)" }}
                    />
                  ) : (
                    <div
                      className="h-[84px] w-[101px] border bg-[var(--lg-head)]"
                      style={{ borderColor: "var(--lg-photo-line)" }}
                      aria-hidden
                    />
                  )}
                </Cell>
                <Cell>
                  <Link href={`/customers/${row.id}`} className="text-[var(--lg-link)] hover:underline">
                    {row.name}
                  </Link>
                </Cell>
                <Cell>{row.customerId}</Cell>
                <Cell>{row.checkNumber ?? "-"}</Cell>
                <Cell>{row.accountNumber ?? "-"}</Cell>
                <Cell>{row.dob ?? "-"}</Cell>
                <Cell>{row.age ?? "-"}</Cell>
                <Cell>{row.gender}</Cell>
                <Cell>{row.phone}</Cell>
                <Cell className="w-[132px]">
                  {row.loanStatus && (
                    <span
                      className="lg-status"
                      style={{ color: RUNNING.has(row.loanStatus) ? "var(--lg-brand-b)" : "var(--lg-muted)" }}
                    >
                      {row.loanStatusLabel ?? row.loanStatus}
                    </span>
                  )}
                </Cell>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-[var(--lg-muted)]">
                  No matching records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] text-[var(--lg-text)]">
          Showing {firstShown} to {lastShown} of {filtered.length} entries
        </p>
        <nav className="flex" aria-label="Pagination">
          <PageButton onClick={() => setPage(current - 1)} disabled={current === 1}>
            Previous
          </PageButton>
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((n) => (
            <PageButton key={n} onClick={() => setPage(n)} active={n === current}>
              {n}
            </PageButton>
          ))}
          <PageButton onClick={() => setPage(current + 1)} disabled={current === lastPage}>
            Next
          </PageButton>
        </nav>
      </div>
    </>
  );
}

function Cell({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`border-b px-3 py-3.5 align-middle ${className}`} style={{ borderColor: "#eef0f2" }}>
      {children}
    </td>
  );
}

function PageButton({
  children,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-active={active}
      data-disabled={disabled}
      aria-current={active ? "page" : undefined}
      className="lg-page"
    >
      {children}
    </button>
  );
}
