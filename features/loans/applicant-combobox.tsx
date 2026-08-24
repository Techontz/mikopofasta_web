"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search, TriangleAlert, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { Input } from "@/components/ui/input";
import { searchEligibleApplicants } from "@/features/loans/applicant-actions";
import type { CustomerListItem } from "@/lib/api/customers";

/**
 * The loan applicant picker: a type-ahead over LOAN-ELIGIBLE customers only.
 *
 * WHO IT OFFERS, AND WHO DECIDES. Every query goes to
 * `GET /api/v1/customers?loan_eligible=1&search=…`. That flag is the whole
 * eligibility rule — registration approved by a manager, KYC complete, face
 * verified where the account type requires it, account active — evaluated by
 * `Customer::scopeLoanEligible()`, which is the same definition `POST /loans`
 * enforces. There is deliberately NO eligibility logic in this file. A customer
 * pending approval, returned, mid-KYC or suspended simply never comes back from
 * the API, and this component could not offer them if it wanted to.
 *
 * WHY SERVER-SIDE SEARCH. The previous screen downloaded every eligible
 * customer — paging until it had them all — to render one dropdown, then
 * filtered in the browser. `Customer::scopeSearch` already covers the customer
 * number, both phone columns and the assembled full name, which is exactly the
 * three things an officer is handed at the counter. Asking the server means one
 * small request per query instead of the branch's whole book on page load.
 *
 * WHAT IT SHOWS WHEN THERE IS NOTHING. Four different empty states, because
 * they call for four different actions: still typing, no match for this query,
 * nobody eligible at all, and the lookup failed. Collapsing them into "no
 * customers" is how a broken API comes to look like an empty branch.
 */
export function ApplicantCombobox({
  value,
  onChange,
  /** Rendered when the field opens on a customer chosen elsewhere. */
  initialCustomer,
  /** From the API's own count. Null hides the hint entirely — never guessed. */
  awaitingApprovalCount,
  disabled,
  id,
}: {
  value: string | null;
  onChange: (customer: CustomerListItem | null) => void;
  initialCustomer?: CustomerListItem | null;
  awaitingApprovalCount?: number | null;
  disabled?: boolean;
  id?: string;
}) {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CustomerListItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [active, setActive] = React.useState(0);

  /*
   * The selection is DERIVED, not synced.
   *
   * An effect copying `initialCustomer` into state would be a setState in an
   * effect body — a cascading render on every parent update, and one React now
   * flags. Falling back to the prop until the officer picks somebody gives the
   * same behaviour with no effect at all: the preselected customer shows on
   * open, and the moment one is chosen here that choice wins.
   */
  const [picked, setPicked] = React.useState<CustomerListItem | null>(null);
  const selected = picked ?? initialCustomer ?? null;

  /*
   * One debounced request per pause in typing, and the in-flight one is
   * abandoned when a newer query supersedes it — otherwise a slow response for
   * "Am" can land after the response for "Amina" and replace it.
   */
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;

    /* Every state change happens inside the timer, never synchronously in the
       effect body — a synchronous setState here cascades a second render on
       each keystroke. */
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);

      const result = await searchEligibleApplicants(query);
      if (cancelled) return;

      setResults(result.customers);
      setTotal(result.total);
      setError(result.ok ? null : (result.message ?? "The customer lookup failed."));
      setLoading(false);
      setLoaded(true);
      setActive(0);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  function choose(customer: CustomerListItem) {
    setPicked(customer);
    onChange(customer);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {selected ? (
          <span className="min-w-0 truncate text-left">
            <span className="font-medium">{selected.fullName}</span>
            <span className="text-muted-foreground">
              {" · "}
              {selected.customerNumber}
              {" · "}
              {selected.phone}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">Search name, customer number or phone…</span>
        )}
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <FloatingPanel
        anchorRef={anchorRef}
        open={open}
        onDismiss={() => setOpen(false)}
        className="z-50 overflow-hidden rounded-md border bg-popover shadow-lg"
      >
        <div className="border-b p-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Name, customer number or phone"
            aria-label="Search eligible customers"
            className="h-8"
          />
        </div>

        <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
          {loading && (
            <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </li>
          )}

          {!loading && error && (
            <li className="flex items-start gap-2 px-3 py-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {error}
                <span className="mt-0.5 block text-xs opacity-80">
                  This is a lookup failure, not an empty branch. Try again.
                </span>
              </span>
            </li>
          )}

          {!loading && !error && loaded && results.length === 0 && (
            <li className="space-y-1.5 px-3 py-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <UserSearch className="size-4 text-muted-foreground" aria-hidden />
                {query.trim() === ""
                  ? "No loan-eligible customers found."
                  : `No loan-eligible customer matches “${query.trim()}”.`}
              </p>
              <p className="text-xs text-muted-foreground">
                A customer can borrow only once registration is complete, KYC and face verification
                are done, and a manager has approved the registration.
              </p>
              {/* Only ever from the API's own count, and only when it is non-zero. */}
              {typeof awaitingApprovalCount === "number" && awaitingApprovalCount > 0 && (
                <p className="text-xs">
                  <span className="font-medium">{awaitingApprovalCount}</span> registration
                  {awaitingApprovalCount === 1 ? " is" : "s are"} waiting for approval —{" "}
                  <Link href="/customers/approvals" className="underline underline-offset-2">
                    open Registration Approval
                  </Link>
                </p>
              )}
            </li>
          )}

          {!loading &&
            !error &&
            results.map((customer, index) => (
              <li key={customer.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={customer.id === value}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(customer)}
                  className={cn(
                    "flex w-full flex-col items-start px-3 py-2 text-left text-sm",
                    index === active && "bg-muted",
                    customer.id === value && "font-medium"
                  )}
                >
                  <span className="truncate">{customer.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {customer.customerNumber} · {customer.phone}
                    {customer.branchName ? ` · ${customer.branchName}` : ""}
                    {customer.categoryName ? ` · ${customer.categoryName}` : ""}
                  </span>
                </button>
              </li>
            ))}
        </ul>

        {/* The cap is stated rather than hidden — a list silently truncated at
            25 reads as "that is everybody", which it is not. */}
        {!loading && !error && total > results.length && (
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Showing {results.length} of {total}. Keep typing to narrow the search.
          </p>
        )}
      </FloatingPanel>
    </div>
  );
}
