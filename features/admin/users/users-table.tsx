"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Users as UsersIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { UserFormDialog } from "@/features/admin/users/user-form-dialog";
import { UserStatusAction } from "@/features/admin/users/user-status-action";
import { ROLE_LABELS } from "@/config/permissions";
import { ROLES } from "@/types/auth";
import type { MockCredential } from "@/lib/mock-data/users";
import type { Branch, Zone, Region } from "@/types/branch";

export function UsersTable({ users, branches, zones, regions }: { users: MockCredential[]; branches: Branch[]; zones: Zone[]; regions: Region[] }) {
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  const columns: ColumnDef<MockCredential>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/admin/users/${row.original.id}`} className="flex items-center gap-2 hover:underline">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{row.original.avatarInitials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.phone}</span>
          </div>
        </Link>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => <StatusBadge tone="neutral" dot={false}>{ROLE_LABELS[row.original.role]}</StatusBadge>,
      filterFn: "arrIncludesSome",
    },
    { id: "branch", header: "Branch", cell: ({ row }) => branchName(row.original.branchId) },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === "active" ? "active" : "inactive"} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <UserFormDialog user={row.original} branches={branches} zones={zones} regions={regions} />
          <UserStatusAction user={row.original} />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={users}
      searchFields={["name", "phone", "email"]}
      searchPlaceholder="Search staff…"
      facetedFilters={[
        { columnId: "role", title: "Role", options: ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })) },
        { columnId: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Suspended", value: "suspended" }] },
      ]}
      toolbarAction={<UserFormDialog branches={branches} zones={zones} regions={regions} />}
      emptyState={{ icon: UsersIcon, title: "No staff yet", description: "Create the first user account to get started." }}
    />
  );
}
