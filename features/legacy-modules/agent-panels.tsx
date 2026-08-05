"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Receipt, Wallet } from "lucide-react";
import { Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { formatMoney } from "@/lib/domain/money";
import { AwaitingBackendNote } from "@/features/legacy-modules/shared";

/**
 * The Agent module — "Clientless transaction", as its own breadcrumbs call it.
 *
 * LAYOUT ONLY, AND SAYS SO. All three screens were captured empty, so what is
 * reproduced is their columns and their totals rows; no row of any of them has
 * ever been seen. More to the point, the backend has no agent endpoints at all
 * — nothing to record a transaction against, nothing to list, nothing to
 * export — so the tables are `[]` by necessity rather than by choice.
 *
 * These panels used to carry the old screens' toolbars and filter bars,
 * rendered permanently disabled and permanently inert. They are gone. A branch
 * filter over a table that can only ever be empty filters nothing, and a greyed
 * Export button says "not for you" when the truth is "not yet, for anyone" —
 * `AwaitingBackendNote` says the true one. Everything else is unchanged, so
 * wiring this module later is adding a data source, not rebuilding the screens.
 *
 * The name is worth keeping in mind: "clientless" says these are transactions
 * with no customer attached, which is what separates this module from Teller.
 * Deposit transaction does have a customer column, so the rule is not absolute.
 *
 * Still a client module even with the filter state gone: the column definitions
 * and the totals row are functions, and functions cannot cross into the client
 * `SettingsTable` from a server component.
 */

/** No screen has ever shown a row, and no endpoint can supply one. */
type NoRows = Record<string, never>;

/* ------------------------------------------------------------- Payment Mode */

/**
 * Agent → Payment mode.
 *
 * Three columns and nothing else: S/no., Mode of payment, Action. The earlier
 * inferred version gave each mode a provider and a status and seeded it with
 * the six Tanzanian mobile-money rails; the real screen is a bare lookup list,
 * and the modes it holds are still unknown.
 */
export function PaymentModePanel() {
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "mode", header: "Mode of payment" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Agent" />

      <SettingsCard
        title="Mode of Payment List"
        description="The channels an agent may collect and settle over. Captured empty, so which channels those are is still unknown."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: CreditCard,
            title: "No records to show",
            description: "There is no agent endpoint yet, so this list has nothing to read from.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

/* -------------------------------------------------------- Record Transaction */

/**
 * Agent → Record transaction.
 *
 * Eight columns and a TOTAL under Amount. "Rec Time" is the legacy heading and
 * is kept — it is presumably the time the transaction was recorded, as distinct
 * from the Date beside it, which would make this the one legacy list that
 * separates when something happened from when it was entered.
 */
export function AgentTransactionPanel() {
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "mode", header: "Mode of payment" },
    { id: "agent", header: "Agent" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
    { id: "recTime", header: "Rec Time" },
    { id: "date", header: "Date" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Agent" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Transactions" value={0} icon={Receipt} tone="accent" />
        <StatCard label="Total Amount" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Agents Reporting" value={0} icon={CreditCard} />
      </div>

      <SettingsCard
        title="transaction list"
        description="Money an agent has taken in on the branch's behalf. Captured empty, so the totals read zero as the old screen's do."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: Receipt,
            title: "No records to show",
            description: "There is no agent endpoint yet, so this list has nothing to read from.",
          }}
          footerWhenEmpty
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={4}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Money strong muted>
                  {formatMoney(0)}
                </Money>
              </td>
              <td colSpan={3} />
            </>
          )}
        />
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------- Deposit Transaction */

/**
 * Agent → Deposit transaction.
 *
 * Breadcrumbed simply as "Deposit". Seven columns and a TOTAL under Deposit
 * Amount.
 *
 * The Loan Amount column beside the deposit is the interesting one: it puts a
 * customer's loan next to what was paid in, which reads as a collection screen
 * rather than a banking one.
 */
export function AgentDepositPanel() {
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "customer", header: "customer" },
    { id: "depositAmount", header: () => <span className="block text-right">Deposit Amount</span> },
    { id: "loanAmount", header: () => <span className="block text-right">Loan Amount</span> },
    { id: "user", header: "User" },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Agent" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deposits" value={0} icon={Receipt} tone="accent" />
        <StatCard label="Deposit Amount" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Against Loans" value={formatMoney(0)} icon={CreditCard} />
      </div>

      <SettingsCard
        title="transaction list"
        description="What an agent has banked, and the loan it counts against. Captured empty, so the total reads zero as the old screen's does."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: Wallet,
            title: "No records to show",
            description: "There is no agent endpoint yet, so this list has nothing to read from.",
          }}
          footerWhenEmpty
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={3}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Money strong muted>
                  {formatMoney(0)}
                </Money>
              </td>
              <td colSpan={3} />
            </>
          )}
        />
      </SettingsCard>
    </div>
  );
}
