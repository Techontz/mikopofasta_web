"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Wallet } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import type { SalaryAdvancePayment } from "@/types/salary-advance";
import { ADVANCE_BRANCHES } from "@/lib/mock-data/salary-advance";
import { formatAdvanceDate } from "@/features/salary-advance/shared";

const ALL = "__all__";

/**
 * Salary Advance → Salary Advance Paid List.
 *
 * Individual repayments, newest first. Four columns, as the original screen
 * has — this is a cash record, not an advance record, so it carries the payment
 * and nothing about the advance's balance.
 */
export function PaidListPanel({ payments }: { payments: SalaryAdvancePayment[] }) {
  const [branch, setBranch] = React.useState(ALL);

  const filtered = React.useMemo(
    () => payments.filter((p) => branch === ALL || p.branch === branch),
    [payments, branch]
  );

  const columns: ColumnDef<SalaryAdvancePayment>[] = [
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.customerName}</span>,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatAdvanceDate(row.original.date)}
        </span>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Salary Advance Paid List (${filtered.length})`}
      description="Every repayment received against a salary advance."
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
          <Filter label="Branch" htmlFor="pl-branch">
            <Select id="pl-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {ADVANCE_BRANCHES.map((b) => (
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
          searchFields={["branch", "customerName"]}
          searchPlaceholder="Search branch or customer…"
          emptyState={{
            icon: Wallet,
            title: branch !== ALL ? "No payments at this branch" : "No repayments yet",
            description:
              branch !== ALL
                ? "Clear the filter to see repayments from every branch."
                : "A repayment appears here as soon as one is received.",
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              <td>
                <Money strong>{formatMoney(shown.reduce((s, p) => s + p.amount, 0))}</Money>
              </td>
              <td />
            </>
          )}
        />
      </div>
    </SettingsCard>
  );
}
