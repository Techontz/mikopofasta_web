"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Building2, Crown, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDeleteDialog } from "@/components/data-table/confirm-delete-dialog";
import { BranchFormDialog } from "@/features/admin/organization/branch-form-dialog";
import { BranchRoutingDialog } from "@/features/admin/organization/branch-routing-dialog";
import { deleteBranch, setHeadOffice } from "@/features/admin/organization/branches-actions";
import type { BranchRouteStage } from "@/lib/api/organization";
import type { Branch, Region, Zone } from "@/types/branch";

function HeadOfficeAction({ branch }: { branch: Branch }) {
  const [pending, startTransition] = useTransition();
  if (branch.isHeadOffice) return <StatusBadge tone="default" dot={false}><Crown className="size-3" aria-hidden />Head Office</StatusBadge>;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setHeadOffice(branch.id);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      Set as HQ
    </Button>
  );
}

export function BranchesTable({
  branches,
  regions,
  zones,
  routes,
}: {
  branches: Branch[];
  regions: Region[];
  zones: Zone[];
  /** D4 — each branch's approval chain, keyed by branch id. */
  routes: Record<string, BranchRouteStage[]>;
}) {
  const regionName = (id: string | null) => regions.find((r) => r.id === id)?.name ?? "—";
  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? "—";

  const columns: ColumnDef<Branch>[] = [
    { accessorKey: "name", header: ({ column }) => <DataTableColumnHeader column={column} title="Name" /> },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    { id: "region", header: "Region", cell: ({ row }) => regionName(row.original.regionId) },
    { id: "zone", header: "Zone", cell: ({ row }) => zoneName(row.original.zoneId) },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="capitalize">{row.original.type}</span>,
      filterFn: "arrIncludesSome",
    },
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
    { id: "hq", header: "Head Office", cell: ({ row }) => <HeadOfficeAction branch={row.original} /> },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <BranchRoutingDialog branch={row.original} stages={routes[row.original.id] ?? []} />
          <BranchFormDialog branch={row.original} regions={regions} zones={zones} branches={branches} />
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                /* Icon-only and destructive, so the name has to come from somewhere.
                   Without this the button announces as just "button", and every row
                   on the table announces identically. */
                aria-label={`Delete branch ${row.original.name}`}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
              </Button>
            }
            title="Delete branch?"
            description={`"${row.original.name}" will be permanently removed. This can't be undone.`}
            successMessage="Branch deleted."
            onConfirm={() => deleteBranch(row.original.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={branches}
      searchFields={["name", "phone"]}
      searchPlaceholder="Search branches…"
      facetedFilters={[
        { columnId: "type", title: "Type", options: [{ label: "Main", value: "main" }, { label: "Sub", value: "sub" }] },
        { columnId: "status", title: "Status", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] },
      ]}
      toolbarAction={<BranchFormDialog regions={regions} zones={zones} branches={branches} />}
      emptyState={{ icon: Building2, title: "No branches yet", description: "Add your first branch to begin onboarding customers and loans." }}
    />
  );
}
