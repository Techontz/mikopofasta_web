"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { cn } from "@/lib/utils";

/**
 * The Settings table.
 *
 * A thin presentation wrapper over the shared DataTable — same sorting,
 * filtering, pagination and empty/loading/error behaviour, rendered on the
 * configuration surface. Column definitions are passed through untouched, so
 * every column and every cell renderer a screen already had still applies.
 */
export function SettingsTable<TData, TValue>(
  props: Omit<React.ComponentProps<typeof DataTable<TData, TValue>>, "variant"> & {
    columns: ColumnDef<TData, TValue>[];
  }
) {
  return <DataTable {...props} variant="settings" />;
}

/**
 * A standalone search field for screens that filter a list themselves rather
 * than through DataTable. Controlled — the caller owns the value, because the
 * caller owns the filtering.
 */
export function SearchToolbar({
  value,
  onValueChange,
  placeholder = "Search…",
  children,
  action,
  className,
}: {
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative w-full sm:w-72">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--st-ink-faint)]"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          aria-label={placeholder}
          placeholder={placeholder}
          onChange={(e) => onValueChange(e.target.value)}
          className="st-control pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onValueChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--st-ink-faint)] transition-colors hover:text-[var(--st-ink)]"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      {children}
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </div>
  );
}
