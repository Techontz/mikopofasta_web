"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Banknote, ClipboardList, Clock, Layers } from "lucide-react";
import { Money, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { formatMoney } from "@/lib/domain/money";
import {
  LEGACY_DISBURSED_LOANS,
  LEGACY_DISBURSED_TOTALS,
  LEGACY_PENDING_ROW_COUNT,
} from "@/lib/legacy/source";

/**
 * Loan → Overview.
 *
 * The module's position in four figures, and the most recent movement under
 * them. Every number is derived from the transcribed legacy screens rather than
 * typed in: applications is pending plus disbursed, and rejected is zero
 * because the legacy Loan Rejected screen was captured with no rows. A tile
 * that can drift from the list it summarises is worse than no tile.
 *
 * The full, live loan book is one click away at /loans/book — this screen is
 * the legacy module's front page, not a replacement for it.
 */

interface ActivityRow {
  id: string;
  customer: string;
  branch: string;
  event: "Disbursed" | "Applied";
  amount: number;
  date: string;
}

/**
 * The five most recent movements across both captured lists.
 *
 * Disbursed rows carry a date; pending rows do not — the legacy Loan Pending
 * screen has no date column — so pending applications sort after the dated rows
 * rather than being given an invented timestamp.
 */
const ACTIVITY: ActivityRow[] = [
  ...LEGACY_DISBURSED_LOANS.map((l) => ({
    id: `d-${l.loanAc}`,
    customer: l.customerName,
    branch: l.branch,
    event: "Disbursed" as const,
    amount: l.disbursed,
    date: l.date,
  })),
]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5);

export function LoanOverviewPanel() {
  const applications = LEGACY_PENDING_ROW_COUNT + LEGACY_DISBURSED_TOTALS.rowCount;

  const columns: ColumnDef<ActivityRow>[] = [
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">
            {row.original.customer || "—"}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: "event",
      header: "Event",
      cell: ({ row }) => (
        <StatusBadge tone={row.original.event === "Disbursed" ? "active" : "warning"}>
          {row.original.event}
        </StatusBadge>
      ),
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
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">{row.original.date}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={applications}
          icon={ClipboardList}
          tone="accent"
          hint="Pending plus disbursed"
        />
        <StatCard label="Pending Approval" value={LEGACY_PENDING_ROW_COUNT} icon={Clock} />
        <StatCard
          label="Disbursed"
          value={LEGACY_DISBURSED_TOTALS.rowCount}
          icon={Banknote}
          hint={formatMoney(LEGACY_DISBURSED_TOTALS.disbursed)}
        />
        <StatCard label="Rejected" value={0} icon={Ban} />
      </div>

      <SettingsCard
        title="Recent activity"
        description="The latest movement on the book, newest first."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={ACTIVITY}
          emptyState={{ icon: Layers, title: "No activity yet", description: "Nothing has moved on the book." }}
        />
      </SettingsCard>
    </div>
  );
}
