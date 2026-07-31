"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2, Users, UsersRound } from "lucide-react";
import { SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Button, IconButton } from "@/components/settings/form";
import { LEGACY_GROUPS } from "@/lib/legacy/source";

/**
 * The Group module.
 *
 * DESIGN ONLY — no API calls, and every action is inert.
 *
 * Three columns on the list, because that is what the legacy screen has: S/NO.,
 * Group Name, Action. No branch, no leader, no member count, no loan balance.
 * An earlier written brief asked for all of those plus thirty seeded groups;
 * the captured screen shows three columns and "Showing 1 to 1 of 1 entries",
 * and the screenshot wins.
 *
 * Our own schema does carry a branch, a committee and a derived balance for a
 * group. None of it is shown, because a column the legacy screen does not have
 * would make this a redesign rather than a rebuild — and the values behind
 * those columns are unknown for WAZURI anyway.
 */

interface GroupRow {
  row: number;
  name: string;
}

const ROWS: GroupRow[] = LEGACY_GROUPS.map((name, i) => ({ row: i + 1, name }));

export function GroupListPanel() {
  const columns: ColumnDef<GroupRow>[] = [
    {
      accessorKey: "row",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.row}</span>,
    },
    {
      accessorKey: "name",
      header: "Group Name",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Pencil} label="Edit group" disabled />
          <IconButton icon={Eye} label="View group" disabled />
          <IconButton icon={Trash2} label="Delete group" tone="danger" disabled />
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title="Group List"
      description="Village banking groups. The legacy list carries a name and nothing else."
      actions={
        <Button tone="primary" icon={Plus} disabled>
          New Group
        </Button>
      }
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={ROWS}
        searchFields={["name"]}
        searchPlaceholder="Search group…"
        emptyState={{
          icon: Users,
          title: "No records to show",
          description: "No village banking group has been formed yet.",
        }}
      />
    </SettingsCard>
  );
}

/**
 * Group → Overview.
 *
 * Members reads as a dash rather than as zero. The legacy group record has no
 * member count on it at all, and a zero would be a claim — that the group is
 * empty — where a dash is the truth, which is that nobody knows.
 */
export function GroupOverviewPanel() {
  const columns: ColumnDef<GroupRow>[] = [
    {
      accessorKey: "name",
      header: "Group",
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: () => <StatusBadge tone="active">Active</StatusBadge>,
    },
    {
      id: "members",
      header: () => <span className="block text-right">Members</span>,
      cell: () => (
        <span
          className="block text-right text-[var(--st-ink-faint)]"
          title="The legacy group record carries no member count"
        >
          —
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Groups" value={ROWS.length} icon={UsersRound} tone="accent" />
        <StatCard label="Active Groups" value={ROWS.length} icon={Users} />
        <StatCard
          label="Members"
          value="—"
          icon={Users}
          hint="Not recorded on the legacy group"
        />
      </div>

      <SettingsCard
        title="Groups"
        description="Every group on the book, newest first."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={ROWS}
          emptyState={{
            icon: Users,
            title: "No records to show",
            description: "No village banking group has been formed yet.",
          }}
        />
      </SettingsCard>
    </div>
  );
}
