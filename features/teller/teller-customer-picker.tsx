"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, UserSearch } from "lucide-react";
import { SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { CustomerListItem } from "@/lib/api/customers";

/**
 * Teller → Teller Dashboard.
 *
 * The legacy screen is a customer search, and picking somebody opens their
 * Customer Loan Information. That is still what this does; what changed is
 * where the names come from — this was a dropdown over `PROFILE_OPTIONS`, three
 * fixtures built from a single capture.
 *
 * A table rather than a dropdown, because the customer book is not three names.
 * A select over a real book is unsearchable past the first screenful, and a
 * teller looking somebody up by phone number could not do it at all.
 *
 * The row links to `/teller/{id}` — this system's customer id, not the legacy
 * customer number. The number is still shown, because that is what a customer
 * reads off their own paperwork and what a teller is told over the counter.
 */
export function TellerCustomerPicker({ customers }: { customers: CustomerListItem[] }) {
  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <Link
          href={`/teller/${row.original.id}`}
          className="block min-w-0 hover:underline"
        >
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.fullName}</p>
          <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
            {row.original.customerNumber} · {row.original.phone}
          </p>
        </Link>
      ),
    },
    {
      accessorKey: "branchName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      cell: ({ row }) => row.original.branchName ?? "—",
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => row.original.categoryName ?? "—",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          tone={row.original.status === "active" ? "active" : "inactive"}
          className="capitalize"
        >
          {row.original.status.replace(/_/g, " ")}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <Link href={`/teller/${row.original.id}`} className="st-btn st-btn-secondary st-btn-sm">
            Open session
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Search Customer (${customers.length})`}
      description="Pick a customer to open their teller session."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={customers}
        searchFields={["fullName", "customerNumber", "phone"]}
        searchPlaceholder="Search by name, customer number or phone…"
        facetedFilters={[
          {
            columnId: "branchName",
            title: "Branch",
            options: [
              ...new Set(customers.map((c) => c.branchName).filter((b): b is string => !!b)),
            ].map((b) => ({ label: b, value: b })),
          },
        ]}
        emptyState={{
          icon: UserSearch,
          title: "No customers",
          description: "Nobody has been registered at a branch you can see.",
        }}
      />
    </SettingsCard>
  );
}
