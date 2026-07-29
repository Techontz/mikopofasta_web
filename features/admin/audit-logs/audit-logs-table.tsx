"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { AuditLog } from "@/types/audit";
import type { MockCredential } from "@/lib/mock-data/users";

const AUGMENTED_KEY = "__searchable" as const;

/*
 * Pinned locale and timezone.
 *
 * A bare toLocaleString() resolves against whatever each runtime defaults to —
 * Node renders en-US on the server, the browser renders its own — so the two
 * passes disagree and hydration fails (React #418). An audit trail is also the
 * one table where the reader must not have to guess whose clock a timestamp is
 * on, so it is stated: Dar es Salaam, day first.
 */
const AUDIT_TIMESTAMP = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function AuditLogsTable({ logs, users }: { logs: AuditLog[]; users: MockCredential[] }) {
  const userName = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? "System" : "System");
  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const rows = logs.map((log) => ({ ...log, [AUGMENTED_KEY]: `${userName(log.userId)} ${log.action} ${log.auditableType}` }));

  const columns: ColumnDef<(typeof rows)[number]>[] = [
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-tabular">
          {AUDIT_TIMESTAMP.format(new Date(row.original.createdAt))}
        </span>
      ),
    },
    { id: "user", header: "User", cell: ({ row }) => userName(row.original.userId) },
    {
      accessorKey: "action",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => <StatusBadge tone="neutral" dot={false} className="font-mono">{row.original.action}</StatusBadge>,
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
    <SettingsTable
      columns={columns}
      data={rows}
      searchFields={[AUGMENTED_KEY]}
      searchPlaceholder="Search by user, action, or target…"
      facetedFilters={[{ columnId: "action", title: "Action", options: actions.map((a) => ({ label: a, value: a })) }]}
      emptyState={{ icon: History, title: "No audit activity yet", description: "System actions will appear here as they happen." }}
    />
  );
}
