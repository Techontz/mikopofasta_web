"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, ClipboardList, X } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog } from "@/components/settings/dialog";
import { IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { EXPENSE_STATUSES, type ExpenseRequest, type ExpenseStatus } from "@/types/bank";
import { decideBankExpense } from "@/features/bank/expense-actions";
import { EXPENSE_TONE, formatDate } from "@/features/bank/shared";

const ALL = "__all__";

/**
 * Bank → Request Expenses.
 *
 * An approval queue. The decision buttons only appear on a request still
 * awaiting one — a decided row keeps its place in the list as the record of what
 * was decided, but offers nothing to click.
 */
export function ExpenseRequestsPanel({
  requests,
  categories,
  branches,
}: {
  requests: ExpenseRequest[];
  /** Filter options, from the expense register and the branch register. */
  categories?: string[];
  branches?: string[];
}) {
  const rows = requests;
  const [, startTransition] = React.useTransition();
  const [status, setStatus] = React.useState(ALL);
  const [category, setCategory] = React.useState(ALL);
  const [branch, setBranch] = React.useState(ALL);

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === ALL || r.status === status) &&
          (category === ALL || r.category === category) &&
          (branch === ALL || r.branch === branch)
      ),
    [rows, status, category, branch]
  );

  const active = [status, category, branch].some((v) => v !== ALL);

  // Fall back to what the rows contain, so a filter is never an empty select.
  const categoryOptions = React.useMemo(
    () => categories ?? [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [categories, rows]
  );
  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(rows.map((r) => r.branch).filter(Boolean))].sort(),
    [branches, rows]
  );

  /*
   * Approving posts the cost to the ledger and is refused if this person raised
   * it (§14), so the row is not edited here — the action revalidates and the
   * list re-renders from what the server actually did.
   */
  function decide(request: ExpenseRequest, next: ExpenseStatus) {
    if (next === "pending") return;

    startTransition(async () => {
      const result = await decideBankExpense(request.id, next, request.category);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  const columns: ColumnDef<ExpenseRequest>[] = [
    {
      accessorKey: "requestNo",
      header: "Request No",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap font-medium text-[var(--st-ink)]">
          {row.original.requestNo}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-[var(--st-ink)]">{row.original.category}</p>
          <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">{row.original.branch}</p>
        </div>
      ),
    },
    {
      accessorKey: "requestedBy",
      header: "Requested By",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.requestedBy}</span>,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={EXPENSE_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "requestedDate",
      header: "Requested Date",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
          {formatDate(row.original.requestedDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => {
        const request = row.original;
        if (request.status !== "pending") {
          return (
            <div className="flex justify-end">
              <span className="text-[12.5px] capitalize text-[var(--st-ink-faint)]">{request.status}</span>
            </div>
          );
        }
        return (
          <div className="st-row-action flex justify-end gap-1.5">
            <DecisionAction request={request} next="approved" onConfirm={decide} />
            <DecisionAction request={request} next="rejected" onConfirm={decide} />
          </div>
        );
      },
    },
  ];

  return (
    <SettingsCard
      title={`Expenses List (${filtered.length})`}
      description="Expense requests raised by branches, and what was decided."
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar
          active={active}
          onReset={() => {
            setStatus(ALL);
            setCategory(ALL);
            setBranch(ALL);
          }}
        >
          <Filter label="Status" htmlFor="er-status">
            <Select id="er-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value={ALL}>All statuses</option>
              {EXPENSE_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Category" htmlFor="er-category">
            <Select id="er-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value={ALL}>All categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Branch" htmlFor="er-branch">
            <Select id="er-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
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
          searchFields={["requestNo", "category", "requestedBy", "branch"]}
          searchPlaceholder="Search request or category…"
          emptyState={{
            icon: ClipboardList,
            title: active ? "No requests match these filters" : "No expense requests yet",
            description: active
              ? "Widen or clear the filters above to see more."
              : "A request appears here as soon as a branch raises one.",
          }}
        />
      </div>
    </SettingsCard>
  );
}

function DecisionAction({
  request,
  next,
  onConfirm,
}: {
  request: ExpenseRequest;
  next: ExpenseStatus;
  onConfirm: (request: ExpenseRequest, next: ExpenseStatus) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const approving = next === "approved";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <IconButton
          icon={approving ? Check : X}
          label={`${approving ? "Approve" : "Reject"} ${request.requestNo}`}
          tone="secondary"
        />
      }
      title={`${approving ? "Approve" : "Reject"} ${request.requestNo}?`}
      consequence={
        approving
          ? `${formatMoney(request.amount)} will be released to ${request.branch} against ${request.category}.`
          : `The request for ${formatMoney(request.amount)} will be closed and nothing released. ${request.requestedBy} can raise it again.`
      }
      confirmLabel={approving ? "Approve" : "Reject"}
      pendingLabel={approving ? "Approving…" : "Rejecting…"}
      tone={approving ? "primary" : "danger"}
      onConfirm={() => {
        onConfirm(request, next);
        setOpen(false);
      }}
    />
  );
}
