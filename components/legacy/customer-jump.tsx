"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { searchCustomersForJump, type CustomerPick } from "@/features/customers/actions";

/**
 * The top bar's jump-to-customer picker.
 *
 * Replaces a native `<select>` that the layout filled with every customer in
 * the institution on every single navigation. This asks the API only when it is
 * opened, and only for the page it is showing.
 *
 * What makes it an ERP picker rather than a search box:
 *
 *   - Opening it shows the book from the top. You do not have to know a name to
 *     start; clicking it and scrolling is a legitimate way to find somebody.
 *   - Each row carries what a teller matches on — face, name, customer number,
 *     phone, branch, status — because "John" is four people and the number is
 *     how you tell them apart.
 *   - It pages as you scroll instead of stopping at a fixed count, so a common
 *     surname does not silently hide its own matches.
 *   - The last few customers opened are kept and offered first, since the work
 *     is nearly always about somebody you were just looking at.
 *
 * Keyboard throughout: ↑/↓ move, Enter opens, Escape closes, Tab leaves.
 */

const DEBOUNCE_MS = 250;
const RECENT_KEY = "mikopofasta.recent-customers";
const RECENT_MAX = 5;

/* ------------------------------------------------------------------ recents */

/**
 * Kept in localStorage rather than on the server: it is a convenience local to
 * this browser, it must survive a reload, and it is not worth an endpoint or a
 * row of anybody's audit trail.
 */
function readRecents(): CustomerPick[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.slice(0, RECENT_MAX) as CustomerPick[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(pick: CustomerPick) {
  try {
    const next = [pick, ...readRecents().filter((r) => r.id !== pick.id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // A full or disabled localStorage must not break navigation.
  }
}

/* -------------------------------------------------------------------- picker */

export function CustomerJump() {
  const router = useRouter();
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [recents, setRecents] = React.useState<CustomerPick[]>([]);

  /*
   * One piece of state for the result, carrying the term and page it belongs
   * to. "Still loading" is derived from it rather than kept as a second flag —
   * two booleans that have to agree are two booleans that eventually will not,
   * usually as a spinner that never stops.
   */
  const [settled, setSettled] = React.useState<{
    term: string;
    rows: CustomerPick[];
    hasMore: boolean;
    message: string | null;
  } | null>(null);

  const [loadingMore, setLoadingMore] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = React.useId();

  const search = term.trim();
  const loading = open && settled?.term !== search;
  const rows = settled?.term === search ? settled.rows : [];
  const message = settled?.term === search ? settled.message : null;

  // Recents are shown instead of results only on a still-empty query.
  const showingRecents = search === "" && recents.length > 0 && rows.length === 0 && loading;
  const visible = showingRecents ? recents : rows;

  /*
   * Recents are read when the picker is opened, in the handler rather than in
   * an effect. localStorage is not readable during the server render, so it
   * cannot be a `useState` initialiser; and doing it in an effect means setting
   * state synchronously on every open, which cascades a second render for a
   * value the click already knew it needed.
   */
  function openPicker() {
    setRecents(readRecents());
    setOpen(true);
  }

  /*
   * Debounced, and every request is tagged. A slow response for "joh" must
   * never overwrite a newer one for "john", which is what the sequence check
   * prevents.
   */
  const seq = React.useRef(0);
  React.useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      const result = await searchCustomersForJump(search, 1);
      if (mine !== seq.current) return;
      setSettled({
        term: search,
        rows: result.results,
        hasMore: result.hasMore,
        message: result.ok ? null : (result.message ?? "Could not search customers."),
      });
      setActive(0);
    }, search === "" ? 0 : DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, open]);

  /** Next page, appended. Guarded so a fast scroller cannot fire it twice. */
  const loadMore = React.useCallback(async () => {
    if (!settled || !settled.hasMore || loadingMore || settled.term !== search) return;
    setLoadingMore(true);
    const page = Math.floor(settled.rows.length / 25) + 1;
    const mine = seq.current;
    const result = await searchCustomersForJump(search, page);
    if (mine === seq.current) {
      setSettled((prev) =>
        prev === null || prev.term !== search
          ? prev
          : { ...prev, rows: [...prev.rows, ...result.results], hasMore: result.hasMore }
      );
    }
    setLoadingMore(false);
  }, [settled, loadingMore, search]);

  /* Click-away is FloatingPanel's: the list is portalled to the body, so a
     check against this component's own subtree would close the picker the
     moment somebody clicked a customer in it. */

  // Keep the highlighted row in view when arrowing past the fold.
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(pick: CustomerPick) {
    pushRecent(pick);
    setOpen(false);
    setTerm("");
    router.push(`/customers/${pick.id}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openPicker();
      if (visible.length === 0) return;
      setActive((i) =>
        e.key === "ArrowDown" ? (i + 1) % visible.length : (i - 1 + visible.length) % visible.length
      );
      return;
    }
    if (e.key === "Enter" && open && visible[active]) {
      e.preventDefault();
      go(visible[active]);
    }
  }

  return (
    <div ref={boxRef} className="w-full min-w-0 max-w-[320px]">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
        style={{ color: "var(--lg-ink-tab)" }}
        aria-hidden
      />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Search customers"
        placeholder="Select customer"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          openPicker();
        }}
        onFocus={openPicker}
        onKeyDown={onKeyDown}
        className="h-11 w-full rounded border pl-9 pr-9 text-[15px] outline-none focus:border-[var(--lg-link)]"
        style={{
          borderColor: "var(--lg-ctrl-line)",
          background: "var(--lg-surface)",
          color: "var(--lg-ink-tab)",
        }}
      />

      {loading ? (
        <Loader2
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin"
          style={{ color: "var(--lg-ink-tab)" }}
          aria-hidden
        />
      ) : term !== "" ? (
        <button
          type="button"
          aria-label="Clear customer search"
          onClick={() => {
            setTerm("");
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 transition-opacity hover:opacity-60"
          style={{ color: "var(--lg-ink-tab)" }}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : (
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
          style={{ color: "var(--lg-ink-tab)" }}
          aria-hidden
        />
      )}

      {/* Portalled for the same reason every other panel is: this box sits in
          the topbar, and the pages below it are full of overflow-hidden cards
          and scroll containers the list has to hang over. */}
      <FloatingPanel
        anchorRef={boxRef}
        open={open}
        onDismiss={() => setOpen(false)}
        /* No inline surface: `--lg-surface` and `--lg-ctrl-line` are declared
           on `.lg-shell`, and this list is portalled to the body where neither
           resolves — which painted it transparent. FloatingPanel supplies an
           opaque surface from root-level tokens. */
      >
        <div>
          {showingRecents && (
            <p
              className="border-b px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide opacity-60"
              style={{ borderColor: "var(--lg-ctrl-line)", color: "var(--lg-ink-tab)" }}
            >
              Recent
            </p>
          )}

          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Customer results"
            className="max-h-[22rem] overflow-y-auto"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) void loadMore();
            }}
          >
            {/*
              Four states, each saying something different. A search that failed
              must never render as "no matches" — that is a claim about the
              customer book when the truth is about the network.
            */}
            {message ? (
              <li className="px-3 py-3 text-[14px]" style={{ color: "var(--lg-ink-tab)" }} role="alert">
                {message}
              </li>
            ) : loading && visible.length === 0 ? (
              <li className="px-3 py-3 text-[14px]" style={{ color: "var(--lg-ink-tab)" }}>
                Searching…
              </li>
            ) : visible.length === 0 ? (
              <li className="px-3 py-3 text-[14px]" style={{ color: "var(--lg-ink-tab)" }}>
                {search === "" ? "No customers registered yet." : `No customer matches “${search}”.`}
              </li>
            ) : (
              visible.map((pick, i) => (
                <li key={pick.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(pick)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      background: i === active ? "var(--lg-row-hover, rgba(0,0,0,0.06))" : "transparent",
                      color: "var(--lg-ink-tab)",
                    }}
                  >
                    <CustomerAvatar name={pick.name} photoUrl={pick.photoUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-medium">{pick.name}</span>
                        <span className="font-tabular shrink-0 text-[12px] opacity-70">
                          {pick.customerNumber}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[12.5px] opacity-70">
                        <span className="font-tabular truncate">{pick.phone ?? "—"}</span>
                        {pick.branch && <span className="truncate">· {pick.branch}</span>}
                        {pick.status !== "active" && (
                          <span className="shrink-0 rounded px-1 text-[11.5px] uppercase tracking-wide opacity-90">
                            {pick.status}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}

            {loadingMore && (
              <li
                className="flex items-center justify-center gap-2 py-2 text-[12.5px]"
                style={{ color: "var(--lg-ink-tab)" }}
              >
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading more…
              </li>
            )}
          </ul>
        </div>
      </FloatingPanel>
    </div>
  );
}
