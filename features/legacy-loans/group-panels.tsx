"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Users, UsersRound } from "lucide-react";
import { Money, SettingsCard, StatCard, StatusBadge, type StatusTone } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatMoney } from "@/lib/domain/money";
import type { GroupRecord } from "@/lib/api/groups";

/**
 * The Group module — sidebar → Group.
 *
 * Both screens ran on `LEGACY_GROUPS`, a list of names read off the legacy
 * screen, and drew three columns because that is all the legacy list had. They
 * now read `GET /groups`.
 *
 * The columns grew as a consequence, and the reason is worth stating. The old
 * note said a branch or a member count "would make this a redesign rather than
 * a rebuild — and the values behind those columns are unknown for WAZURI
 * anyway". The second half has stopped being true: this system's group record
 * carries a branch, a committee and a derived balance, and the API returns all
 * three. Printing a dash for a member count we now know would be the invention.
 */

const STATUS_TONE: Record<string, StatusTone> = {
  active: "active",
  inactive: "inactive",
  dissolved: "danger",
};

function statusCell(status: string) {
  return (
    <StatusBadge tone={STATUS_TONE[status] ?? "neutral"} className="capitalize">
      {status.replace(/_/g, " ")}
    </StatusBadge>
  );
}

/** Group → All Groups. */
export function GroupListPanel({ groups }: { groups: GroupRecord[] }) {
  const columns: ColumnDef<GroupRecord>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group Name" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "branchName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      cell: ({ row }) => row.original.branchName ?? "—",
    },
    {
      id: "leader",
      header: "Leader",
      /* Derived from the membership rows rather than stored on the group, so it
         cannot disagree with who actually holds office. */
      cell: ({ row }) =>
        row.original.leader ?? <span className="text-[var(--st-ink-faint)]">Vacant</span>,
    },
    {
      accessorKey: "memberCount",
      header: () => <span className="block text-right">Members</span>,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.memberCount ?? 0}</span>
      ),
    },
    {
      accessorKey: "outstandingBalance",
      header: () => <span className="block text-right">Outstanding</span>,
      cell: ({ row }) => {
        const value = Number(row.original.outstandingBalance ?? 0);
        return <Money muted={value === 0}>{value === 0 ? "—" : formatMoney(value)}</Money>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => statusCell(row.original.status),
      filterFn: "arrIncludesSome",
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <Link
            href={`/customers?group=${encodeURIComponent(row.original.name)}`}
            aria-label={`View members of ${row.original.name}`}
            title={`View members of ${row.original.name}`}
            className="st-btn st-btn-secondary st-btn-icon"
          >
            <Eye className="size-4" strokeWidth={1.9} aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Group List (${groups.length})`}
      description="Village banking groups, their committee and what their members still owe."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={groups}
        searchFields={["name", "branchName", "leader"]}
        searchPlaceholder="Search by group, branch or leader…"
        facetedFilters={[
          {
            columnId: "status",
            title: "Status",
            options: [...new Set(groups.map((g) => g.status))].map((s) => ({
              label: s.replace(/_/g, " "),
              value: s,
            })),
          },
        ]}
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
 * The Members tile used to read a dash, because the legacy record carried no
 * member count and a zero would have been a claim about an empty group. It is
 * a real figure now.
 */
export function GroupOverviewPanel({ groups }: { groups: GroupRecord[] }) {
  const active = groups.filter((g) => g.status === "active");
  const members = groups.reduce((sum, g) => sum + (g.memberCount ?? 0), 0);
  const outstanding = groups.reduce((sum, g) => sum + Number(g.outstandingBalance ?? 0), 0);

  const columns: ColumnDef<GroupRecord>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "branchName",
      header: "Branch",
      cell: ({ row }) => row.original.branchName ?? "—",
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => statusCell(row.original.status),
    },
    {
      accessorKey: "memberCount",
      header: () => <span className="block text-right">Members</span>,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{row.original.memberCount ?? 0}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Groups" value={groups.length} icon={UsersRound} tone="accent" />
        <StatCard label="Active Groups" value={active.length} icon={Users} />
        <StatCard label="Members" value={members} icon={Users} hint="Across every group" />
        <StatCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          icon={UsersRound}
          hint="What group members still owe"
        />
      </div>

      <SettingsCard
        title={`Groups (${groups.length})`}
        description="Every group on the book."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={groups}
          searchFields={["name", "branchName"]}
          searchPlaceholder="Search group…"
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
