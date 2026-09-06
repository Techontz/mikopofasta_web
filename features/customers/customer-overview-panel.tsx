"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UserCheck, UserPlus, Users, VenusAndMars } from "lucide-react";
import { SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import type { CustomerListRow } from "@/features/customers/all-customers-panel";

/**
 * Customer → Overview.
 *
 * Four figures and the most recent registrations. Everything is counted from
 * the same rows the All Customer tab lists, so the two can never disagree —
 * a headline figure that is maintained separately from the list under it is
 * how a dashboard starts lying.
 */
export function CustomerOverviewPanel({
  rows,
  currentMonth,
}: {
  rows: CustomerListRow[];
  /** `YYYY-MM`, resolved on the server — see the note on AllCustomersPanel. */
  currentMonth: string;
}) {
  const male = rows.filter((c) => c.gender === "Male").length;
  const female = rows.filter((c) => c.gender === "Female").length;

  const recent = [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const columns: ColumnDef<CustomerListRow>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</p>
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
            {row.original.customerId} · {row.original.branch}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => row.original.gender ?? <span className="text-[var(--st-ink-faint)]">—</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-tabular">
          {row.original.phone ?? <span className="text-[var(--st-ink-faint)]">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === "active" ? "active" : "warning"} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Customers" value={rows.length} icon={Users} tone="accent" />
        <StatCard
          label="Active"
          value={rows.filter((c) => c.status === "active").length}
          icon={UserCheck}
        />
        <StatCard
          label="New This Month"
          value={rows.filter((c) => c.createdAt.startsWith(currentMonth)).length}
          icon={UserPlus}
        />
        <StatCard
          label="Male / Female"
          value={`${male} / ${female}`}
          icon={VenusAndMars}
          hint={
            male + female < rows.length
              ? `${rows.length - male - female} not recorded`
              : undefined
          }
        />
      </div>

      <SettingsCard
        title="Recent registrations"
        description="The five most recently opened customer records."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={recent}
          emptyState={{
            icon: Users,
            title: "No records to show",
            description: "Register a customer to see them here.",
          }}
        />
      </SettingsCard>
    </div>
  );
}
