"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Eye, Scale, X } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  APPROVAL_STATUSES,
  hqBalance,
  hqMonthlySeries,
  type ApprovalStatus,
  type HqTransaction,
} from "@/types/operations";
import { decideHqMovement } from "@/features/operations/hq-actions";
import type { ActionResult } from "@/lib/domain/action-result";
import { APPROVAL_LABEL, APPROVAL_TONE, formatMonthShort, formatOpsDate } from "@/features/operations/shared";

const ALL = "__all__";

type HqAccountRow = { name: string; balance: number };

/**
 * Runs a Server Action and reports it.
 *
 * The rows are not edited here. Each action revalidates all three headquarters
 * screens, so the server sends fresh data down and this component re-renders
 * from it — which is what moves an approved row onto the approved list and
 * changes the balance card at the same time. Editing local state as well would
 * give the screen two sources of truth that disagree for one paint, and here
 * one of them is an account balance.
 */
function useHqAction() {
  const [pending, start] = React.useTransition();

  function run(action: () => Promise<ActionResult>) {
    start(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  return { pending, run };
}

/**
 * The Headquarters Account Balance table, exactly as the legacy system prints
 * it: account name, amount, and a TOTAL row.
 *
 * Two columns, seven rows, no filters and no actions — that is the whole legacy
 * screen, and adding to it would be inventing a feature rather than rebuilding
 * one. The seven accounts and their balances come from the API now; they used
 * to be a hardcoded constant, which was right while no endpoint existed and
 * became wrong as soon as an approved movement could change a balance.
 *
 * The total is summed from the rows rather than taken from
 * LEGACY_HQ_ACCOUNTS_TOTAL. That is deliberate: the printed total is evidence
 * used to prove the transcription is complete, so a screen that displayed it
 * directly could show a figure its own rows do not support. Summing means the
 * two can only agree.
 */
export function HqAccountBalanceTable({ accounts }: { accounts: readonly HqAccountRow[] }) {
  const columns: ColumnDef<HqAccountRow>[] = [
    {
      accessorKey: "name",
      header: "Account Name",
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap text-[var(--st-ink)]">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.balance)}</Money>,
    },
  ];

  return (
    <SettingsCard title="Headquarters Account Balance">
      <SettingsTable
        columns={columns}
        data={accounts as HqAccountRow[]}
        // Reachable now that the list is fetched: an unseeded database has
        // no accounts, and a screen reading TOTAL: 0 with no rows explains
        // that better than an empty table body does.
        emptyState={{ icon: Scale, title: "No headquarters accounts" }}
        renderFooter={(rows) => (
          <>
            <td className="px-4 py-3 font-semibold text-[var(--st-ink)]">TOTAL:</td>
            <td className="px-4 py-3 text-right">
              <Money strong>{formatMoney(rows.reduce((sum, r) => sum + r.balance, 0))}</Money>
            </td>
          </>
        )}
      />
    </SettingsCard>
  );
}

/**
 * Headquarters Transaction → Headquarters Account Balance.
 *
 * The position, the movement that produced it, and the most recent entries.
 * Every figure is derived from the transaction book by hqBalance — nothing is
 * stored, so the card and the table beneath it cannot disagree.
 */
export function HqBalancePanel({ transactions }: { transactions: HqTransaction[] }) {
  const { income, expense, net, count } = hqBalance(transactions);
  const series = hqMonthlySeries(transactions);
  const recent = [...transactions]
    .filter((t) => t.status === "approved")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const columns: ColumnDef<HqTransaction>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap font-medium text-[var(--st-ink)]">
          {row.original.reference}
        </span>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-[var(--st-ink-soft)]">{row.original.reason}</span>,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => (
        <Money strong>
          {row.original.direction === "in" ? "+" : "−"}
          {formatMoney(row.original.amount)}
        </Money>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net Balance" value={formatMoney(net)} icon={Scale} tone="accent" hint={`${count} approved movements`} />
        <StatCard label="Income" value={formatMoney(income)} icon={ArrowDownLeft} hint="Money in" />
        <StatCard label="Expense" value={formatMoney(expense)} icon={ArrowUpRight} hint="Money out" />
        <StatCard
          label="Income vs Expense"
          value={expense === 0 ? "—" : `${Math.round((income / expense) * 100)}%`}
          icon={ArrowLeftRight}
          hint="Income as a share of expense"
        />
      </div>

      <SettingsCard
        title="Movement by Month"
        description="Approved money in and out, oldest first. Bars are scaled to the largest month shown."
      >
        <MonthlyChart series={series} />
      </SettingsCard>

      <SettingsCard
        title={`Recent Transactions (${recent.length})`}
        description="The latest approved movements against the headquarters account."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={recent}
          searchFields={["reference", "branch", "reason"]}
          searchPlaceholder="Search reference or reason…"
          emptyState={{
            icon: ArrowLeftRight,
            title: "No approved transactions yet",
            description: "An approved request appears here and moves the balance above.",
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Net of these {shown.length}
              </td>
              <td>
                <Money strong>
                  {formatMoney(
                    shown.reduce((s, t) => s + (t.direction === "in" ? t.amount : -t.amount), 0)
                  )}
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

/**
 * A paired bar per month: income above the axis, expense below it.
 *
 * Hand-drawn SVG rather than a charting library. The app has no chart
 * dependency and this needs none — the shape is a dozen rectangles, it inherits
 * the theme tokens so it works in dark mode for free, and it adds nothing to
 * the bundle. The figures are also given as text, because a bar chart alone is
 * unreadable to a screen reader.
 */
function MonthlyChart({ series }: { series: { month: string; income: number; expense: number }[] }) {
  if (series.length === 0) {
    return <p className="text-[14px] text-[var(--st-ink-faint)]">No approved movement to chart yet.</p>;
  }

  const peak = Math.max(...series.flatMap((s) => [s.income, s.expense]), 1);
  const height = 132;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3 overflow-x-auto pb-1">
        {series.map((point) => (
          <div key={point.month} className="flex min-w-[54px] flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[132px] w-full items-end justify-center gap-1" aria-hidden>
              <div
                className="w-1/2 rounded-t-[3px] transition-[height] duration-300"
                style={{
                  height: `${Math.max(2, (point.income / peak) * height)}px`,
                  background: "var(--st-accent)",
                }}
              />
              <div
                className="w-1/2 rounded-t-[3px] transition-[height] duration-300"
                style={{
                  height: `${Math.max(2, (point.expense / peak) * height)}px`,
                  background: "var(--st-line-hover)",
                }}
              />
            </div>
            <span className="font-tabular whitespace-nowrap text-[12px] text-[var(--st-ink-faint)]">
              {formatMonthShort(point.month)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-[var(--st-ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: "var(--st-accent)" }} aria-hidden />
          Income
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: "var(--st-line-hover)" }} aria-hidden />
          Expense
        </span>
      </div>

      {/* The same data in words, for anyone who cannot see the bars. */}
      <table className="sr-only">
        <caption>Approved movement by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expense</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.month}>
              <td>{formatMonthShort(point.month)}</td>
              <td>{formatMoney(point.income)}</td>
              <td>{formatMoney(point.expense)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Headquarters Transaction → Requested and Approved.
 *
 * One component, two slices. `decidable` decides whether Approve and Reject
 * appear; the approved list shows who approved each entry instead.
 */
export function HqTransactionsPanel({
  transactions,
  decidable,
  title,
  description,
  emptyTitle,
  emptyDescription,
  branches,
}: {
  transactions: HqTransaction[];
  decidable: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  /** The branch filter's options, from the branch register. */
  branches?: string[];
}) {
  const rows = transactions;
  const [status, setStatus] = React.useState(ALL);
  const [branch, setBranch] = React.useState(ALL);
  const [viewing, setViewing] = React.useState<HqTransaction | null>(null);
  const { run } = useHqAction();

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (t) => (status === ALL || t.status === status) && (branch === ALL || t.branch === branch)
      ),
    [rows, status, branch]
  );
  const active = status !== ALL || branch !== ALL;

  // Fall back to the branches present in the rows, so the filter is never an
  // empty select.
  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(rows.map((t) => t.branch).filter(Boolean))].sort(),
    [branches, rows]
  );

  function decide(txn: HqTransaction, next: ApprovalStatus) {
    if (next === "pending") return;
    run(() => decideHqMovement(txn.id, next, txn.reference));
  }

  const columns: ColumnDef<HqTransaction>[] = [
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--st-ink)]">{row.original.branch}</p>
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">{row.original.reference}</p>
        </div>
      ),
    },
    decidable
      ? {
          accessorKey: "requestedBy",
          header: "Requested By",
          cell: ({ row }) => <span className="whitespace-nowrap">{row.original.requestedBy}</span>,
        }
      : {
          accessorKey: "approvedBy",
          header: "Approved By",
          cell: ({ row }) =>
            row.original.approvedBy ? (
              <span className="whitespace-nowrap">{row.original.approvedBy}</span>
            ) : (
              <span className="text-[var(--st-ink-faint)]">—</span>
            ),
        },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-[var(--st-ink-soft)]">{row.original.reason}</span>,
    },
    ...(decidable
      ? [
          {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
              <StatusBadge tone={APPROVAL_TONE[row.original.status]}>
                {APPROVAL_LABEL[row.original.status]}
              </StatusBadge>
            ),
          } as ColumnDef<HqTransaction>,
        ]
      : []),
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
    ...(decidable
      ? [
          {
            id: "actions",
            header: () => <span className="block text-right">Actions</span>,
            cell: ({ row }) => {
              const txn = row.original;
              const pending = txn.status === "pending";
              return (
                <div className="st-row-action flex justify-end gap-1.5">
                  <IconButton
                    icon={Eye}
                    label={`View ${txn.reference}`}
                    tone="secondary"
                    onClick={() => setViewing(txn)}
                  />
                  <DecisionAction txn={txn} next="approved" disabled={!pending} onConfirm={decide} />
                  <DecisionAction txn={txn} next="rejected" disabled={!pending} onConfirm={decide} />
                </div>
              );
            },
          } as ColumnDef<HqTransaction>,
        ]
      : [
          {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
              <StatusBadge tone={APPROVAL_TONE[row.original.status]}>
                {APPROVAL_LABEL[row.original.status]}
              </StatusBadge>
            ),
          } as ColumnDef<HqTransaction>,
        ]),
  ];

  const trailingSpan = columns.length - 3;

  return (
    <>
      <SettingsCard title={`${title} (${filtered.length})`} description={description} bodyClassName="pt-0 sm:pt-0">
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setStatus(ALL);
              setBranch(ALL);
            }}
          >
            {decidable && (
              <Filter label="Status" htmlFor="hq-status">
                <Select id="hq-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value={ALL}>All statuses</option>
                  {APPROVAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {APPROVAL_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Filter>
            )}
            <Filter label="Branch" htmlFor="hq-branch">
              <Select id="hq-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            searchFields={["reference", "branch", "requestedBy", "reason"]}
            searchPlaceholder="Search reference, branch or reason…"
            emptyState={{
              icon: ArrowLeftRight,
              title: active ? "No transactions match these filters" : emptyTitle,
              description: active ? "Widen or clear the filters above to see more." : emptyDescription,
            }}
            renderFooter={(shown) => (
              <>
                <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                  Total ({shown.length})
                </td>
                <td>
                  <Money strong>{formatMoney(shown.reduce((s, t) => s + t.amount, 0))}</Money>
                </td>
                <td colSpan={trailingSpan} />
              </>
            )}
          />
        </div>
      </SettingsCard>

      {viewing && (
        <SettingsDialog
          open
          onOpenChange={(next) => !next && setViewing(null)}
          title={viewing.reference}
          description={`${viewing.branch} · ${formatMoney(viewing.amount)}`}
          size="lg"
          footer={
            <Button type="button" tone="secondary" onClick={() => setViewing(null)}>
              Close
            </Button>
          }
        >
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {[
              { label: "Reference", value: viewing.reference, mono: true },
              { label: "Branch", value: viewing.branch },
              { label: "Requested by", value: viewing.requestedBy },
              { label: "Approved by", value: viewing.approvedBy ?? "—" },
              { label: "Amount", value: formatMoney(viewing.amount), mono: true },
              { label: "Direction", value: viewing.direction === "in" ? "Money in" : "Money out" },
              { label: "Reason", value: viewing.reason },
              { label: "Date", value: formatOpsDate(viewing.date), mono: true },
            ].map((fact) => (
              <div key={fact.label}>
                <dt className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--st-ink-faint)]">
                  {fact.label}
                </dt>
                <dd className={`mt-0.5 text-[14px] text-[var(--st-ink)] ${fact.mono ? "font-tabular" : ""}`}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </SettingsDialog>
      )}
    </>
  );
}

function DecisionAction({
  txn,
  next,
  disabled,
  onConfirm,
}: {
  txn: HqTransaction;
  next: ApprovalStatus;
  disabled: boolean;
  onConfirm: (txn: HqTransaction, next: ApprovalStatus) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const approving = next === "approved";

  if (disabled) {
    return (
      <IconButton
        icon={approving ? Check : X}
        tone="secondary"
        disabled
        label={`${txn.reference} is already ${txn.status}`}
      />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <IconButton
          icon={approving ? Check : X}
          label={`${approving ? "Approve" : "Reject"} ${txn.reference}`}
          tone="secondary"
        />
      }
      title={`${approving ? "Approve" : "Reject"} ${txn.reference}?`}
      consequence={
        approving
          ? txn.direction === "internal"
            ? `${formatMoney(txn.amount)} will move between two headquarters accounts. The total held does not change.`
            : `${formatMoney(txn.amount)} will move ${txn.direction === "in" ? "into" : "out of"} the headquarters account and the balance will change.`
          : `The request for ${formatMoney(txn.amount)} will be closed and the balance is unaffected. ${txn.requestedBy} can raise it again.`
      }
      confirmLabel={approving ? "Approve" : "Reject"}
      pendingLabel={approving ? "Approving…" : "Rejecting…"}
      tone={approving ? "primary" : "danger"}
      onConfirm={() => {
        onConfirm(txn, next);
        setOpen(false);
      }}
    />
  );
}
