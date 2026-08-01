"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, UserSearch } from "lucide-react";
import { SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { CustomerListItem } from "@/lib/api/customers";

/**
 * Loan → Loan Application, the landing screen.
 *
 * The legacy module opens on a customer search rather than on the form: pick
 * somebody, and the application follows. That first step is what this is.
 *
 * It used to be a dropdown over `LEGACY_CUSTOMERS` — eighteen names transcribed
 * off the old screen — whose Start button went to the wired form and carried
 * nothing, because the choice could not travel. Both halves are fixed: the list
 * is the real customer book, and the form is where each row goes.
 *
 * ## Who is listed
 *
 * Only customers who can actually borrow: KYC completed and approved. The
 * legacy dropdown listed everybody and let the officer discover at the next
 * step that the person was not eligible; §9 makes KYC the gate, so the gate
 * belongs here where it saves the walk.
 */
export function LoanApplicantPicker({ customers }: { customers: CustomerListItem[] }) {
  const columns: ColumnDef<CustomerListItem>[] = [
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.fullName}</p>
          <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
            {row.original.customerNumber} · {row.original.phone}
          </p>
        </div>
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
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={row.original.status === "active" ? "active" : "inactive"} className="capitalize">
          {row.original.status.replace(/_/g, " ")}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <Link href="/loans/new/apply" className="st-btn st-btn-primary st-btn-sm">
            Start Application
            <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Eligible customers (${customers.length})`}
      description="Customers whose KYC is complete and approved, and who may therefore borrow."
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
            options: [...new Set(customers.map((c) => c.branchName).filter((b): b is string => !!b))].map(
              (b) => ({ label: b, value: b })
            ),
          },
          {
            columnId: "categoryName",
            title: "Category",
            options: [...new Set(customers.map((c) => c.categoryName).filter((c): c is string => !!c))].map(
              (c) => ({ label: c, value: c })
            ),
          },
        ]}
        emptyState={{
          icon: UserSearch,
          title: "No customer can borrow yet",
          description:
            "A customer needs completed KYC and an approved registration before an application can be started.",
        }}
      />
    </SettingsCard>
  );
}
