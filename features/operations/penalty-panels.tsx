"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Eye, Wallet } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { SettingsDialog } from "@/components/settings/dialog";
import { IconButton, Select, TextInput } from "@/components/settings/form";
import { ExportButton } from "@/components/settings/export-button";
import { formatMoney } from "@/lib/domain/money";
import { formatOpsDate } from "@/features/operations/shared";
import type { PaidPenaltyRecord, PenaltyRecord } from "@/lib/api/charges";

const ALL = "__all__";

/**
 * Penalty → Penalty List.
 *
 * Penalties charged against overdue installments.
 *
 * **Read-only, and that is the change from the fixture version.** That one
 * offered Edit ("corrects a mis-keyed figure") and Delete. Neither applies to a
 * real penalty, because nothing is keyed in: the overdue job computes each
 * figure from the product's penalty terms and the days past due, writes it to
 * `loan_schedules.penalty_due`, and the repayment engine settles it from there.
 *
 * Editing the amount would put the schedule at odds with what the engine would
 * next compute and with what Penalty Income eventually records; deleting a row
 * would erase a charge the borrower still owes. There is no endpoint for
 * either, deliberately — the way to change a penalty is to change the product's
 * penalty terms, which re-prices future accruals rather than rewriting history.
 */
export function PenaltyListPanel({
  penalties,
  totals,
  branches,
}: {
  penalties: PenaltyRecord[];
  /** Over the whole filtered set on the server, not just this page. */
  totals: { charged: number; paid: number; outstanding: number };
  branches?: string[];
}) {
  const [viewing, setViewing] = React.useState<PenaltyRecord | null>(null);
  const [branch, setBranch] = React.useState(ALL);
  const [search, setSearch] = React.useState("");

  /*
   * Filtered in the browser over the page the server sent. The server takes the
   * same two filters (`branch_id`, `search`) for when a branch's penalty list
   * outgrows one page — see lib/api/charges.ts.
   */
  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return penalties.filter(
      (p) =>
        (branch === ALL || p.branch === branch) &&
        (term === "" ||
          p.customerName.toLowerCase().includes(term) ||
          p.loanNumber.toLowerCase().includes(term))
    );
  }, [penalties, branch, search]);

  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(penalties.map((p) => p.branch).filter(Boolean))].sort(),
    [branches, penalties]
  );

  const columns: ColumnDef<PenaltyRecord>[] = [
    {
      id: "sn",
      header: "S/N",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--st-ink)]">{row.original.customerName}</p>
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
            {row.original.loanNumber} · installment {row.original.installmentNumber}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "loanAmount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.loanAmount)}</Money>,
    },
    {
      accessorKey: "penaltyAmount",
      header: () => <span className="block text-right">Penalty Charged</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.penaltyAmount)}</Money>,
    },
    {
      /*
       * The column the fixture version could not have had. A charged penalty
       * does not shrink when it is paid — `penaltyAmount` is what was charged —
       * so without this every row would read as still outstanding.
       */
      id: "outstanding",
      header: () => <span className="block text-right">Still Owed</span>,
      cell: ({ row }) =>
        row.original.outstanding > 0 ? (
          <Money strong>{formatMoney(row.original.outstanding)}</Money>
        ) : (
          <span className="block text-right text-[var(--st-ink-faint)]">Settled</span>
        ),
    },
    {
      accessorKey: "date",
      header: "Due Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatOpsDate(row.original.date)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <IconButton
            icon={Eye}
            label={`View ${row.original.customerName}'s penalty`}
            tone="secondary"
            onClick={() => setViewing(row.original)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Penalties Charged" value={formatMoney(totals.charged)} icon={AlertTriangle} tone="accent" />
        <StatCard label="Collected" value={formatMoney(totals.paid)} icon={Wallet} />
        <StatCard
          label="Still Owed"
          value={formatMoney(totals.outstanding)}
          icon={AlertTriangle}
          hint="Across every penalty, not just this page"
        />
      </div>

      <SettingsCard
        title={`Penalty List (${filtered.length})`}
        description="Charged by the overdue job from each product's penalty terms and the days past due."
        actions={
          <ExportButton
            rows={filtered}
            columns={[
              { header: "Customer", key: "customerName" },
              { header: "Loan", key: "loanNumber" },
              { header: "Branch", key: "branch" },
              { header: "Loan Amount", key: "loanAmount" },
              { header: "Penalty Charged", key: "penaltyAmount" },
              { header: "Paid", key: "penaltyPaid" },
              { header: "Still Owed", key: "outstanding" },
              { header: "Due Date", key: "date" },
            ]}
            filename="penalty-list"
          />
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={branch !== ALL || search !== ""}
            onReset={() => {
              setBranch(ALL);
              setSearch("");
            }}
          >
            <Filter label="Branch" htmlFor="pl-branch">
              <Select id="pl-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {branchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Search" htmlFor="pl-search">
              <TextInput
                id="pl-search"
                value={search}
                placeholder="Customer or loan number…"
                onChange={(e) => setSearch(e.target.value)}
              />
            </Filter>
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            emptyState={{
              icon: AlertTriangle,
              title: "No penalties charged",
              description: "A penalty appears here once an installment passes its grace period.",
            }}
          />
        </div>
      </SettingsCard>

      {viewing && <PenaltyDetail penalty={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function PenaltyDetail({ penalty, onClose }: { penalty: PenaltyRecord; onClose: () => void }) {
  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Penalty — ${penalty.customerName}`}
      description={`${penalty.loanNumber} · installment ${penalty.installmentNumber} · due ${formatOpsDate(penalty.date)}`}
      submitLabel="Close"
      formId="penalty-detail"
      onSubmit={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <dl className="grid grid-cols-2 gap-4 text-[14px]">
        <Fact label="Loan amount" value={formatMoney(penalty.loanAmount)} />
        <Fact label="Branch" value={penalty.branch} />
        <Fact label="Penalty charged" value={formatMoney(penalty.penaltyAmount)} />
        <Fact label="Paid" value={formatMoney(penalty.penaltyPaid)} />
        <Fact label="Still owed" value={formatMoney(penalty.outstanding)} />
      </dl>
    </SettingsDialog>
  );
}

/**
 * Penalty → Paid Penalty.
 *
 * Penalty money actually collected, one row per allocation that touched a
 * penalty. Read-only for the same reason a receipt is: it records something
 * that already happened, and the ledger entry behind it cannot be edited either.
 */
export function PaidPenaltyPanel({
  payments,
  totalPaid,
  branches,
}: {
  payments: PaidPenaltyRecord[];
  totalPaid: number;
  branches?: string[];
}) {
  const [viewing, setViewing] = React.useState<PaidPenaltyRecord | null>(null);
  const [branch, setBranch] = React.useState(ALL);

  const filtered = React.useMemo(
    () => payments.filter((p) => branch === ALL || p.branch === branch),
    [payments, branch]
  );

  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(payments.map((p) => p.branch).filter(Boolean))].sort(),
    [branches, payments]
  );

  const columns: ColumnDef<PaidPenaltyRecord>[] = [
    {
      id: "sn",
      header: "S/N",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium text-[var(--st-ink)]">{row.original.customerName}</p>
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
            {row.original.paymentReference}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.branch}</span>,
    },
    {
      accessorKey: "paidAmount",
      header: () => <span className="block text-right">Paid Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.paidAmount)}</Money>,
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
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <IconButton
            icon={Eye}
            label={`View ${row.original.customerName}'s payment`}
            tone="secondary"
            onClick={() => setViewing(row.original)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Penalty Collected" value={formatMoney(totalPaid)} icon={Wallet} tone="accent" />
        <StatCard
          label="Payments"
          value={payments.length}
          icon={Wallet}
          hint="One row per allocation that touched a penalty"
        />
      </div>

      <SettingsCard
        title={`Paid Penalty List (${filtered.length})`}
        description="What customers have settled. This total is what 2200 Penalty Income holds."
        actions={
          <ExportButton
            rows={filtered}
            columns={[
              { header: "Customer", key: "customerName" },
              { header: "Loan", key: "loanNumber" },
              { header: "Branch", key: "branch" },
              { header: "Paid Amount", key: "paidAmount" },
              { header: "Payment", key: "paymentReference" },
              { header: "Date", key: "date" },
            ]}
            filename="paid-penalty"
          />
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
            <Filter label="Branch" htmlFor="pp-branch">
              <Select id="pp-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
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
            emptyState={{
              icon: Wallet,
              title: "No penalties collected yet",
              description: "A row appears here when a payment is allocated against a penalty.",
            }}
          />
        </div>
      </SettingsCard>

      {viewing && (
        <SettingsDialog
          open
          onOpenChange={(next) => !next && setViewing(null)}
          title={`Payment — ${viewing.customerName}`}
          description={`${viewing.paymentReference} · ${formatOpsDate(viewing.date)}`}
          submitLabel="Close"
          formId="paid-penalty-detail"
          onSubmit={(e) => {
            e.preventDefault();
            setViewing(null);
          }}
        >
          <dl className="grid grid-cols-2 gap-4 text-[14px]">
            <Fact label="Loan" value={viewing.loanNumber} />
            <Fact label="Branch" value={viewing.branch} />
            <Fact label="Installment" value={String(viewing.installmentNumber)} />
            <Fact label="Paid" value={formatMoney(viewing.paidAmount)} />
          </dl>
        </SettingsDialog>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--st-ink-faint)]">{label}</dt>
      <dd className="font-tabular mt-0.5 font-medium text-[var(--st-ink)]">{value}</dd>
    </div>
  );
}
