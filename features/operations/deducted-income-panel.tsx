"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Coins } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { ExportButton } from "@/components/settings/export-button";
import type { DeductedIncomeRecord } from "@/lib/api/charges";
import { formatOpsDate } from "@/features/operations/shared";

const ALL = "__all__";

/**
 * Loan Fee → Deducted Income.
 *
 * The fee withheld from a loan at disbursement, which is income to the company.
 *
 * Read-only, and necessarily so: the figure was fixed by the fee terms
 * snapshotted onto the loan when it was applied for, and posting it credited
 * 2100 Fee Income. Editing it here would put this screen at odds with the
 * ledger, and the ledger would be the one that is right.
 *
 * `loanApproved` is what the borrower owes; `incomeAmount` is what was kept
 * back. The borrower received the difference — which is what "deducted" means.
 */
export function DeductedIncomePanel({
  rows,
  totals,
  branches,
}: {
  rows: DeductedIncomeRecord[];
  /** Over the whole set on the server, not just this page. */
  totals: { income: number; approved: number };
  branches?: string[];
}) {
  const [branch, setBranch] = React.useState(ALL);

  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(rows.map((r) => r.branch).filter(Boolean))].sort(),
    [branches, rows]
  );

  const filtered = React.useMemo(
    () => rows.filter((r) => branch === ALL || r.branch === branch),
    [rows, branch]
  );

  const columns: ColumnDef<DeductedIncomeRecord>[] = [
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
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Fee Income"
          value={formatMoney(totals.income)}
          icon={Coins}
          tone="accent"
          hint="What 2100 Fee Income holds"
        />
        <StatCard label="Loans Approved" value={formatMoney(totals.approved)} icon={Coins} />
      </div>

      <SettingsCard
      title={`Loan Fee (${filtered.length})`}
      description="Fees withheld at disbursement, recorded as income."
      actions={
        <ExportButton
          rows={filtered}
          columns={[
            { header: "Customer", key: "customerName" },
            { header: "Loan", key: "loanNumber" },
            { header: "Branch", key: "branch" },
            { header: "Loan Approved", key: "loanApproved" },
            { header: "Income", key: "incomeAmount" },
            { header: "Net Disbursed", key: "netDisbursed" },
            { header: "Date", key: "date" },
          ]}
          filename="deducted-income"
        />
      }
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
          <Filter label="Branch" htmlFor="di-branch">
            <Select id="di-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {branchOptions.map((b) => (
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
    </>
  );
}
