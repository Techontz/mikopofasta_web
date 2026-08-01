"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { Filter, FilterBar, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { IconButton, Select } from "@/components/settings/form";

/**
 * Customer → All Customer.
 *
 * The legacy screen was captured with no rows in it, so its columns are known
 * and its cells are not — which is why the rows here come from the API rather
 * than from the transcription, and why the Action column carries the three
 * buttons every other list in this app has rather than a guess at the old
 * screen's.
 */

export interface CustomerListRow {
  id: string;
  customerId: string;
  name: string;
  dob: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  branch: string;
  /** Our vocabulary — active / suspended / frozen. */
  status: string;
  createdAt: string;
}

const ALL = "__all__";

/**
 * The filter vocabularies, taken from the rows themselves.
 *
 * Branch used to come from `LEGACY_BRANCHES` — six names transcribed off the
 * old system — and gender from `InferredLookups`. Both were lists this screen
 * kept beside the data rather than from it, so a branch the business opened
 * after the capture could hold customers the filter could not reach.
 *
 * Derived from what is actually on screen, they cannot offer an option that
 * matches nothing or miss one that would.
 */
function optionsFrom(rows: CustomerListRow[], read: (row: CustomerListRow) => string | null): string[] {
  const values = rows
    .map(read)
    .filter((value): value is string => typeof value === "string" && value !== "");

  return [...new Set(values)].sort();
}

const STATUS_TONE: Record<string, "active" | "warning" | "danger"> = {
  active: "active",
  suspended: "warning",
  frozen: "danger",
};

/** A cell the legacy screen would have filled and our source cannot. */
function orDash(value: string | number | null) {
  return value == null || value === "" ? (
    <span className="text-[var(--st-ink-faint)]">—</span>
  ) : (
    value
  );
}

export function AllCustomersPanel({
  rows,
  /**
   * The current month as `YYYY-MM`, resolved on the server.
   *
   * "New this month" needs a clock, and a clock read during a client render
   * disagrees with the one the server rendered with — which is a hydration
   * mismatch that only shows up at a month boundary, i.e. never in testing.
   */
  currentMonth,
}: {
  rows: CustomerListRow[];
  currentMonth: string;
}) {
  const [branch, setBranch] = React.useState(ALL);
  const [gender, setGender] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (c) =>
          (branch === ALL || c.branch === branch) &&
          (gender === ALL || c.gender === gender) &&
          (status === ALL || c.status === status)
      ),
    [rows, branch, gender, status]
  );

  const active = branch !== ALL || gender !== ALL || status !== ALL;

  const totals = React.useMemo(
    () => ({
      total: filtered.length,
      active: filtered.filter((c) => c.status === "active").length,
      inactive: filtered.filter((c) => c.status !== "active").length,
      newThisMonth: filtered.filter((c) => c.createdAt.startsWith(currentMonth)).length,
    }),
    [filtered, currentMonth]
  );

  const columns: ColumnDef<CustomerListRow>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.name}</p>
          <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
            {row.original.customerId}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "dob",
      header: "Date of Birth",
      cell: ({ row }) => <span className="font-tabular">{orDash(row.original.dob)}</span>,
    },
    {
      accessorKey: "age",
      header: () => <span className="block text-right">Age</span>,
      cell: ({ row }) => (
        <span className="font-tabular block text-right">{orDash(row.original.age)}</span>
      ),
    },
    { accessorKey: "gender", header: "Gender", cell: ({ row }) => orDash(row.original.gender) },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => <span className="font-tabular">{orDash(row.original.phone)}</span>,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={STATUS_TONE[row.original.status] ?? "neutral"} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <div className="flex justify-end gap-1">
          <IconButton icon={Eye} label="View customer" disabled />
          <IconButton icon={Pencil} label="Edit customer" disabled />
          <IconButton icon={Trash2} label="Delete customer" tone="danger" disabled />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={totals.total} icon={Users} tone="accent" />
        <StatCard label="Active" value={totals.active} icon={UserCheck} />
        <StatCard label="Inactive" value={totals.inactive} icon={UserX} />
        <StatCard label="New This Month" value={totals.newThisMonth} icon={UserPlus} />
      </div>

      <SettingsCard
        title="All Customer"
        description="Everyone on the book. The tiles above follow whatever this list is narrowed to."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setGender(ALL);
              setStatus(ALL);
            }}
          >
            <Filter label="Branch" htmlFor="customers-branch">
              <Select id="customers-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {optionsFrom(rows, (row) => row.branch).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Gender" htmlFor="customers-gender">
              <Select id="customers-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value={ALL}>All</option>
                {optionsFrom(rows, (row) => row.gender).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Status" htmlFor="customers-status">
              <Select id="customers-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value={ALL}>All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="frozen">Frozen</option>
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            searchFields={["name", "customerId", "phone", "branch"]}
            searchPlaceholder="Search name, ID or phone…"
            emptyState={{
              icon: Users,
              title: active ? "No customers match these filters" : "No records to show",
              description: active
                ? "Widen or clear the filters above to see more."
                : "Register a customer to see them here.",
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
