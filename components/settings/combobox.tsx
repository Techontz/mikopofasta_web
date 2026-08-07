"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { FloatingPanel } from "@/components/ui/floating-panel";
import { cn } from "@/lib/utils";

/**
 * A select you can type into.
 *
 * The app's `<Select>` is a native dropdown, which is right for four options
 * and wrong for four hundred: picking a ward out of a native list means
 * scrolling past every ward in the district. This is the same control for the
 * long lists — branch, employee, region, district, ward, street.
 *
 * Options may be supplied directly or fetched. `loadOptions` makes it async:
 * the list is loaded when the box is first opened and again whenever
 * `loadKey` changes, which is what drives the address cascade — choosing a
 * region changes the district box's key, so it reloads for that region rather
 * than filtering a preloaded copy of every district in the country.
 *
 * Keyboard throughout: type to filter, ↑/↓ to move, Enter to choose, Escape to
 * close, Backspace on an empty query to clear the selection.
 *
 * The list renders through FloatingPanel — portalled to the body rather than
 * positioned inside this component. It used to be an absolutely-positioned
 * child, which every Card in the app clipped: `components/ui/card.tsx` sets
 * `overflow-hidden`, so a box near the bottom of the registration wizard had
 * its options sliced off at the card's edge.
 */

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line — a code, a phone number, a parent name. */
  hint?: string;
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  loadOptions,
  loadKey,
  placeholder = "Select…",
  emptyMessage = "No matches.",
  disabledMessage,
  disabled,
  invalid,
  className,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Static options. Ignored when `loadOptions` is given. */
  options?: ComboboxOption[];
  /** Async source. Called on first open and whenever `loadKey` changes. */
  loadOptions?: () => Promise<ComboboxOption[]>;
  /** Changing this invalidates the loaded list — the cascade's parent id. */
  loadKey?: string | null;
  placeholder?: string;
  emptyMessage?: string;
  /** Shown in place of the placeholder when disabled — say *why* it is closed. */
  disabledMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [loaded, setLoaded] = React.useState<{ key: string | null; rows: ComboboxOption[] } | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);

  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const listId = React.useId();

  const isAsync = typeof loadOptions === "function";
  const stale = isAsync && loaded?.key !== (loadKey ?? null);
  const rows = React.useMemo(
    () => (isAsync ? (stale ? [] : (loaded?.rows ?? [])) : (options ?? [])),
    [isAsync, stale, loaded, options]
  );

  /*
   * Loading is driven by the box being open, not by `loadKey` changing on its
   * own. A registration form has six of these; fetching every one of them on
   * mount is six requests for lists the officer may never open. The parent
   * clears the child's value when it changes, so a stale list can never be
   * chosen from even before it reloads.
   */
  const load = React.useCallback(async () => {
    if (!loadOptions) return;
    const key = loadKey ?? null;
    setLoading(true);
    try {
      const rows = await loadOptions();
      setLoaded({ key, rows });
    } catch {
      setLoaded({ key, rows: [] });
    } finally {
      setLoading(false);
    }
  }, [loadOptions, loadKey]);

  function openBox() {
    if (disabled) return;
    setOpen(true);
    setActive(0);
    if (isAsync && stale && !loading) void load();
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return rows;
    return rows.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const selected = rows.find((o) => o.value === value) ?? null;

  /* Dismissal is FloatingPanel's: the list is portalled, so a check against
     this component's own subtree would close the box on every option click. */
  const dismiss = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({
      block: "nearest",
    });
  }, [active]);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openBox();
      if (filtered.length === 0) return;
      setActive((i) =>
        e.key === "ArrowDown" ? (i + 1) % filtered.length : (i - 1 + filtered.length) % filtered.length
      );
      return;
    }
    if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        choose(filtered[active]);
      }
      return;
    }
    // Backspace on an empty query clears the selection — the fastest way to
    // undo a choice without reaching for the mouse.
    if (e.key === "Backspace" && query === "" && value !== null) {
      onChange(null);
    }
  }

  return (
    /* No `relative` any more: nothing is positioned against this element, and
       leaving it would suggest the list still lives inside it. */
    <div ref={boxRef} className={className}>
      <div
        className={cn("st-control flex items-center gap-1.5 pr-1", invalid && "st-control-invalid")}
        data-disabled={disabled || undefined}
      >
        {open && <Search className="size-3.5 shrink-0 text-[var(--st-ink-faint)]" aria-hidden />}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          disabled={disabled}
          /* When closed the box shows the chosen label as its value, so it
             reads exactly like a select. Typing replaces it with the query. */
          value={open ? query : (selected?.label ?? "")}
          placeholder={disabled ? (disabledMessage ?? placeholder) : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) openBox();
          }}
          onFocus={openBox}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--st-ink-faint)] disabled:cursor-not-allowed"
        />
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-[var(--st-ink-faint)]" aria-hidden />
        ) : value !== null && !disabled ? (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => {
              onChange(null);
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded p-0.5 text-[var(--st-ink-faint)] transition-colors hover:text-[var(--st-ink)]"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[var(--st-ink-faint)]" aria-hidden />
        )}
      </div>

      <FloatingPanel
        anchorRef={boxRef}
        open={open && !disabled}
        onDismiss={dismiss}
        /* Surface, border and shadow belong to FloatingPanel: `st-card` reads
           `--st-card`, which only exists inside `.st-scope` and so resolved to
           nothing once the list was portalled to the body. */
        className="py-1"
      >
        <ul id={listId} ref={listRef} role="listbox">
          {/*
            Loading, empty-because-nothing-matched and empty-because-there-is-
            nothing are three different answers, and a reader can act on only
            one of them. They are never collapsed into a single "No results".
          */}
          {loading ? (
            <li className="flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--st-ink-soft)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-[var(--st-ink-soft)]">
              {rows.length === 0 ? emptyMessage : `No match for “${query.trim()}”.`}
            </li>
          ) : (
            filtered.map((option, i) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13.5px] transition-colors",
                    i === active && "bg-[var(--st-subtle-strong)]"
                  )}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      option.value === value ? "text-[var(--st-accent)]" : "opacity-0"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--st-ink)]">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-[12px] text-[var(--st-ink-faint)]">
                        {option.hint}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </FloatingPanel>
    </div>
  );
}
