"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, UserSearch } from "lucide-react";
import { SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { CustomerListItem } from "@/lib/api/customers";

/**
 * Customer → Customer Profile, the search step.
 *
 * A table rather than the legacy dropdown, for the same reason the Teller
 * search is one: a select over a real customer book is unsearchable past the
 * first screenful, and somebody looking a customer up by their number — which
 * is what a customer reads off their own paperwork — could not do it at all.
 */
export function CustomerSearchPanel({ customers }: { customers: CustomerListItem[] }) {
  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`} className="block min-w-0 hover:underline">
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
      filterFn: "arrIncludesSome",
    },
    {
      id: "kyc",
      header: "KYC",
      cell: ({ row }) => (
        <StatusBadge
          tone={row.original.kycStatus === "completed" ? "active" : "warning"}
          className="capitalize"
        >
          {row.original.kycStatus.replace(/_/g, " ")}
        </StatusBadge>
      ),
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
          <Link href={`/customers/${row.original.id}`} className="st-btn st-btn-secondary st-btn-sm">
            Open profile
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Customers (${customers.length})`}
      description="Look somebody up by name, customer number or phone."
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
          {
            columnId: "categoryName",
            title: "Category",
            options: [
              ...new Set(customers.map((c) => c.categoryName).filter((c): c is string => !!c)),
            ].map((c) => ({ label: c, value: c })),
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
