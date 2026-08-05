"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Map, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { ZoneFormDialog } from "@/features/admin/organization/zone-form-dialog";
import { deleteZone } from "@/features/admin/organization/zones-actions";
import type { Zone } from "@/types/branch";
import type { AuthenticatedUser } from "@/types/auth";

export function ZonesTable({ zones, managers, branches }: { zones: Zone[]; managers: Pick<AuthenticatedUser, "id" | "name">[]; branches: { zoneId: string | null }[] }) {
  const managerName = (id: string | null) => (id ? managers.find((m) => m.id === id)?.name ?? "Unknown" : "Unassigned");

  const columns: ColumnDef<Zone>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      id: "manager",
      header: "Zone Manager",
      cell: ({ row }) =>
        row.original.zoneManagerId ? managerName(row.original.zoneManagerId) : <StatusBadge tone="warning">Unassigned</StatusBadge>,
    },
    {
      id: "branchCount",
      header: "Branches",
      cell: ({ row }) => branches.filter((b) => b.zoneId === row.original.id).length,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <ZoneFormDialog zone={row.original} managers={managers} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete zone ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete zone?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Zone deleted."
            onConfirm={() => deleteZone(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={zones}
      searchFields={["name"]}
      searchPlaceholder="Search zones…"
      toolbarAction={<ZoneFormDialog managers={managers} />}
      emptyState={{ icon: Map, title: "No zones yet", description: "Add a zone to group branches for oversight and commission overrides." }}
    />
  );
}
