"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Receipt, Wallet } from "lucide-react";
import { Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Field, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  PROFILE_OPTIONS,
  tellerSessionFor,
  type CustomerProfile,
  type TellerStatementLine,
} from "@/lib/legacy/profile-fixtures";

/**
 * Teller → Customer Loan Information.
 *
 * DESIGN ONLY. Where a teller lands after picking somebody on the Teller
 * Dashboard: the customer's photograph, the loan they are currently running,
 * their account position, and the statement behind it.
 *
 * The capture's own numbers do not foot — Opening/Deposit/Withdrawal read
 * 0,0,0 against a Closing of 33,435,883 — so the position here is derived from
 * the statement rather than carried alongside it. Four columns that can
 * disagree about one account is what a teller gets blamed for at close.
 *
 * The customer switcher below the position is the legacy screen's second
 * dropdown, and it does what that one does: moves to another customer without
 * going back to the dashboard.
 */
export function TellerSessionView({ profile }: { profile: CustomerProfile }) {
  const router = useRouter();
  const [switching, startNavigation] = React.useTransition();
  const session = React.useMemo(() => tellerSessionFor(profile), [profile]);

  const loanColumns: ColumnDef<NonNullable<typeof session.loan>>[] = [
    {
      id: "phone",
      header: "Phone Number",
      cell: () => <span className="font-tabular">{profile.phone}</span>,
    },
    {
      accessorKey: "withdrawalDate",
      header: "Withdrawal Date",
      cell: ({ row }) => <LegacyDate value={row.original.withdrawalDate} />,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => <LegacyDate value={row.original.endDate} />,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "insurance",
      header: () => <span className="block text-right">Insurance</span>,
      cell: ({ row }) => (
        <Money muted={row.original.insurance === 0}>{formatMoney(row.original.insurance)}</Money>
      ),
    },
    {
      accessorKey: "restoration",
      header: () => <span className="block text-right">Restoration</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.restoration)}</Money>,
    },
    {
      accessorKey: "amountPaid",
      header: () => <span className="block text-right">Amount Paid</span>,
      cell: ({ row }) => (
        <Money muted={row.original.amountPaid === 0}>{formatMoney(row.original.amountPaid)}</Money>
      ),
    },
    {
      accessorKey: "remainingDebt",
      header: () => <span className="block text-right">Remaining debt</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.remainingDebt)}</Money>,
    },
  ];

  const statementColumns: ColumnDef<TellerStatementLine>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.date}</span>,
    },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "deposit",
      header: () => <span className="block text-right">Deposit</span>,
      cell: ({ row }) => (
        <Money muted={row.original.deposit === 0}>
          {row.original.deposit === 0 ? "—" : `+${formatMoney(row.original.deposit)}`}
        </Money>
      ),
    },
    {
      accessorKey: "withdrawal",
      header: () => <span className="block text-right">Withdrawal</span>,
      cell: ({ row }) => (
        <Money muted={row.original.withdrawal === 0}>
          {row.original.withdrawal === 0 ? "—" : `−${formatMoney(row.original.withdrawal)}`}
        </Money>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <span className="block text-right">Balance</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.balance)}</Money>,
    },
    {
      accessorKey: "remainDebit",
      header: () => <span className="block text-right">Remain Debit</span>,
      cell: ({ row }) => (
        <Money muted={row.original.remainDebit === 0}>
          {formatMoney(row.original.remainDebit)}
        </Money>
      ),
    },
    {
      accessorKey: "penalty",
      header: () => <span className="block text-right">Penalty</span>,
      cell: ({ row }) => (
        <Money muted={row.original.penalty === 0}>{formatMoney(row.original.penalty)}</Money>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* The photograph card, centred, as the legacy screen leads with. */}
      <SettingsCard>
        <div className="flex flex-col items-center gap-3 py-2">
          <span
            aria-hidden
            className="flex size-28 items-center justify-center rounded-[var(--st-radius-md)] text-[28px] font-semibold"
            style={{
              background: "var(--st-accent-soft)",
              color: "var(--st-accent)",
              border: "1px solid var(--st-accent-line)",
            }}
          >
            {profile.initials}
          </span>
          <div className="text-center">
            <p className="text-[15px] font-medium text-[var(--st-ink)]">{profile.fullName}</p>
            <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
              {profile.id} · {profile.branch}
            </p>
          </div>
        </div>
      </SettingsCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Opening"
          value={formatMoney(session.account.opening)}
          icon={Wallet}
          tone="accent"
        />
        <StatCard label="Deposit" value={formatMoney(session.account.deposit)} icon={Receipt} />
        <StatCard
          label="Withdrawal"
          value={formatMoney(session.account.withdrawal)}
          icon={Receipt}
        />
        <StatCard
          label="Closing"
          value={formatMoney(session.account.closing)}
          icon={Wallet}
          hint="Opening plus deposits, less withdrawals"
        />
      </div>

      <SettingsCard
        title="Loan Information"
        description="The loan this customer is currently running."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={loanColumns}
          data={session.loan ? [session.loan] : []}
          emptyState={{
            icon: Wallet,
            title: "No data available in table",
            description: "This customer has no loan running.",
          }}
        />
      </SettingsCard>

      <SettingsCard title="Switch customer" description="Open another customer's teller session.">
        <div className="max-w-md">
          <Field label="Search Customer" htmlFor="teller-switch">
            <Select
              id="teller-switch"
              value={profile.id}
              disabled={switching}
              onChange={(e) => {
                const next = e.target.value;
                if (next && next !== profile.id) {
                  startNavigation(() => router.push(`/teller/${next}`));
                }
              }}
            >
              {PROFILE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} / {c.id}
                </option>
              ))}
            </Select>
          </Field>
          {switching && (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-[var(--st-ink-soft)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Opening…
            </p>
          )}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Statement"
        description="Every movement on this customer's account, newest first."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={statementColumns}
          data={session.statement}
          searchFields={["date", "description"]}
          searchPlaceholder="Search statement…"
          emptyState={{
            icon: Receipt,
            title: "No data available in table",
            description: "Nothing has moved on this account.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

/**
 * A date, or the old system's own empty-date placeholder.
 *
 * The captured screen prints the literal string "YY-MM-DD" where a loan has no
 * date against it. That is reproduced rather than blanked, because it is what a
 * teller comparing the two screens will be looking for.
 */
function LegacyDate({ value }: { value: string }) {
  if (value && value !== "—") {
    return <span className="font-tabular whitespace-nowrap">{value}</span>;
  }
  return (
    <span
      className="font-tabular whitespace-nowrap text-[var(--st-ink-faint)]"
      title="No date recorded — the legacy screen prints this placeholder"
    >
      YY-MM-DD
    </span>
  );
}
