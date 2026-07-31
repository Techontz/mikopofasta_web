"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  FolderOpen,
  PiggyBank,
  Search,
  Wallet,
} from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DateInput, Field, IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import {
  LEGACY_BRANCHES,
  LEGACY_CUSTOMERS,
  LEGACY_SAVING_WITHDRAWAL_KINDS,
} from "@/lib/legacy/source";

/**
 * The Insurance module — which every screen inside it calls Saving Deposit.
 *
 * DESIGN ONLY, and worth reading before changing anything here.
 *
 * The sidebar entry is "Insurelance" and its four children are named for
 * insurance. Every breadcrumb and every card title behind them says savings:
 * "Today saving Deposit", "All Saving withdrawal", "Saving Deposit balance".
 * Both are the legacy system's own words, so this is not a typo to sweep — it
 * is two halves of the old system disagreeing about what the module is, and
 * only the owner can settle it.
 *
 * Until then the navigation keeps the sidebar's label, because that is what an
 * operator clicks, and each screen keeps its own title, because that is what an
 * operator reads once there. Nothing is quietly renamed in either direction.
 *
 * The earlier version of this file modelled the module as an insurance premium
 * ledger with eight fixture movements. All four screens were in fact captured
 * empty, so the fixtures are gone: the columns are evidence, the rows never
 * were.
 */

const ALL = "__all__";

/** No captured screen in this module has ever shown a row. */
type NoRows = Record<string, never>;

/* --------------------------------------------------- Deposit & Withdrawal */

/**
 * Insurance → Deposit & Withdrawal.
 *
 * Breadcrumbed "Saving Deposit / Search customer", and it is exactly that: one
 * dropdown and nothing else until somebody is chosen. Not a ledger, which is
 * what the menu label had suggested — the deposit and the withdrawal both
 * happen on whatever screen the selection opens, and that screen has not been
 * captured.
 */
export function InsuranceLedgerPanel() {
  const [selected, setSelected] = React.useState("");

  return (
    <SettingsCard
      title="Search Customer"
      description="Pick a customer to record a deposit or a withdrawal against their savings."
    >
      <div className="mx-auto max-w-md space-y-5">
        <Field label="Select customer" htmlFor="saving-customer">
          <Select
            id="saving-customer"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select customer</option>
            {LEGACY_CUSTOMERS.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} — {c.branch}
              </option>
            ))}
          </Select>
        </Field>

        <button
          type="button"
          disabled={selected === ""}
          className="st-btn st-btn-primary w-full justify-center"
        >
          Open Savings
          <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </SettingsCard>
  );
}

/* ------------------------------------------------------- Today saving Deposit */

/**
 * Insurance → Today Insurance.
 *
 * Five columns and a TOTAL: S/no., Branch, customer, Amount, Date. The date
 * column on a screen that already filters to today is the legacy system's, not
 * ours, and it is kept — it is the only thing that would show if the "today"
 * filter were ever wrong.
 */
export function InsuranceTodayPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const active = branch !== ALL;

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "customer", header: "customer" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deposits Today" value={0} icon={ArrowDownLeft} tone="accent" />
        <StatCard label="Amount In" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Customers Saving" value={0} icon={PiggyBank} />
      </div>

      <SettingsCard
        title="Today saving Deposit"
        description="What has been paid into savings today. Captured empty, so the total reads zero as the old screen's does."
        actions={<IconButton icon={Search} label="Search" tone="primary" disabled />}
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar active={active} onReset={() => setBranch(ALL)}>
            <Filter label="Branch" htmlFor="saving-today-branch">
              <Select
                id="saving-today-branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: PiggyBank,
              title: "No records to show",
              description: "Nothing has been paid into savings today.",
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
                <td />
              </>
            )}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------ All Saving withdrawal */

/**
 * Insurance → Today Withdrawal Insurance.
 *
 * The filter strip is the find on this screen: All | Saving Taken | Saving
 * clear loan. A tab strip enumerates its own vocabulary, so unlike almost
 * everything else in this module that list is complete — and "Saving clear
 * loan" says a customer's savings can be applied against their loan, which is a
 * rule no other captured screen anywhere reveals.
 */
export function InsuranceWithdrawalPanel() {
  const [kind, setKind] = React.useState<string>("All");
  const [branch, setBranch] = React.useState(ALL);
  const [date, setDate] = React.useState("");
  const active = branch !== ALL || date !== "";

  const columns: ColumnDef<NoRows>[] = [
    { id: "branch", header: "Branch" },
    { id: "customer", header: "Customer" },
    { id: "description", header: "Description" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
    { id: "date", header: "Date" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <div className="space-y-6">
      <div
        className="inline-flex gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Withdrawal kind"
        style={{ background: "var(--st-subtle-strong)" }}
      >
        {LEGACY_SAVING_WITHDRAWAL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              kind === k
                ? "bg-[var(--st-card)] text-[var(--st-ink)] shadow-sm"
                : "text-[var(--st-ink-soft)] hover:text-[var(--st-ink)]"
            )}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Withdrawals" value={0} icon={ArrowUpRight} tone="accent" />
        <StatCard label="Amount Out" value={formatMoney(0)} icon={Wallet} />
        <StatCard
          label="Cleared Against Loans"
          value={formatMoney(0)}
          icon={PiggyBank}
          hint="Savings applied to a borrower's loan"
        />
      </div>

      <SettingsCard
        title="All Saving withdrawal"
        description="Savings taken out, and savings applied against a loan. Captured empty, so the total reads zero as the old screen's does."
        actions={<IconButton icon={Search} label="Search" tone="primary" disabled />}
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
            <Filter label="Branch" htmlFor="saving-wd-branch">
              <Select id="saving-wd-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="saving-wd-date">
              <DateInput id="saving-wd-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: ArrowUpRight,
              title: "No records to show",
              description: "Nothing has been withdrawn from savings.",
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
                <td colSpan={2} />
              </>
            )}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------ Saving Deposit balance */

/**
 * Insurance → Insurance Balance.
 *
 * Four columns — S/no., Branch, customer, Amount — and a TOTAL that the legacy
 * screen prints as "0.00". That is the only place in the whole capture set
 * where a legacy total carries decimals; every other screen prints whole
 * shillings. Reproduced, because a balance screen that disagrees with the old
 * one about precision is the kind of difference a reconciliation trips over.
 */
export function InsuranceBalancePanel() {
  const [branch, setBranch] = React.useState(ALL);
  const active = branch !== ALL;

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "customer", header: "customer" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Savers" value={0} icon={PiggyBank} tone="accent" />
        <StatCard label="Total Held" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Branches Reporting" value={0} icon={FolderOpen} />
      </div>

      <SettingsCard
        title="Saving Deposit balance"
        description="What each customer holds in savings right now. Captured empty, so the total reads zero as the old screen's does."
        actions={
          <div className="flex items-center gap-2">
            <IconButton icon={FolderOpen} label="Export" disabled />
            <IconButton icon={Search} label="Search" tone="primary" disabled />
          </div>
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar active={active} onReset={() => setBranch(ALL)}>
            <Filter label="Branch" htmlFor="saving-bal-branch">
              <Select id="saving-bal-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: PiggyBank,
              title: "No records to show",
              description: "No customer is holding a savings balance.",
            }}
            footerWhenEmpty
            renderFooter={() => (
              <>
                <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={3}>
                  TOTAL
                </td>
                {/* The one legacy total printed with decimals. */}
                <td className="px-4 py-3">
                  <Money strong muted>
                    0.00
                  </Money>
                </td>
              </>
            )}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
