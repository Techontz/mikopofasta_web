"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { Money, StatusBadge, type StatusTone } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";

/**
 * HRM → Branch & Staff.
 *
 * A join of two APIs that both already existed — `GET /api/v1/branches` and
 * `GET /api/v1/staff` — rather than a new endpoint. The page counts each
 * branch's establishment and what it costs per month, which is the question
 * the legacy screen's Branch List answers once you click into a branch.
 *
 * The headcount and salary figures are DERIVED from the staff book on the
 * server, not stored on the branch, so this page and All Active Staff can never
 * disagree about who works where.
 */

export interface BranchStaffRow {
  id: string;
  name: string;
  phone: string;
  regionName: string;
  status: string;
  isHeadOffice: boolean;
  headcount: number;
  activeCount: number;
  monthlySalary: number;
}

const STATUS_TONE: Record<string, StatusTone> = {
  active: "active",
  inactive: "inactive",
  closed: "danger",
};

export function BranchStaffTable({ branches }: { branches: BranchStaffRow[] }) {
  const columns: ColumnDef<BranchStaffRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch Name" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</p>
          {row.original.isHeadOffice && (
            <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">Head office</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Branch Phone Number",
      cell: ({ row }) => <span className="font-tabular">{row.original.phone}</span>,
    },
    { accessorKey: "regionName", header: "Branch region" },
    {
      accessorKey: "headcount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Staff" />,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.headcount}</span>
      ),
    },
    {
      accessorKey: "activeCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.activeCount}</span>
      ),
    },
    {
      accessorKey: "monthlySalary",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Monthly salary" />,
      cell: ({ row }) => (
        <Money strong muted={row.original.monthlySalary === 0}>
          {formatMoney(row.original.monthlySalary)}
        </Money>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.status] ?? "neutral"} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={branches}
      searchFields={["name", "regionName", "phone"]}
      searchPlaceholder="Search branch or region…"
      emptyState={{
        icon: Building2,
        title: "No branches",
        description: "Branches are registered under Settings → Organization.",
      }}
      renderFooter={(shown) => (
        <>
          <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={3}>
            {shown.length} branch{shown.length === 1 ? "" : "es"}
          </td>
          <td className="px-4 py-3">
            <span className="font-tabular block text-right font-semibold text-[var(--st-ink)]">
              {shown.reduce((s, b) => s + b.headcount, 0)}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className="font-tabular block text-right font-semibold text-[var(--st-ink)]">
              {shown.reduce((s, b) => s + b.activeCount, 0)}
            </span>
          </td>
          <td className="px-4 py-3">
            <Money strong>{formatMoney(shown.reduce((s, b) => s + b.monthlySalary, 0))}</Money>
          </td>
          <td />
        </>
      )}
    />
  );
}
