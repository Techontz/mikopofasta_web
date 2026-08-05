"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, FolderOpen, PiggyBank, Wallet } from "lucide-react";
import { Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { formatMoney } from "@/lib/domain/money";
import { AwaitingBackendNote } from "@/features/legacy-modules/shared";

/**
 * The Insurance module — which every screen inside it calls Saving Deposit.
 *
 * LAYOUT ONLY, and worth reading before changing anything here.
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
 * WHAT CHANGED. All four screens were captured empty and the backend has no
 * savings endpoints, so every table here is `[]` and cannot be otherwise. The
 * screens used to carry the old system's toolbars and filter strips anyway —
 * disabled Search and Export buttons, and branch dropdowns filled from three
 * transcribed branch names. A branch filter over a permanently empty table
 * cannot filter, and its options were not this institution's branches in any
 * case. Both are gone; `AwaitingBackendNote` says what they were standing in
 * for. Columns, totals rows and headings are untouched.
 *
 * The customer picker on Deposit & Withdrawal went the same way: it listed
 * customers transcribed off a screenshot and its button opened nothing.
 */

/**
 * The three ways the legacy withdrawal screen splits its list.
 *
 * Inlined rather than imported from the old screenshot-transcription module.
 * That file held real customers' names, phone numbers and bank accounts, and
 * importing one three-string constant from it pulled the whole module — and
 * therefore those records — into the browser bundle, on a screen that renders
 * none of them. Three strings were not worth shipping a customer list for.
 *
 * The module has since been deleted entirely, which is why there is nothing
 * left to import; these strings stay inlined because they are the legacy
 * screen's own tab labels and have no other source.
 */
const LEGACY_SAVING_WITHDRAWAL_KINDS = ["All", "Saving Taken", "Saving clear loan"] as const;

/** No captured screen in this module has ever shown a row, and no endpoint can supply one. */
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
 *
 * So there are two unknowns here, not one: which customers may save, and what
 * opening their savings shows. The picker is not reproduced with a transcribed
 * customer list and a button that goes nowhere, because a form that submits
 * into nothing is worse than no form.
 */
export function InsuranceLedgerPanel() {
  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Insurance (Saving Deposit)" />

      <SettingsCard
        title="Search Customer"
        description="Pick a customer to record a deposit or a withdrawal against their savings."
      >
        <p className="text-[13px] text-[var(--st-ink-soft)]">
          The legacy screen opens a customer&rsquo;s savings record from here. Neither the customer
          savings list nor the record it opens exists in the API yet, so there is nothing to search
          and nothing to open.
        </p>
      </SettingsCard>
    </div>
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
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "customer", header: "customer" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Insurance (Saving Deposit)" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deposits Today" value={0} icon={ArrowDownLeft} tone="accent" />
        <StatCard label="Amount In" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Customers Saving" value={0} icon={PiggyBank} />
      </div>

      <SettingsCard
        title="Today saving Deposit"
        description="What has been paid into savings today. Captured empty, so the total reads zero as the old screen's does."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: PiggyBank,
            title: "No records to show",
            description: "There is no savings endpoint yet, so this list has nothing to read from.",
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
 *
 * The strip is rendered as static labels rather than as tabs. It was three
 * buttons that switched a highlight and nothing else, because the table under
 * them is empty whichever is chosen — a control whose only effect is on itself.
 * The vocabulary is the evidence worth keeping; the interaction was not.
 */
export function InsuranceWithdrawalPanel() {
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
      <AwaitingBackendNote module="Insurance (Saving Deposit)" />

      <p className="text-[13px] text-[var(--st-ink-soft)]">
        The legacy screen splits this list three ways:{" "}
        <span className="text-[var(--st-ink)]">{LEGACY_SAVING_WITHDRAWAL_KINDS.join(" · ")}</span>.
      </p>

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
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: ArrowUpRight,
            title: "No records to show",
            description: "There is no savings endpoint yet, so this list has nothing to read from.",
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
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no." },
    { id: "branch", header: "Branch" },
    { id: "customer", header: "customer" },
    { id: "amount", header: () => <span className="block text-right">Amount</span> },
  ];

  return (
    <div className="space-y-6">
      <AwaitingBackendNote module="Insurance (Saving Deposit)" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Savers" value={0} icon={PiggyBank} tone="accent" />
        <StatCard label="Total Held" value={formatMoney(0)} icon={Wallet} />
        <StatCard label="Branches Reporting" value={0} icon={FolderOpen} />
      </div>

      <SettingsCard
        title="Saving Deposit balance"
        description="What each customer holds in savings right now. Captured empty, so the total reads zero as the old screen's does."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: PiggyBank,
            title: "No records to show",
            description: "There is no savings endpoint yet, so this list has nothing to read from.",
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
      </SettingsCard>
    </div>
  );
}
