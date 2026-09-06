"use client";

import * as React from "react";
import { CalendarCheck, ChevronDown, ChevronRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { IconButton } from "@/components/settings/form";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import type { AccountingPeriod } from "@/types/accounting";
import { LedgerReference, PeriodStatusBadge } from "@/features/accounting/shared";
import { formatDateTime, formatPeriod } from "@/features/accounting/format";

/**
 * Every closed period, newest first, with the per-branch breakdown behind each.
 *
 * The breakdown is collapsed by default and expandable per row. It is what §11
 * derives a commission pool from, so an operator asking why a branch's pool is
 * what it is can be shown the profit and the reserve that produced it — but
 * forty branches on every row would bury the period itself.
 */
export function PeriodHistoryTable({ periods }: { periods: AccountingPeriod[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const columns: ColumnDef<AccountingPeriod>[] = [
    {
      id: "expander",
      header: "",
      cell: ({ row }) => {
        const results = row.original.branchResults ?? [];
        if (results.length === 0) return null;

        const isOpen = expanded === row.original.id;

        return (
          <IconButton
            type="button"
            tone="secondary"
            icon={isOpen ? ChevronDown : ChevronRight}
            aria-expanded={isOpen}
            label={isOpen ? "Hide branch breakdown" : "Show branch breakdown"}
            onClick={() => setExpanded(isOpen ? null : row.original.id)}
          />
        );
      },
    },
    {
      accessorKey: "period",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Period" />,
      cell: ({ row }) => (
        <span className="font-medium text-[var(--st-ink)]">{formatPeriod(row.original.period)}</span>
      ),
    },
    {
      accessorKey: "incomeTotal",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Income" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.incomeTotal)}</span>
      ),
    },
    {
      accessorKey: "expenseTotal",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Expense" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.expenseTotal)}</span>
      ),
    },
    {
      accessorKey: "realisedProfit",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Realised profit" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap font-semibold text-[var(--st-ink)]">
          {formatMoney(row.original.realisedProfit)}
        </span>
      ),
    },
    {
      accessorKey: "reserveAppropriated",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reserve" />,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-tabular whitespace-nowrap">{formatMoney(row.original.reserveAppropriated)}</p>
          {/*
            The rate at the moment of close, not the current setting — a period
            closed at one rate and read after it changed would otherwise look
            like bad arithmetic.
          */}
          <p className="text-[12.5px] text-[var(--st-ink-faint)]">at {row.original.reservePercentage}%</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <PeriodStatusBadge status={row.original.status} />,
    },
    {
      id: "audit",
      header: "Audit",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
          <p>Closed by {row.original.closedByName ?? "—"}</p>
          <p>{formatDateTime(row.original.closedAt)}</p>
          {row.original.notes && <p className="max-w-[16rem] text-[var(--st-ink-soft)]">{row.original.notes}</p>}
        </div>
      ),
    },
    {
      id: "ledger",
      header: "Ledger",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <LedgerReference journalEntryId={row.original.profitJournalEntryId} absentLabel="No profit entry" />
          <LedgerReference
            journalEntryId={row.original.reserveJournalEntryId}
            absentLabel="No reserve taken"
          />
        </div>
      ),
    },
  ];

  const openPeriod = periods.find((p) => p.id === expanded) ?? null;

  return (
    <div className="space-y-3">
      <SettingsTable
        columns={columns}
        data={periods}
        searchFields={["period"]}
        searchPlaceholder="Search periods…"
        emptyState={{
          icon: CalendarCheck,
          title: "No period has been closed",
          description:
            "Closing a period recognises its profit and appropriates its reserve. Preview the figures first — there is no reopen.",
        }}
      />

      {openPeriod && (
        <div className="px-5 pb-5 sm:px-6">
          <div className="st-card overflow-hidden">
            <div className="border-b border-[var(--st-line)] px-4 py-3">
              <p className="text-[14px] font-semibold text-[var(--st-ink)]">
                {formatPeriod(openPeriod.period)} — per branch
              </p>
              <p className="text-[12.5px] text-[var(--st-ink-faint)]">
                The figures §11 computes each branch&rsquo;s commission pool from.
              </p>
            </div>

            {(openPeriod.branchResults ?? []).length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No branch activity"
                description="This period's income and expense carried no branch."
                className="border-none"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="st-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th scope="col">Branch</th>
                      <th scope="col" className="!text-right">Income</th>
                      <th scope="col" className="!text-right">Expense</th>
                      <th scope="col" className="!text-right">Realised profit</th>
                      <th scope="col" className="!text-right">Reserve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(openPeriod.branchResults ?? []).map((result) => (
                      <tr key={result.branchId}>
                        <td className="font-medium text-[var(--st-ink)]">{result.branchName ?? "—"}</td>
                        <td className="font-tabular !text-right">{formatMoney(result.incomeTotal)}</td>
                        <td className="font-tabular !text-right">{formatMoney(result.expenseTotal)}</td>
                        <td className="font-tabular !text-right font-semibold text-[var(--st-ink)]">
                          {formatMoney(result.realisedProfit)}
                        </td>
                        <td className="font-tabular !text-right">{formatMoney(result.reserveAppropriated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
