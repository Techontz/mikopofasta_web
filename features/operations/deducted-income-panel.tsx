"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Coins } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import type { DeductedIncome } from "@/types/operations";
import { OPS_BRANCHES } from "@/lib/mock-data/operations";
import { formatOpsDate } from "@/features/operations/shared";

const ALL = "__all__";

/**
 * Loan Fee → Deducted Income.
 *
 * The fee taken from a loan at approval, which is income to the company. A
 * read-only ledger: the figure was decided when the loan was priced, so there
 * is nothing here to edit.
 */
export function DeductedIncomePanel({ rows }: { rows: DeductedIncome[] }) {
  const [branch, setBranch] = React.useState(ALL);

  const filtered = React.useMemo(
    () => rows.filter((r) => branch === ALL || r.branch === branch),
    [rows, branch]
  );

  const columns: ColumnDef<DeductedIncome>[] = [
    {
      id: "sn",
      header: "S/NO.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.customerName}</span>,
    },
    {
      accessorKey: "branch",
      header: "Branch Name",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "loanApproved",
      header: () => <span className="block text-right">Loan Approved</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.loanApproved)}</Money>,
    },
    {
      accessorKey: "incomeAmount",
      header: () => <span className="block text-right">Income Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.incomeAmount)}</Money>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Loan Fee (${filtered.length})`}
      description="Fees deducted at loan approval, recorded as income."
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
          <Filter label="Branch" htmlFor="di-branch">
            <Select id="di-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {OPS_BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Filter>
        </FilterBar>

        <SettingsTable
          columns={columns}
          data={filtered}
          searchFields={["customerName", "branch"]}
          searchPlaceholder="Search customer or branch…"
          emptyState={{
            icon: Coins,
            title: branch !== ALL ? "No income at this branch" : "No deducted income yet",
            description:
              branch !== ALL
                ? "Clear the filter to see income from every branch."
                : "A fee appears here when a loan is approved with one.",
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, r) => s + r.loanApproved, 0))}</Money>
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, r) => s + r.incomeAmount, 0))}</Money>
              </td>
              <td />
            </>
          )}
        />
      </div>
    </SettingsCard>
  );
}
