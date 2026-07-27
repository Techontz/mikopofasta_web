"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import { EMPLOYMENT_STATUSES, type EmploymentStatus } from "@/types/enums";

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

const STATUS_TONE: Record<EmploymentStatus, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  suspended: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  terminated: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function StaffTable({ staff }: { staff: StaffRow[] }) {
  const columns: ColumnDef<StaffRow>[] = [
    {
      accessorKey: "employeeNumber",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Employee #" />,
      cell: ({ row }) => (
        <Link href={`/hr/staff/${row.original.id}`} className="font-tabular font-medium hover:underline">
          {row.original.employeeNumber}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/hr/staff/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "role", header: "Role", filterFn: "arrIncludesSome" },
    { accessorKey: "branchName", header: "Branch" },
    {
      accessorKey: "baseSalary",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Base Salary" />,
      cell: ({ row }) => <span className="font-tabular">{formatMoney(row.original.baseSalary)}</span>,
    },
    {
      id: "commission",
      header: "Commission",
      cell: ({ row }) => (row.original.commissionEligible ? <Badge variant="outline">Eligible</Badge> : <span className="text-muted-foreground">—</span>),
    },
    {
      accessorKey: "employmentStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant="outline" className={`capitalize ${STATUS_TONE[row.original.employmentStatus]}`}>
          {row.original.employmentStatus}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
  ];

  const roles = Array.from(new Set(staff.map((s) => s.role))).sort();

  return (
    <DataTable
      columns={columns}
      data={staff}
      searchFields={["employeeNumber", "name"]}
      searchPlaceholder="Search by employee # or name…"
      facetedFilters={[
        { columnId: "role", title: "Role", options: roles.map((r) => ({ label: r, value: r })) },
        { columnId: "employmentStatus", title: "Status", options: EMPLOYMENT_STATUSES.map((s) => ({ label: s, value: s })) },
      ]}
      emptyState={{ icon: UsersRound, title: "No staff records", description: "Staff are registered by HR alongside their user account." }}
    />
  );
}
