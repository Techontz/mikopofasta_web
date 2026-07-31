"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, FolderOpen, Pencil, Plus, Receipt, Search, Wallet } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DateInput, IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { LEGACY_BRANCHES } from "@/lib/legacy/source";

/**
 * The Agent module — "Clientless transaction", as its own breadcrumbs call it.
 *
 * DESIGN ONLY. All three screens were captured empty, so what is reproduced is
 * their columns, their totals rows and their toolbars; no row of any of them
 * has ever been seen, which is why none of the three carries fixture data.
 * Filling them would be inventing the module a second time — the first attempt,
 * reasoned from the menu labels alone, is what these captures just corrected.
 *
 * The name is worth keeping in mind: "clientless" says these are transactions
 * with no customer attached, which is what separates this module from Teller.
 * Deposit transaction does have a customer column, so the rule is not absolute.
 */

const ALL = "__all__";

/** No screen has ever shown a row, so every table here is empty by evidence. */
type NoRows = Record<string, never>;

/* ------------------------------------------------------------- Payment Mode */

/**
 * Agent → Payment mode.
 *
 * Three columns and nothing else: S/no., Mode of payment, Action. The earlier
 * inferred version gave each mode a provider and a status and seeded it with
 * the six Tanzanian mobile-money rails; the real screen is a bare lookup list,
 * and the modes it holds are still unknown.
 *
 * The single edit button in the corner is the old screen's, and it is the whole
 * toolbar — there is no add button, which suggests the list is edited in place
 * rather than appended to.
 */
export function PaymentModePanel() {
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "mode", header: "Mode of payment" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <SettingsCard
      title="Mode of Payment List"
      description="The channels an agent may collect and settle over. Captured empty, so which channels those are is still unknown."
      actions={<IconButton icon={Pencil} label="Edit payment modes" tone="primary" disabled />}
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={[]}
        emptyState={{
          icon: CreditCard,
          title: "No records to show",
          description: "The legacy Mode of Payment list was captured with no rows in it.",
        }}
      />
    </SettingsCard>
  );
}

/* -------------------------------------------------------- Record Transaction */

/**
 * Agent → Record transaction.
 *
 * Eight columns, a TOTAL under Amount, and three buttons in the corner: add,
 * export and search. "Rec Time" is the legacy heading and is kept — it is
 * presumably the time the transaction was recorded, as distinct from the Date
 * beside it, which would make this the one legacy list that separates when
 * something happened from when it was entered.
 */
export function AgentTransactionPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [date, setDate] = React.useState("");
  const active = branch !== ALL || date !== "";

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Transactions" value={0} icon={Receipt} tone="accent" />
        <StatCard label="Total Amount" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Agents Reporting" value={0} icon={CreditCard} />
      </div>

      <SettingsCard
        title="transaction list"
        description="Money an agent has taken in on the branch's behalf. Captured empty, so the totals read zero as the old screen's do."
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon={Plus} label="Record transaction" tone="primary" disabled />
            <IconButton icon={FolderOpen} label="Export" disabled />
            <IconButton icon={Search} label="Search" disabled />
          </div>
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setDate("");
            }}
          >
            <Filter label="Branch" htmlFor="agent-tx-branch">
              <Select id="agent-tx-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="agent-tx-date">
              <DateInput id="agent-tx-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: Receipt,
              title: "No records to show",
              description: "The legacy transaction list was captured with no rows in it.",
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
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------- Deposit Transaction */

/**
 * Agent → Deposit transaction.
 *
 * Breadcrumbed simply as "Deposit". Seven columns, a TOTAL under Deposit
 * Amount, and two buttons — export and search, with no add, so this list is
 * read rather than written here.
 *
 * The Loan Amount column beside the deposit is the interesting one: it puts a
 * customer's loan next to what was paid in, which reads as a collection screen
 * rather than a banking one.
 */
export function AgentDepositPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [date, setDate] = React.useState("");
  const active = branch !== ALL || date !== "";

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deposits" value={0} icon={Receipt} tone="accent" />
        <StatCard label="Deposit Amount" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Against Loans" value={formatMoney(0)} icon={CreditCard} />
      </div>

      <SettingsCard
        title="transaction list"
        description="What an agent has banked, and the loan it counts against. Captured empty, so the total reads zero as the old screen's does."
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon={FolderOpen} label="Export" disabled />
            <IconButton icon={Search} label="Search" disabled />
          </div>
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setDate("");
            }}
          >
            <Filter label="Branch" htmlFor="agent-dep-branch">
              <Select id="agent-dep-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="agent-dep-date">
              <DateInput id="agent-dep-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: Wallet,
              title: "No records to show",
              description: "The legacy deposit list was captured with no rows in it.",
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
        </div>
      </SettingsCard>
    </div>
  );
}
