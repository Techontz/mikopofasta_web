"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ReportExportFormat, ReportPagination } from "@/lib/api/reports";

/**
 * Searching, paging and exporting a report.
 *
 * Everything lives in the URL. A report someone is looking at — filtered,
 * searched, sorted, on page three — is then a link they can send, and a refresh
 * does not lose it. It is also what lets the export button be a plain anchor:
 * the same query string the page was rendered from is the one the file is built
 * from, so an export cannot disagree with the screen it came from.
 */
export function ReportControls({
  slug,
  pagination,
  matchedRows,
  totalRows,
  rowCount,
}: {
  slug: string;
  pagination?: ReportPagination;
  matchedRows?: number;
  totalRows?: number;
  rowCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("search") ?? "";
  const [draft, setDraft] = React.useState(currentSearch);
  const [lastSeen, setLastSeen] = React.useState(currentSearch);

  /*
   * Re-sync when the URL changes underneath — a back button, or a filter change
   * that rebuilt the query string.
   *
   * Adjusted during render rather than in an effect. React's own guidance for
   * "reset state when a prop changes" is exactly this, and an effect would
   * render once with the stale value and again with the fresh one.
   */
  if (currentSearch !== lastSeen) {
    setLastSeen(currentSearch);
    setDraft(currentSearch);
  }

  const push = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams]
  );

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    push((params) => {
      if (draft.trim()) params.set("search", draft.trim());
      else params.delete("search");
      // A new search invalidates the page you were on.
      params.delete("page");
    });
  };

  const setPage = (page: number) =>
    push((params) => {
      params.set("page", String(page));
    });

  const setPerPage = (perPage: string) =>
    push((params) => {
      if (perPage === "all") {
        params.delete("per_page");
        params.delete("page");
      } else {
        params.set("per_page", perPage);
        params.delete("page");
      }
    });

  /*
   * The export href carries the whole query string, minus the paging. A page of
   * a spreadsheet is not what anybody means by exporting a report — the API
   * ignores per_page on the export route for the same reason, and dropping it
   * here keeps the link honest about what it will produce.
   */
  const exportHref = (format: ReportExportFormat) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("per_page");
    params.set("format", format);

    return `/reports/${slug}/download?${params.toString()}`;
  };

  const perPage = searchParams.get("per_page") ?? "all";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <form onSubmit={submitSearch} className="flex items-center gap-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search every column…"
            aria-label="Search this report"
            className="w-64 pl-8"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
        {currentSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              push((params) => {
                params.delete("search");
                params.delete("page");
              })
            }
          >
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {matchedRows !== undefined && totalRows !== undefined && (
          <span className="text-[12.5px] text-muted-foreground">
            {matchedRows} of {totalRows} rows match
          </span>
        )}

        <label className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          Show
          <select
            value={perPage}
            onChange={(e) => setPerPage(e.target.value)}
            aria-label="Rows per page"
            className="rounded-md border bg-transparent px-2 py-1 text-[12.5px]"
          >
            {/* "All" is the default, because a report read in pages is usually
                being read wrong — a trial balance cut off at row fifty is not a
                shorter report. Paging is there for the long listings. */}
            <option value="all">All</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        {/*
          Anchors, not buttons with an onClick. The browser handles a download
          with a Content-Disposition far better than JavaScript assembling a
          Blob, and a real link is middle-clickable and copyable like any other.
        */}
        {(["csv", "xlsx", "pdf"] as const).map((format) => (
          <a
            key={format}
            href={exportHref(format)}
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium hover:bg-muted"
          >
            <Download className="size-4" aria-hidden />
            {format.toUpperCase()}
          </a>
        ))}
      </div>

      {pagination && pagination.lastPage > 1 && (
        <div className="flex w-full items-center justify-between gap-2 border-t pt-3">
          <span className="text-[12.5px] text-muted-foreground">
            Page {pagination.page} of {pagination.lastPage} · {pagination.total} rows · showing{" "}
            {rowCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.lastPage}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A sortable column header.
 *
 * Only for the keys the API says it will sort by — a header that looked
 * clickable and did nothing would be worse than a plain one. The API reports an
 * ignored sort rather than silently serving an unsorted list, and this is the
 * half that stops one being asked for.
 */
export function SortableHeader({
  columnKey,
  label,
  align,
  sortable,
}: {
  columnKey: string;
  label: string;
  align?: "left" | "right";
  sortable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!sortable) return <>{label}</>;

  const active = searchParams.get("sort") === columnKey;
  const direction = searchParams.get("direction") === "desc" ? "desc" : "asc";

  const toggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", columnKey);
    // Clicking the active column flips it; a new column starts ascending.
    params.set("direction", active && direction === "asc" ? "desc" : "asc");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-foreground" : ""}`}
      aria-label={`Sort by ${label}`}
    >
      {label}
      <span aria-hidden className="text-[10px]">
        {active ? (direction === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </button>
  );
}
