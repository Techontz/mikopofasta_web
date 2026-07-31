"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, Check, Eye, Receipt, X } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, DateInput, IconButton, Select } from "@/components/settings/form";
import { toast } from "sonner";
import { formatMoney } from "@/lib/domain/money";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type BankTransaction,
  type TransactionStatus,
} from "@/types/bank";
import { BANK_NAMES, BRANCHES } from "@/lib/mock-data/bank";
import { FactGrid, TRANSACTION_TONE, TYPE_LABEL, formatDate, type Fact } from "@/features/bank/shared";

const ALL = "__all__";

/**
 * The transaction table, shared by Bank Transaction and Approved Transaction.
 *
 * One component with two modes rather than two near-identical tables: the
 * columns, filters and formatting are the same question asked of a different
 * slice, and the only real difference is whether a row can still be decided.
 * `decidable` controls that — and it is the same flag that decides whether the
 * Action column appears at all, so an approved list never shows dead buttons.
 */
export function TransactionsPanel({
  transactions,
  decidable = false,
  emptyTitle,
  emptyDescription,
}: {
  transactions: BankTransaction[];
  decidable?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [rows, setRows] = React.useState(transactions);
  const [bank, setBank] = React.useState(ALL);
  const [branch, setBranch] = React.useState(ALL);
  const [type, setType] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);
  const [date, setDate] = React.useState("");
  const [viewing, setViewing] = React.useState<BankTransaction | null>(null);

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (t) =>
          (bank === ALL || t.bankName === bank) &&
          (branch === ALL || t.branch === branch) &&
          (type === ALL || t.type === type) &&
          (status === ALL || t.status === status) &&
          (date === "" || t.date === date)
      ),
    [rows, bank, branch, type, status, date]
  );

  const active = [bank, branch, type, status].some((v) => v !== ALL) || date !== "";

  function decide(txn: BankTransaction, next: TransactionStatus) {
    setRows((prev) =>
      prev.map((t) =>
        t.id === txn.id
          ? { ...t, status: next, decidedBy: "You", decidedAt: new Date(txn.date).toISOString().slice(0, 10) }
          : t
      )
    );
    toast.success(`${txn.reference} ${next}.`);
  }

  const columns: ColumnDef<BankTransaction>[] = [
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
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatDate(row.original.date)}
        </span>
      ),
    },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.bankName}</span>,
    },
    {
      accessorKey: "accountName",
      header: "Account",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-[var(--st-ink)]">{row.original.accountName}</p>
          <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
            {row.original.accountNumber} · {row.original.branch}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <StatusBadge tone="neutral" dot={false}>
          {TYPE_LABEL[row.original.type]}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "requestedBy",
      header: "Requested By",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.requestedBy}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={TRANSACTION_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
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
            {decidable && (
              <>
                <DecisionAction
                  txn={txn}
                  next="approved"
                  disabled={!pending}
                  onConfirm={decide}
                />
                <DecisionAction
                  txn={txn}
                  next="rejected"
                  disabled={!pending}
                  onConfirm={decide}
                />
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <SettingsCard
        title={`Transactions (${filtered.length})`}
        description={
          decidable
            ? "Requests awaiting a decision, and those already decided. A decision is taken by Finance, not by the requester."
            : "Transactions that have been decided."
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar
            active={active}
            onReset={() => {
              setBank(ALL);
              setBranch(ALL);
              setType(ALL);
              setStatus(ALL);
              setDate("");
            }}
          >
            <Filter label="Date" htmlFor="tx-date">
              <DateInput id="tx-date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Filter>
            <Filter label="Bank" htmlFor="tx-bank">
              <Select id="tx-bank" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value={ALL}>All banks</option>
                {BANK_NAMES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Branch" htmlFor="tx-branch">
              <Select id="tx-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value={ALL}>All branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Filter>
            <Filter label="Transaction Type" htmlFor="tx-type">
              <Select id="tx-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value={ALL}>All types</option>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Filter>
            {decidable && (
              <Filter label="Status" htmlFor="tx-status">
                <Select id="tx-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value={ALL}>All statuses</option>
                  {TRANSACTION_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </Select>
              </Filter>
            )}
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            searchFields={["reference", "bankName", "accountName", "accountNumber", "requestedBy"]}
            searchPlaceholder="Search reference or account…"
            emptyState={{
              icon: active ? Receipt : ArrowLeftRight,
              title: active ? "No transactions match these filters" : emptyTitle,
              description: active ? "Widen or clear the filters above to see more." : emptyDescription,
            }}
          />
        </div>
      </SettingsCard>

      <ViewTransactionDialog txn={viewing} onClose={() => setViewing(null)} />
    </>
  );
}

/**
 * Approve and Reject both need a confirmation, because both are decisions
 * someone else will act on. The consequence line states what the decision
 * causes, not merely that it is irreversible.
 */
function DecisionAction({
  txn,
  next,
  disabled,
  onConfirm,
}: {
  txn: BankTransaction;
  next: TransactionStatus;
  disabled: boolean;
  onConfirm: (txn: BankTransaction, next: TransactionStatus) => void;
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
          ? `${formatMoney(txn.amount)} will be released against ${txn.accountName}, and the request moves to the approved list.`
          : `The request for ${formatMoney(txn.amount)} will be closed and nothing will move. ${txn.requestedBy} can raise it again.`
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

function ViewTransactionDialog({
  txn,
  onClose,
}: {
  txn: BankTransaction | null;
  onClose: () => void;
}) {
  if (!txn) return null;
  const facts: Fact[] = [
    { label: "Reference", value: txn.reference, mono: true },
    { label: "Date", value: formatDate(txn.date), mono: true },
    { label: "Bank", value: txn.bankName },
    { label: "Account", value: txn.accountName },
    { label: "Account number", value: txn.accountNumber, mono: true },
    { label: "Branch", value: txn.branch },
    { label: "Type", value: TYPE_LABEL[txn.type] },
    { label: "Amount", value: formatMoney(txn.amount), mono: true },
    { label: "Requested by", value: txn.requestedBy },
    { label: "Status", value: txn.status, tone: TRANSACTION_TONE[txn.status] },
    { label: "Decided by", value: txn.decidedBy ?? "—" },
    { label: "Decided on", value: formatDate(txn.decidedAt), mono: true },
    ...(txn.note ? [{ label: "Note", value: txn.note, wide: true } satisfies Fact] : []),
  ];

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={txn.reference}
      description={`${TYPE_LABEL[txn.type]} · ${formatMoney(txn.amount)}`}
      size="lg"
      footer={
        <Button type="button" tone="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <FactGrid facts={facts} />
    </SettingsDialog>
  );
}
