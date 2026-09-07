"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DateInput, Select } from "@/components/settings/form";
import { formatMoney, round2 } from "@/lib/domain/money";
import type { BankAccountRecord } from "@/types/bank";

import { ACCOUNT_TONE } from "@/features/bank/shared";

const ALL = "__all__";

/**
 * Bank → Account Balance.
 *
 * A position screen: four headline figures, then the accounts that make them
 * up. The tiles are computed from the *filtered* rows, not the whole set —
 * a total that ignores the filter above it answers a question nobody asked.
 */
export function AccountBalancePanel({
  accounts,
  bankNames,
}: {
  accounts: BankAccountRecord[];
  /** Filter options. Derived from the rows when not supplied. */
  bankNames?: string[];
}) {
  const bankOptions = React.useMemo(
    () => bankNames ?? [...new Set(accounts.map((a) => a.bankName).filter(Boolean))].sort(),
    [bankNames, accounts]
  );
  const [bank, setBank] = React.useState(ALL);
  /* Replaces the branch filter. A company money account has no branch; what a
     finance officer asks of this screen is which accounts take money in and
     which pay it out. */
  const [usage, setUsage] = React.useState(ALL);
  const [date, setDate] = React.useState("");

  const filtered = React.useMemo(
    () =>
      accounts.filter(
        (a) =>
          (bank === ALL || a.bankName === bank) &&
          /* `both` satisfies either direction — one physical account used for
             everything is registered once, not twice. */
          (usage === ALL || a.usage === usage || a.usage === "both")
      ),
    [accounts, bank, usage]
  );

  const totals = React.useMemo(
    () => ({
      accounts: filtered.length,
      balance: round2(filtered.reduce((s, a) => s + a.balance, 0)),
      deposit: round2(filtered.reduce((s, a) => s + a.todayDeposit, 0)),
      withdrawal: round2(filtered.reduce((s, a) => s + a.todayWithdrawal, 0)),
    }),
    [filtered]
  );

  const active = bank !== ALL || usage !== ALL || date !== "";

  const columns: ColumnDef<BankAccountRecord>[] = [
    {
      accessorKey: "accountName",
      header: "Account",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--st-ink)]">{row.original.accountName}</p>
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
            {row.original.accountNumber} · {row.original.accountType === "bank" ? "Bank" : "Mobile Money"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.bankName}{" "}
          <span className="text-[var(--st-ink-faint)]">({row.original.currency})</span>
        </span>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <span className="block text-right">Current Balance</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.balance)}</Money>,
    },
    {
      accessorKey: "todayDeposit",
      header: () => <span className="block text-right">Today&apos;s Deposit</span>,
      cell: ({ row }) => (
        <Money muted={row.original.todayDeposit === 0}>
          {row.original.todayDeposit === 0 ? "—" : `+${formatMoney(row.original.todayDeposit)}`}
        </Money>
      ),
    },
    {
      accessorKey: "todayWithdrawal",
      header: () => <span className="block text-right">Today&apos;s Withdrawal</span>,
      cell: ({ row }) => (
        <Money muted={row.original.todayWithdrawal === 0}>
          {row.original.todayWithdrawal === 0 ? "—" : `−${formatMoney(row.original.todayWithdrawal)}`}
        </Money>
      ),
    },
    {
      id: "available",
      header: () => <span className="block text-right">Available Balance</span>,
      /*
       * Available is the current balance less what is already committed today.
       * An inactive account can hold a balance but none of it is available, so
       * it reads zero rather than repeating the balance beside it.
       */
      cell: ({ row }) => {
        const available = row.original.status === "active" ? row.original.balance : 0;
        return (
          <Money strong muted={available === 0}>
            {formatMoney(available)}
          </Money>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={ACCOUNT_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Accounts" value={totals.accounts} icon={Landmark} tone="accent" />
        <StatCard label="Total Balance" value={formatMoney(totals.balance)} icon={Wallet} />
        <StatCard
          label="Today's Deposit"
          value={formatMoney(totals.deposit)}
          icon={ArrowDownLeft}
          hint="Money in, across the accounts shown"
        />
        <StatCard
          label="Today's Withdrawal"
          value={formatMoney(totals.withdrawal)}
          icon={ArrowUpRight}
          hint="Money out, across the accounts shown"
        />
      </div>

      <SettingsCard
        title="Account Balances"
        description="Filtered figures. The tiles above follow whatever this list is narrowed to."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBank(ALL);
              setUsage(ALL);
              setDate("");
            }}
          >
            <Filter label="Bank" htmlFor="ab-bank">
              <Select id="ab-bank" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value={ALL}>All banks</option>
                {bankOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Usage" htmlFor="ab-usage">
              <Select id="ab-usage" value={usage} onChange={(e) => setUsage(e.target.value)}>
                <option value={ALL}>All accounts</option>
                <option value="collection">Receives money</option>
                <option value="disbursement">Pays money out</option>
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="ab-date">
              <DateInput id="ab-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            searchFields={["accountName", "accountNumber", "bankName", "channelLabel"]}
            searchPlaceholder="Search account or bank…"
            emptyState={{
              icon: Landmark,
              title: active ? "No accounts match these filters" : "No accounts yet",
              description: active
                ? "Widen or clear the filters above to see more."
                : "Register a bank account to see its position here.",
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
