"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { UserRoundPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CUSTOMER_APPROVAL_STATUSES, CUSTOMER_STATUSES, KYC_STATUSES } from "@/types/enums";

export interface CustomerRow {
  id: string;
  customerNumber: string;
  fullName: string;
  phone: string;
  branchName: string;
  categoryName: string;
  kycStatus: string;
  status: string;
  approvalStatus: string;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  suspended: "secondary",
  frozen: "destructive",
};

const KYC_VARIANT: Record<string, "default" | "secondary"> = { completed: "default", incomplete: "secondary" };

const APPROVAL_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  not_required: "outline",
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const columns: ColumnDef<CustomerRow>[] = [
    { accessorKey: "customerNumber", header: ({ column }) => <DataTableColumnHeader column={column} title="Customer #" /> },
    {
      accessorKey: "fullName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={`/customers/${row.original.id}`} className="font-medium hover:underline">
          {row.original.fullName}
        </Link>
      ),
    },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "branchName", header: "Branch" },
    { accessorKey: "categoryName", header: "Category" },
    {
      accessorKey: "kycStatus",
      header: "KYC",
      cell: ({ row }) => (
        <Badge variant={KYC_VARIANT[row.original.kycStatus]} className="capitalize">
          {row.original.kycStatus}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "approvalStatus",
      header: "Approval",
      cell: ({ row }) =>
        row.original.approvalStatus === "not_required" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <Badge variant={APPROVAL_VARIANT[row.original.approvalStatus]} className="capitalize">
            {row.original.approvalStatus}
          </Badge>
        ),
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
          {row.original.status}
        </Badge>
      ),
      filterFn: "arrIncludesSome",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={customers}
      searchFields={["customerNumber", "fullName", "phone"]}
      searchPlaceholder="Search by name, phone, or customer #…"
      facetedFilters={[
        { columnId: "kycStatus", title: "KYC", options: KYC_STATUSES.map((s) => ({ label: s, value: s })) },
        { columnId: "approvalStatus", title: "Approval", options: CUSTOMER_APPROVAL_STATUSES.map((s) => ({ label: s, value: s })) },
        { columnId: "status", title: "Status", options: CUSTOMER_STATUSES.map((s) => ({ label: s, value: s })) },
      ]}
      toolbarAction={
        <Button size="sm" nativeButton={false} render={<Link href="/customers/new" />}>
          <UserRoundPlus className="size-4" />
          New Customer
        </Button>
      }
      emptyState={{
        icon: Users,
        title: "No customers yet",
        description: "Register a customer to begin the onboarding and KYC workflow.",
      }}
    />
  );
}
