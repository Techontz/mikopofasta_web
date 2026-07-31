"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { History } from "lucide-react";
import { StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { AuditLogRecord } from "@/lib/api/system-configuration";

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

/**
 * `actions` is the filter's vocabulary and comes from the API, which lists the
 * actions actually present in the trail. Deriving it from `logs` would offer
 * only what this page happens to be showing, so a filter could never reach a
 * row on the next page.
 */
export function AuditLogsTable({
  logs,
  actions,
  total,
}: {
  logs: AuditLogRecord[];
  actions: string[];
  total: number;
}) {
  // Resolved server-side, beside the row. "System" for an anonymous event — a
  // failed login has no user yet, and that is worth showing rather than hiding.
  const userName = (log: AuditLogRecord) => log.userName ?? "System";

  const rows = logs.map((log) => ({
    ...log,
    [AUGMENTED_KEY]: `${userName(log)} ${log.action} ${log.auditableLabel}`,
  }));

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
    { id: "user", header: "User", cell: ({ row }) => userName(row.original) },
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
          {/* The short name reads; the full class is on the title for anyone
              tracing an entry back to the record it belongs to. */}
          <span title={row.original.auditableType}>{row.original.auditableLabel}</span>{" "}
          <span className="font-mono">#{row.original.auditableId}</span>
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
      emptyState={{
        icon: History,
        title: "No audit activity yet",
        description:
          total > 0
            ? "No entries match these filters."
            : "System actions will appear here as they happen.",
      }}
    />
  );
}
