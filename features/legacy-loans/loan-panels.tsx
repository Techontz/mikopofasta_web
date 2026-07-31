"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Banknote,
  CheckCircle2,
  Eye,
  FileText,
  Layers,
  Pencil,
  Percent,
  Receipt,
  Trash2,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  Filter,
  FilterBar,
  Money,
  SettingsCard,
  StatCard,
  StatusBadge,
} from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { DateInput, IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import {
  LEGACY_BRANCHES,
  LEGACY_DISBURSED_LOANS,
  LEGACY_DISBURSED_TOTALS,
  LEGACY_LOAN_STATUSES,
  LEGACY_PENDING_LOANS,
  LEGACY_PENDING_ROW_COUNT,
  LEGACY_RESTORATION_TYPES,
} from "@/lib/legacy/source";

/**
 * The four legacy Loan list screens.
 *
 * DESIGN ONLY. Every row comes from `lib/legacy/source.ts`, transcribed from
 * screenshots of the running legacy system; nothing here calls an API and no
 * row action does anything yet.
 *
 * What is reproduced is the *content* of the old screens — which columns exist,
 * in what order, carrying what values, and what the totals come to. What is not
 * reproduced is their chrome: these render in this app's design system, because
 * the old blue DataTable is the thing being replaced, not the thing being
 * matched. Two legacy spellings survive in the headings ("Principle + Interest"
 * and Loan Rejected's duplicated Branch) because those are properties of the
 * data being migrated rather than labels of ours to correct.
 */

const ALL = "__all__";

type PendingLoan = (typeof LEGACY_PENDING_LOANS)[number];
type DisbursedLoan = (typeof LEGACY_DISBURSED_LOANS)[number];

/**
 * The two-line primary cell: what the row is, then where it belongs.
 *
 * Every list in this app leads with one of these, so an account number and its
 * branch read as one thing rather than as two columns to join by eye.
 */
function Primary({ value, meta }: { value: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-tabular font-medium text-[var(--st-ink)]">{value}</p>
      {meta && <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{meta}</p>}
    </div>
  );
}

/** Two disbursed rows genuinely carry no customer name in the legacy data. */
function CustomerCell({ name, meta }: { name: string; meta?: string | null }) {
  if (!name) {
    return (
      <span className="text-[var(--st-ink-faint)]" title="No customer name recorded in the legacy system">
        —
      </span>
    );
  }
  return (
    <div className="min-w-0">
      <p className="whitespace-nowrap font-medium text-[var(--st-ink)]">{name}</p>
      {meta && <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{meta}</p>}
    </div>
  );
}

/** The row of inert actions every legacy list carries in its last column. */
function RowActions({
  actions,
}: {
  actions: { icon: typeof Eye; label: string; tone?: "danger" }[];
}) {
  return (
    <div className="flex justify-end gap-1">
      {actions.map((action) => (
        <IconButton
          key={action.label}
          icon={action.icon}
          label={action.label}
          tone={action.tone ?? "ghost"}
          disabled
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------- Loan Pending Approve */

/**
 * Loan → Loan Pending Approve.
 *
 * Twenty-four applications in the old system, of which the first page of ten
 * was captured. The tiles say both figures rather than one: the count is the
 * legacy book's, the money is what the captured rows come to, and conflating
 * them would put a number on screen that is true of neither.
 */
export function LoanPendingPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);

  const rows = React.useMemo(
    () =>
      LEGACY_PENDING_LOANS.filter(
        (l) => (branch === ALL || l.branch === branch) && (status === ALL || l.loanStatus === status)
      ),
    [branch, status]
  );

  const active = branch !== ALL || status !== ALL;
  const pendingAmount = rows.reduce((sum, l) => sum + l.amount, 0);
  const averageLoan = rows.length === 0 ? 0 : Math.round(pendingAmount / rows.length);

  const columns: ColumnDef<PendingLoan>[] = [
    {
      accessorKey: "loanAc",
      header: "Account",
      cell: ({ row }) => <Primary value={row.original.loanAc} meta={row.original.branch} />,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <CustomerCell name={row.original.customerName} meta={row.original.phone} />,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    { accessorKey: "duration", header: "Duration" },
    {
      accessorKey: "repayments",
      header: () => <span className="block text-right">Repayments</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.repayments}</span>,
    },
    {
      accessorKey: "loanStatus",
      header: "Loan Status",
      cell: ({ row }) => (
        <StatusBadge tone="warning" className="capitalize">
          {row.original.loanStatus.toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "customerStatus",
      header: "Customer Status",
      cell: ({ row }) => (
        <StatusBadge tone="info" className="capitalize">
          {row.original.customerStatus.toLowerCase()}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <RowActions
          actions={[
            { icon: Eye, label: "View loan" },
            { icon: Ban, label: "Reject loan" },
            { icon: Pencil, label: "Edit loan" },
            { icon: Trash2, label: "Delete loan", tone: "danger" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Loans"
          value={LEGACY_PENDING_ROW_COUNT}
          icon={Layers}
          tone="accent"
          hint={`${rows.length} of them transcribed so far`}
        />
        <StatCard
          label="Pending Amount"
          value={formatMoney(pendingAmount)}
          icon={Wallet}
          hint="Across the rows shown"
        />
        <StatCard label="Avg Loan" value={formatMoney(averageLoan)} icon={TrendingUp} />
        <StatCard
          label="New Customers"
          value={rows.filter((l) => l.customerStatus === "NEW").length}
          icon={UserPlus}
          hint="First-time borrowers in this list"
        />
      </div>

      <SettingsCard
        title="Loan Pending Approve"
        description="Applications waiting on a decision, with the branch and the customer behind each."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setStatus(ALL);
            }}
          >
            <Filter label="Branch" htmlFor="pending-branch">
              <Select id="pending-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Loan status" htmlFor="pending-status">
              <Select id="pending-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value={ALL}>All</option>
                {LEGACY_LOAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={rows}
            searchFields={["loanAc", "customerName", "phone", "branch"]}
            searchPlaceholder="Search customer or account…"
            emptyState={{
              icon: FileText,
              title: active ? "No applications match these filters" : "No pending loans",
              description: active
                ? "Widen or clear the filters above to see more."
                : "No loan is awaiting approval.",
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------------ Loan Disbursed */

/**
 * Loan → Loan Disbursed.
 *
 * The totals are the interesting part. The legacy screen prints figures for all
 * thirty-four loans while showing ten, so the printed total can never agree
 * with the rows above it. Both are on screen: the tiles carry the legacy book's
 * totals, and the TOTAL row under the table foots the rows actually shown.
 */
export function LoanDisbursedPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [restoration, setRestoration] = React.useState(ALL);
  const [date, setDate] = React.useState("");

  const rows = React.useMemo(
    () =>
      LEGACY_DISBURSED_LOANS.filter(
        (l) =>
          (branch === ALL || l.branch === branch) &&
          (restoration === ALL || l.restorationType === restoration)
      ),
    [branch, restoration]
  );

  const active = branch !== ALL || restoration !== ALL || date !== "";

  /* Every captured row's interest is simple interest on the principal, so the
     average across them is a fair headline rather than a blended rate. */
  const averageInterest =
    rows.length === 0 ? 0 : Math.round(rows.reduce((s, l) => s + l.interestRate, 0) / rows.length);

  const columns: ColumnDef<DisbursedLoan>[] = [
    {
      accessorKey: "loanAc",
      header: "Account",
      cell: ({ row }) => <Primary value={row.original.loanAc} meta={row.original.branch} />,
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => <CustomerCell name={row.original.customerName} />,
    },
    {
      accessorKey: "disbursed",
      header: () => <span className="block text-right">Loan Disbursed</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.disbursed)}</Money>,
    },
    {
      accessorKey: "interestRate",
      header: () => <span className="block text-right">Interest</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.interestRate}%</span>,
    },
    {
      // "Principle" is the legacy system's own spelling of this heading.
      accessorKey: "principalPlusInterest",
      header: () => <span className="block text-right">Principle + Interest</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.principalPlusInterest)}</Money>,
    },
    { accessorKey: "restorationType", header: "Restoration Type" },
    {
      accessorKey: "repayments",
      header: () => <span className="block text-right">Repay</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.repayments}</span>,
    },
    {
      accessorKey: "restoration",
      header: () => <span className="block text-right">Restoration</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.restoration)}</Money>,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">{row.original.date}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <RowActions
          actions={[
            { icon: Trash2, label: "Delete loan", tone: "danger" },
            { icon: FileText, label: "Loan statement" },
            { icon: Eye, label: "View loan" },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Disbursed"
          value={formatMoney(LEGACY_DISBURSED_TOTALS.disbursed)}
          icon={Banknote}
          tone="accent"
          hint="The legacy book, all 34 loans"
        />
        <StatCard
          label="Principle + Interest"
          value={formatMoney(LEGACY_DISBURSED_TOTALS.principalPlusInterest)}
          icon={Receipt}
          hint="What those 34 come back as"
        />
        <StatCard label="Loans Disbursed" value={LEGACY_DISBURSED_TOTALS.rowCount} icon={Layers} />
        <StatCard label="Avg Interest" value={`${averageInterest}%`} icon={Percent} />
      </div>

      <SettingsCard
        title="Loan Disbursed List"
        description="Money that has gone out, what it will come back as, and on what cadence. The TOTAL row foots the rows shown; the tiles above carry the legacy book's own figures."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setRestoration(ALL);
              setDate("");
            }}
          >
            <Filter label="Branch" htmlFor="disbursed-branch">
              <Select id="disbursed-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Restoration type" htmlFor="disbursed-restoration">
              <Select
                id="disbursed-restoration"
                value={restoration}
                onChange={(e) => setRestoration(e.target.value)}
              >
                <option value={ALL}>All</option>
                {LEGACY_RESTORATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="disbursed-date">
              <DateInput id="disbursed-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={rows}
            searchFields={["loanAc", "customerName", "branch", "date"]}
            searchPlaceholder="Search customer or account…"
            emptyState={{
              icon: Banknote,
              title: active ? "No loans match these filters" : "No disbursed loans",
              description: active
                ? "Widen or clear the filters above to see more."
                : "Nothing has been disbursed yet.",
            }}
            renderFooter={(visible) => (
              <>
                <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={2}>
                  TOTAL
                </td>
                <td className="px-4 py-3">
                  <Money strong>{formatMoney(visible.reduce((s, r) => s + r.disbursed, 0))}</Money>
                </td>
                <td />
                <td className="px-4 py-3">
                  <Money strong>
                    {formatMoney(visible.reduce((s, r) => s + r.principalPlusInterest, 0))}
                  </Money>
                </td>
                <td colSpan={5} />
              </>
            )}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

/* ----------------------------------------------------------- Loan Withdrawal */

/** The legacy period filter, verbatim: All | Monthly | Weekly | Daily. */
const WITHDRAWAL_PERIODS = ["All", "Monthly", "Weekly", "Daily"] as const;

/**
 * The Method vocabulary.
 *
 * Unknown — the Method column belongs to a table that was captured empty, which
 * is exactly why this filter is populated from InferredLookups-style guesses
 * rather than from `source.ts`. The three restoration types are the only thing
 * about this screen that is evidence.
 */
export function LoanWithdrawalPanel() {
  const [period, setPeriod] = React.useState<string>("All");
  const [branch, setBranch] = React.useState(ALL);
  const [method, setMethod] = React.useState(ALL);
  const [date, setDate] = React.useState("");

  const active = branch !== ALL || method !== ALL || date !== "";

  const columns: ColumnDef<Record<string, never>>[] = [
    { id: "customerName", header: "Customer" },
    { id: "branch", header: "Branch" },
    { id: "loanAc", header: "Loan Ac" },
    { id: "withdrawal", header: () => <span className="block text-right">Withdrawal</span> },
    { id: "interest", header: () => <span className="block text-right">Interest</span> },
    {
      id: "principalPlusInterest",
      header: () => <span className="block text-right">Principal + Interest</span>,
    },
    { id: "method", header: "Method" },
    { id: "durationType", header: "Duration Type" },
    { id: "repayments", header: () => <span className="block text-right">Repay</span> },
    { id: "restoration", header: () => <span className="block text-right">Restoration</span> },
    { id: "loanFee", header: () => <span className="block text-right">Loan Fee</span> },
    { id: "withdrawalDate", header: "Withdrawal Date" },
    { id: "endDate", header: "End Date" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <div className="space-y-6">
      {/*
        The period strip. It is the one piece of complete evidence in the whole
        capture set: a tab strip enumerates its own vocabulary, which is why the
        three restoration types are trusted as the full list where the branch
        list is not.
      */}
      <div
        className="inline-flex gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Withdrawal period"
        style={{ background: "var(--st-subtle-strong)" }}
      >
        {WITHDRAWAL_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              period === p
                ? "bg-[var(--st-card)] text-[var(--st-ink)] shadow-sm"
                : "text-[var(--st-ink-soft)] hover:text-[var(--st-ink)]"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Withdrawals" value={formatMoney(0)} icon={Wallet} tone="accent" />
        <StatCard label="Interest" value={formatMoney(0)} icon={Percent} />
        <StatCard label="Loan Fees" value={formatMoney(0)} icon={Receipt} />
      </div>

      <SettingsCard
        title="All Loan withdrawal"
        description="Withdrawals against approved loans. The legacy screen was captured with no rows in it, so this table is empty by evidence rather than by fault — and its Method vocabulary is still unknown."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBranch(ALL);
              setMethod(ALL);
              setDate("");
            }}
          >
            <Filter label="Branch" htmlFor="withdrawal-branch">
              <Select id="withdrawal-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Method" htmlFor="withdrawal-method">
              <Select id="withdrawal-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value={ALL}>All</option>
                {LEGACY_RESTORATION_TYPES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="withdrawal-date">
              <DateInput id="withdrawal-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: FileText,
              title: "No records to show",
              description:
                "The legacy Loan Withdrawal table was captured empty, so there is nothing to reproduce here yet.",
            }}
            /* The old screen prints its three zeroes under the empty body, so
               this one does too — see the note on the prop. */
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
                <td className="px-4 py-3">
                  <Money strong muted>
                    {formatMoney(0)}
                  </Money>
                </td>
                <td colSpan={4} />
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

/* ------------------------------------------------------------- Loan Rejected */

/**
 * Loan → Loan Rejected.
 *
 * Also captured empty, so the rejected-status badge text is still unknown. The
 * legacy header lists Branch twice; that is almost certainly a fault in the old
 * screen, and it is reproduced because a migration that silently tidies its
 * source hides the very differences a reviewer is looking for.
 */
export function LoanRejectedPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const [date, setDate] = React.useState("");

  const active = branch !== ALL || date !== "";

  const columns: ColumnDef<Record<string, never>>[] = [
    { id: "serial", header: "S/No." },
    { id: "branch", header: "Branch" },
    { id: "loanAc", header: "Loan AC/No" },
    { id: "customerName", header: "Customer" },
    { id: "phone", header: "Phone" },
    // The legacy header row genuinely lists Branch a second time here.
    { id: "branchRepeat", header: "Branch" },
    { id: "amount", header: () => <span className="block text-right">Loan Amount</span> },
    { id: "duration", header: "Duration" },
    { id: "repayments", header: () => <span className="block text-right">Repay</span> },
    { id: "loanStatus", header: "Loan Status" },
    { id: "customerStatus", header: "Customer Status" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Rejected Loans" value={0} icon={Ban} tone="accent" />
        <StatCard label="Rejected Amount" value={formatMoney(0)} icon={Wallet} />
      </div>

      <SettingsCard
        title="Loan Rejected"
        description="Applications that were turned down, and which branch turned them down. Captured empty — nothing has been rejected on the old system either."
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
            <Filter label="Branch" htmlFor="rejected-branch">
              <Select id="rejected-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {LEGACY_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="As at" htmlFor="rejected-date">
              <DateInput id="rejected-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={[]}
            emptyState={{
              icon: CheckCircle2,
              title: "No records to show",
              description: "Nothing has been rejected, which is what the old screen shows too.",
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
