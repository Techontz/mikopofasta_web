"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { RegionFormDialog } from "@/features/admin/organization/region-form-dialog";
import { deleteRegion } from "@/features/admin/organization/regions-actions";
import type { Region } from "@/types/branch";

function branchCountFor(regionId: string, branches: { regionId: string | null }[]) {
  return branches.filter((b) => b.regionId === regionId).length;
}

export function RegionsTable({ regions, branches }: { regions: Region[]; branches: { regionId: string | null }[] }) {
  const columns: ColumnDef<Region>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      id: "branchCount",
      header: "Branches",
      cell: ({ row }) => branchCountFor(row.original.id, branches),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <RegionFormDialog region={row.original} />
          <ConfirmDeleteDialog
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                <Trash2 />
              </Button>
            }
            title="Delete region?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Region deleted."
            onConfirm={() => deleteRegion(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={regions}
      searchFields={["name"]}
      searchPlaceholder="Search regions…"
      toolbarAction={<RegionFormDialog />}
      emptyState={{ icon: MapPin, title: "No regions yet", description: "Add a region to start organizing branches geographically." }}
    />
  );
}
