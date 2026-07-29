"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, X, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { cn } from "@/lib/utils";

interface FacetedFilterConfig {
  columnId: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Row fields checked by the search box — read via each row's plain object, not the column accessor. */
  searchFields?: (keyof TData)[];
  searchPlaceholder?: string;
  facetedFilters?: FacetedFilterConfig[];
  toolbarAction?: React.ReactNode;
  emptyState: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode };
  isLoading?: boolean;
  error?: unknown;
  /**
   * Presentation only. "settings" swaps in the configuration surface — card
   * container, sticky uppercase header, quieter rules. Defaults to the
   * original look so every existing caller is untouched.
   */
  variant?: "default" | "settings";
  /** Rows to draw while loading; match the page size for a stable skeleton. */
  skeletonRows?: number;
}

/**
 * The one DataTable every admin (and later, every module) screen configures
 * — per docs/frontend-technical-specification.md §5. Search, faceted
 * filters, sorting, pagination, and empty/loading/error states all live
 * here exactly once.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchFields,
  searchPlaceholder = "Search…",
  facetedFilters,
  toolbarAction,
  emptyState,
  isLoading,
  error,
  variant = "default",
  skeletonRows = 5,
}: DataTableProps<TData, TValue>) {
  const settings = variant === "settings";
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!searchFields || searchFields.length === 0) return true;
      const needle = String(filterValue).toLowerCase();
      return searchFields.some((field) => String(row.original[field] ?? "").toLowerCase().includes(needle));
    },
    autoResetPageIndex: false,
  });

  const isFiltered = columnFilters.length > 0 || globalFilter.length > 0;

  return (
    <div className={settings ? "space-y-4" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {searchFields && searchFields.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search
              className={cn(
                "absolute left-3 top-1/2 size-4 -translate-y-1/2",
                settings ? "text-[var(--st-ink-faint)]" : "left-2.5 text-muted-foreground"
              )}
            />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={settings ? "st-control pl-9" : "pl-8"}
            />
          </div>
        )}
        {facetedFilters?.map((filter) => (
          <DataTableFacetedFilter key={filter.columnId} column={table.getColumn(filter.columnId)} title={filter.title} options={filter.options} />
        ))}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setColumnFilters([]);
              setGlobalFilter("");
            }}
          >
            Reset
            <X className="size-4" />
          </Button>
        )}
        {toolbarAction && <div className="ml-auto">{toolbarAction}</div>}
      </div>

      <div
        className={cn(
          "overflow-x-auto",
          settings ? "st-card max-h-[68vh] overflow-y-auto" : "rounded-lg border"
        )}
      >
        <Table className={settings ? "st-table" : undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={settings ? "hover:bg-transparent" : undefined}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <ErrorState error={error} className="border-none" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <EmptyState className="border-none" {...emptyState} />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !error && <DataTablePagination table={table} />}
    </div>
  );
}
