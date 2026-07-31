"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, UserCheck, Users, UserX, Wallet } from "lucide-react";
import { SettingsCard, StatCard, StatusBadge, type StatusTone } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ExportButton } from "@/components/settings/export-button";
import { IconButton } from "@/components/settings/form";
import { CUSTOMERS, initialsOf, type Customer } from "@/lib/mock/people";
import { BRANCHES, CUSTOMER_STATUSES, LOAN_TYPES } from "@/lib/mock/reference";

/**
 * Customer → All Customer. One hundred and twenty customers.
 *
 * Search, per-column faceted filters, sorting, pagination and CSV export all
 * come from the shared DataTable and ExportButton, so this screen configures
 * them rather than reimplementing them.
 */

const STATUS_TONE: Record<string, StatusTone> = {
  Active: "active",
  Pending: "warning",
  Suspended: "danger",
  Closed: "inactive",
};

/** The avatar. Initials rather than a photograph — see initialsOf for why. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--st-accent)_16%,transparent)] font-semibold text-[var(--st-accent)]"
    >
      {initialsOf(name)}
    </span>
  );
}

export function CustomerListPanel() {
  const tiles = React.useMemo(() => {
    const by = (s: string) => CUSTOMERS.filter((c) => c.status === s).length;
    return [
      { label: "Total Customers", value: CUSTOMERS.length, icon: Users, tone: "accent" as const },
      { label: "Active", value: by("Active"), icon: UserCheck },
      { label: "Pending", value: by("Pending"), icon: Wallet },
      { label: "Suspended / Closed", value: by("Suspended") + by("Closed"), icon: UserX },
    ];
  }, []);

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "customerId",
      header: "Customer ID",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.customerId}</span>,
    },
    {
      accessorKey: "fullName",
      header: "Full Name",
      cell: ({ row }) => (
        <Link
          href={`/customers/profile?id=${row.original.id}`}
          className="inline-flex items-center gap-2 font-medium text-[var(--st-ink)] hover:underline"
        >
          <Avatar name={row.original.fullName} size={28} />
          <span className="whitespace-nowrap">{row.original.fullName}</span>
        </Link>
      ),
    },
    { accessorKey: "gender", header: "Gender" },
    {
      accessorKey: "age",
      header: () => <span className="block text-right">Age</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.age}</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone Number",
      cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.phone}</span>,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "loanType",
      header: "Loan Type",
      cell: ({ row }) => <span className="whitespace-nowrap text-[var(--st-ink-soft)]">{row.original.loanType}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.status] ?? "neutral"}>{row.original.status}</StatusBadge>
      ),
    },
    {
      accessorKey: "registeredOn",
      header: "Registration Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">{row.original.registeredOn}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link href={`/customers/profile?id=${row.original.id}`} aria-label={`View ${row.original.fullName}`}>
            <IconButton icon={Eye} label="View customer" />
          </Link>
          <IconButton icon={Pencil} label="Edit customer" disabled />
          <IconButton icon={Trash2} label="Delete customer" disabled />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <StatCard key={t.label} label={t.label} value={String(t.value)} icon={t.icon} tone={t.tone} />
        ))}
      </div>

      <SettingsCard title="All Customer">
        <SettingsTable
          columns={columns}
          data={CUSTOMERS}
          searchFields={["fullName", "customerId", "phone", "branch"]}
          searchPlaceholder="Search name, ID, phone or branch…"
          facetedFilters={[
            { columnId: "branch", title: "Branch", options: BRANCHES.map((b) => ({ label: b, value: b })) },
            { columnId: "status", title: "Status", options: CUSTOMER_STATUSES.map((s) => ({ label: s, value: s })) },
            { columnId: "loanType", title: "Loan Type", options: LOAN_TYPES.map((l) => ({ label: l, value: l })) },
            {
              columnId: "gender",
              title: "Gender",
              options: [
                { label: "Male", value: "Male" },
                { label: "Female", value: "Female" },
              ],
            },
          ]}
          toolbarAction={
            <ExportButton
              rows={CUSTOMERS}
              filename="customers"
              columns={[
                { header: "Customer ID", key: "customerId" },
                { header: "Full Name", key: "fullName" },
                { header: "Gender", key: "gender" },
                { header: "Age", key: "age" },
                { header: "Phone", key: "phone" },
                { header: "Branch", key: "branch" },
                { header: "Loan Type", key: "loanType" },
                { header: "Customer Type", key: "customerType" },
                { header: "Status", key: "status" },
                { header: "Registered", key: "registeredOn" },
              ]}
            />
          }
          emptyState={{ icon: Users, title: "No customers", description: "No customer matches these filters." }}
        />
      </SettingsCard>
    </div>
  );
}
