"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Landmark, Pencil, Search, Users } from "lucide-react";
import { Filter, FilterBar, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { IconButton, Select } from "@/components/settings/form";
import {
  LEGACY_BANK_ACCOUNTS,
  LEGACY_BANK_ACCOUNT_ROW_COUNT,
  LEGACY_BANK_NAMES,
  LEGACY_BRANCHES,
} from "@/lib/legacy/source";

/**
 * VISA → Bank Account & password.
 *
 * DESIGN ONLY, and the fourth of the four modules whose capture overturned what
 * had been inferred from its menu label. This was built as a card register —
 * masked PANs, issue and expiry dates, a card status — because "VISA" is all
 * the sidebar says. The real screen is a list of customers' BANK ACCOUNTS, and
 * VISA is one column on it.
 *
 * That column is empty on all ten captured rows, so what it holds is still
 * unknown: a card number, a flag, a status. It is rendered, because the old
 * screen renders it, and left showing a dash.
 *
 * Two of the ten rows have no account name either. Both are reproduced rather
 * than filled in — a customer registered with no bank account is a real state,
 * and it is one the migration has to carry.
 *
 * The screen's own title mentions a password. No password, and no column that
 * could hold one, appears anywhere in the capture, and none is rendered here.
 */

const ALL = "__all__";

type BankAccount = (typeof LEGACY_BANK_ACCOUNTS)[number];

export function VisaPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [bank, setBank] = React.useState(ALL);

  const rows = React.useMemo(
    () =>
      LEGACY_BANK_ACCOUNTS.filter(
        (a) =>
          (branch === ALL || a.branch === branch) && (bank === ALL || a.accountName === bank)
      ),
    [branch, bank]
  );

  const active = branch !== ALL || bank !== ALL;

  const columns: ColumnDef<BankAccount>[] = [
    {
      accessorKey: "row",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.row}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">
            {row.original.customerName}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone Number",
      cell: ({ row }) => <span className="font-tabular">{row.original.phone}</span>,
    },
    {
      // "Acount name" is the legacy heading's own spelling; corrected here,
      // like every other label we author. The values under it are untouched.
      accessorKey: "accountName",
      header: "Account name",
      cell: ({ row }) =>
        row.original.accountName ?? (
          <span className="text-[var(--st-ink-faint)]" title="No bank account recorded">
            —
          </span>
        ),
    },
    {
      accessorKey: "visa",
      header: "VISA",
      cell: ({ row }) =>
        row.original.visa ?? (
          <span
            className="text-[var(--st-ink-faint)]"
            title="Empty on every captured row — what this column holds is unknown"
          >
            —
          </span>
        ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <div className="flex justify-end">
          <IconButton icon={Pencil} label="Edit bank account" disabled />
        </div>
      ),
    },
  ];

  const withAccount = rows.filter((a) => a.accountName !== null).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bank Accounts"
          value={LEGACY_BANK_ACCOUNT_ROW_COUNT}
          icon={Landmark}
          tone="accent"
          hint={`${rows.length} of them transcribed so far`}
        />
        <StatCard label="With an account" value={withAccount} icon={Users} />
        <StatCard
          label="Missing an account"
          value={rows.length - withAccount}
          icon={Users}
          hint="Registered, but no bank recorded"
        />
        <StatCard
          label="With a VISA"
          value={0}
          icon={CreditCard}
          hint="Empty on every captured row"
        />
      </div>

      <SettingsCard
        title="Bank Account List"
        description="Each customer's bank account, and whether a VISA sits against it."
        actions={<IconButton icon={Search} label="Search" tone="primary" disabled />}
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setBank(ALL);
            }}
          >
            <Filter label="Branch" htmlFor="visa-branch">
              <Select id="visa-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {/*
                  The bank account screen prints its branches in upper case
                  where the loan lists print them mixed. These options carry the
                  loan lists' casing — the canonical one — so the filter matches
                  what the rest of the app stores.
                */}
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b.toUpperCase()}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Bank" htmlFor="visa-bank">
              <Select id="visa-bank" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value={ALL}>All banks</option>
                {LEGACY_BANK_NAMES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={rows}
            searchFields={["customerName", "phone", "branch", "accountName"]}
            searchPlaceholder="Search customer, phone or bank…"
            emptyState={{
              icon: Landmark,
              title: active ? "No accounts match these filters" : "No records to show",
              description: active
                ? "Widen or clear the filters above to see more."
                : "No customer has a bank account recorded.",
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
