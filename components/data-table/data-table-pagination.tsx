"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IconButton, Select as SettingsSelect } from "@/components/settings/form";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  /** "settings" renders the configuration-surface chrome; see DataTable. */
  variant?: "default" | "settings";
}

export function DataTablePagination<TData>({ table, variant = "default" }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const total = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const settings = variant === "settings";

  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);

  const controls = [
    { label: "First page", icon: ChevronsLeft, go: () => table.setPageIndex(0), can: table.getCanPreviousPage() },
    { label: "Previous page", icon: ChevronLeft, go: () => table.previousPage(), can: table.getCanPreviousPage() },
    { label: "Next page", icon: ChevronRight, go: () => table.nextPage(), can: table.getCanNextPage() },
    {
      label: "Last page",
      icon: ChevronsRight,
      go: () => table.setPageIndex(pageCount - 1),
      can: table.getCanNextPage(),
    },
  ];

  if (!settings) {
    return (
      <div className="flex flex-col-reverse items-center gap-4 px-1 py-2 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0 ? "0 results" : `Showing ${from}–${to} of ${total}`}
        </p>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Rows</p>
            <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
              <SelectTrigger aria-label="Rows per page" size="sm" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Page {total === 0 ? 0 : pageIndex + 1} of {pageCount}
          </p>
          <div className="flex items-center gap-1">
            {controls.map((control) => (
              <Button
                key={control.label}
                variant="outline"
                size="icon-sm"
                aria-label={control.label}
                onClick={control.go}
                disabled={!control.can}
              >
                <control.icon />
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /*
   * The configuration surface gets its own chrome rather than shadcn's, so the
   * pager matches the table it belongs to. The range summary is the primary
   * line — "Showing 1–10 of 43" answers where-am-I better than a page number —
   * and on a phone it stacks above the controls instead of competing for the
   * same row.
   */
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12.5px] text-[var(--st-ink-soft)]">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium text-[var(--st-ink)]">{from}</span>–
            <span className="font-medium text-[var(--st-ink)]">{to}</span> of{" "}
            <span className="font-medium text-[var(--st-ink)]">{total}</span>
          </>
        )}
      </p>

      <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-5">
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--st-ink-soft)]">
          <span className="hidden sm:inline">Rows per page</span>
          <span className="sm:hidden">Rows</span>
          <SettingsSelect
            aria-label="Rows per page"
            value={String(pageSize)}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            /* Narrow enough not to dominate the row, wide enough for "100"
               beside the chevron — which sits 12px from the right edge. */
            className="h-8 w-[74px] pl-2.5 pr-7 text-[12.5px]"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </SettingsSelect>
        </label>

        <span className="whitespace-nowrap text-[12.5px] text-[var(--st-ink-soft)]">
          Page{" "}
          <span className="font-medium text-[var(--st-ink)]">{total === 0 ? 0 : pageIndex + 1}</span> of{" "}
          <span className="font-medium text-[var(--st-ink)]">{pageCount || 0}</span>
        </span>

        <div className="flex items-center gap-1">
          {controls.map((control) => (
            <IconButton
              key={control.label}
              icon={control.icon}
              label={control.label}
              tone="secondary"
              onClick={control.go}
              disabled={!control.can}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
