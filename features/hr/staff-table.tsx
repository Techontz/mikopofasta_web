"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { UsersRound } from "lucide-react";
import { Money, StatusBadge, type StatusTone } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@/types/enums";

/**
 * The Employee List.
 *
 * PRESENTATION ONLY in this pass. The columns, their order, the sortable
 * headers, the two faceted filters, the search fields, the empty state and the
 * links into a staff record are all exactly as they were — what changed is that
 * it renders through SettingsTable and StatusBadge, the components every
 * Menu-tab module uses, instead of the bare DataTable and shadcn Badge.
 */

export interface StaffRow {
  id: string;
  employeeNumber: string;
  name: string;
  role: string;
  branchName: string;
  baseSalary: number;
  commissionEligible: boolean;
  employmentStatus: EmploymentStatus;
  hiredAt: string;
}

/**
 * Employment status → the app's own badge tone.
 *
 * Replaces a table of hand-written emerald/amber/destructive class strings. The
 * tones carry their colours in `.st-tone-*`, which is what lets one badge be
 * correct in both themes — the old strings had to spell out a dark variant per
 * state and could only ever describe the ones they remembered.
 */
const STATUS_TONE: Record<EmploymentStatus, StatusTone> = {
  active: "active",
  suspended: "warning",
  terminated: "danger",
};

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const columns: ColumnDef<StaffRow>[] = [
    {
      accessorKey: "employeeNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee #" />,
      cell: ({ row }) => (
        <Link
          href={`/hr/staff/${row.original.id}`}
          className="font-tabular font-medium text-[var(--st-ink)] hover:underline"
        >
          {row.original.employeeNumber}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link
          href={`/hr/staff/${row.original.id}`}
          className="whitespace-nowrap font-medium text-[var(--st-ink)] hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "role", header: "Role", filterFn: "arrIncludesSome" },
    { accessorKey: "branchName", header: "Branch" },
    {
      accessorKey: "baseSalary",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Salary" />,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.baseSalary)}</Money>,
    },
    {
      id: "commission",
      header: "Commission",
      cell: ({ row }) =>
        row.original.commissionEligible ? (
          <StatusBadge tone="info">Eligible</StatusBadge>
        ) : (
          <span className="text-[var(--st-ink-faint)]">—</span>
        ),
    },
    {
      accessorKey: "employmentStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.employmentStatus]} className="capitalize">
          {row.original.employmentStatus}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
  ];

  const roles = Array.from(new Set(staff.map((s) => s.role))).sort();

  return (
    <SettingsTable
      columns={columns}
      data={staff}
      searchFields={["employeeNumber", "name"]}
      searchPlaceholder="Search by employee # or name…"
      facetedFilters={[
        { columnId: "role", title: "Role", options: roles.map((r) => ({ label: r, value: r })) },
        {
          columnId: "employmentStatus",
          title: "Status",
          options: EMPLOYMENT_STATUSES.map((s) => ({ label: s, value: s })),
        },
      ]}
      emptyState={{
        icon: UsersRound,
        title: "No staff records",
        description: "Staff are registered by HR alongside their user account.",
      }}
    />
  );
}
