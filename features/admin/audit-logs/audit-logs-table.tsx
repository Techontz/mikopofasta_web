"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { AuditLog } from "@/types/audit";
import type { MockCredential } from "@/lib/mock-data/users";

const AUGMENTED_KEY = "__searchable" as const;

export function AuditLogsTable({ logs, users }: { logs: AuditLog[]; users: MockCredential[] }) {
  const userName = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "System" : "System");
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const rows = logs.map((log) => ({ ...log, [AUGMENTED_KEY]: `${userName(log.userId)} ${log.action} ${log.auditableType}` }));

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    { id: "user", header: "User", cell: ({ row }) => userName(row.original.userId) },
    {
      accessorKey: "action",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => <Badge variant="outline" className="font-mono text-xs">{row.original.action}</Badge>,
      filterFn: "arrIncludesSome",
    },
    {
      id: "target",
      header: "Target",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.auditableType} <span className="font-mono">#{row.original.auditableId}</span>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchFields={[AUGMENTED_KEY]}
      searchPlaceholder="Search by user, action, or target…"
      facetedFilters={[{ columnId: "action", title: "Action", options: actions.map((a) => ({ label: a, value: a })) }]}
      emptyState={{ icon: History, title: "No audit activity yet", description: "System actions will appear here as they happen." }}
    />
  );
}
