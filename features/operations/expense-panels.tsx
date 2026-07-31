"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, ClipboardList, Pencil, Plus, Receipt, Trash2, X } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, IconButton, Select, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  APPROVAL_STATUSES,
  ExpenseNameInputSchema,
  type ApprovalStatus,
  type ExpenseClaim,
  type ExpenseName,
  type ExpenseNameInput,
} from "@/types/operations";
import {
  deleteExpenseClaim,
  deleteExpenseName,
  decideExpense,
  saveExpenseComment,
  saveExpenseName,
} from "@/features/operations/expense-actions";
import type { ActionResult } from "@/lib/domain/action-result";
import { APPROVAL_LABEL, APPROVAL_TONE, formatOpsDate } from "@/features/operations/shared";

const ALL = "__all__";

/**
 * Runs a Server Action and reports it.
 *
 * The rows themselves are not touched here. Every action revalidates the paths
 * it affects, so the server sends the new list down and this component
 * re-renders from it — which is the only way an approved row can leave the
 * requests screen and appear on the approved one. Editing local state as well
 * would give the screen two sources of truth that disagree for one paint.
 */
function useAction() {
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
 * The expense register — Expenses → Register Branch Expenses, and
 * Headquarters Expenses → Register Expenses.
 *
 * One component for both: the two screens keep separate lists of names but are
 * otherwise identical, so `scope` decides which list is shown and what a new
 * name is filed under.
 */
export function ExpenseNamesPanel({
  names,
  scope,
  title,
  description,
}: {
  names: ExpenseName[];
  scope: ExpenseName["scope"];
  title: string;
  description: string;
}) {
  const rows = names;
  const [editing, setEditing] = React.useState<ExpenseName | null>(null);
  const [adding, setAdding] = React.useState(false);
  const { run } = useAction();

  function upsert(values: ExpenseNameInput, id?: string) {
    run(() => saveExpenseName(values, scope, id));
  }

  function remove(name: ExpenseName) {
    run(() => deleteExpenseName(name.id, name.name));
  }

  const columns: ColumnDef<ExpenseName>[] = [
    {
      id: "sn",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "name",
      header: "Expenses",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.name}</span>,
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Pencil}
            label={`Edit ${row.original.name}`}
            tone="secondary"
            onClick={() => setEditing(row.original)}
          />
          <DeleteNameAction name={row.original} onConfirm={remove} />
        </div>
      ),
    },
  ];

  return (
    <>
      <SettingsCard
        title={`${title} (${rows.length})`}
        description={description}
        actions={
          <Button tone="primary" icon={Plus} onClick={() => setAdding(true)}>
            Add Expense
          </Button>
        }
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["name"]}
          searchPlaceholder="Search expense…"
          emptyState={{
            icon: Receipt,
            title: "No expenses registered",
            description: "Add the first expense name so requests can be filed against it.",
            action: (
              <Button tone="primary" icon={Plus} onClick={() => setAdding(true)}>
                Add Expense
              </Button>
            ),
          }}
          renderFooter={(shown) => (
            <>
              <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                {shown.length} expense{shown.length === 1 ? "" : "s"}
              </td>
              <td />
            </>
          )}
        />
      </SettingsCard>

      <ExpenseNameDialog
        open={adding || editing !== null}
        name={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSave={upsert}
      />
    </>
  );
}

function ExpenseNameDialog({
  open,
  name,
  onClose,
  onSave,
}: {
  open: boolean;
  name: ExpenseName | null;
  onClose: () => void;
  onSave: (values: ExpenseNameInput, id?: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseNameInput>({
    resolver: zodResolver(ExpenseNameInputSchema),
    defaultValues: { name: name?.name ?? "" },
  });

  React.useEffect(() => {
    if (open) reset({ name: name?.name ?? "" });
  }, [open, name, reset]);

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={name ? `Edit ${name.name}` : "Add Expense"}
      description="The name a request is filed against — electricity, water, stationery."
      formId="expense-name-form"
      onSubmit={handleSubmit((values) => {
        onSave(values, name?.id);
        onClose();
      })}
      submitLabel={name ? "Save changes" : "Add expense"}
      pending={isSubmitting}
    >
      <Field label="Expense Name" htmlFor="en-name" required error={errors.name?.message}>
        <TextInput id="en-name" placeholder="e.g. Electricity" invalid={!!errors.name} {...register("name")} />
      </Field>
    </SettingsDialog>
  );
}

function DeleteNameAction({
  name,
  onConfirm,
}: {
  name: ExpenseName;
  onConfirm: (name: ExpenseName) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete ${name.name}`} tone="secondary" />}
      title={`Delete ${name.name}?`}
      consequence="New requests will no longer be able to file against this name. Requests already filed keep it."
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(name);
        setOpen(false);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Expense claims — requested and approved, branch and headquarters
// ---------------------------------------------------------------------------

/**
 * The four expense claim screens.
 *
 * Branch and headquarters registers ask the same question of the same record;
 * the only difference is whether the second column names a branch or a member
 * of staff. `scope` picks that, and `decidable` decides whether a row still
 * offers Approve and Reject — an approved list never shows dead buttons.
 */
export function ExpenseClaimsPanel({
  claims,
  scope,
  decidable,
  title,
  description,
  emptyTitle,
  emptyDescription,
  branches,
}: {
  claims: ExpenseClaim[];
  scope: ExpenseClaim["scope"];
  decidable: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  /**
   * The branch filter's options, from the branch register.
   *
   * Passed in rather than derived from the visible rows: a branch that has
   * filed nothing this period is still a branch you might want to filter to,
   * and finding it absent from the list reads as "no such branch" rather than
   * "no rows".
   */
  branches?: string[];
}) {
  const rows = claims;
  const [status, setStatus] = React.useState(ALL);
  const [branch, setBranch] = React.useState(ALL);
  const [editing, setEditing] = React.useState<ExpenseClaim | null>(null);
  const { run } = useAction();

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (c) => (status === ALL || c.status === status) && (branch === ALL || c.branch === branch)
      ),
    [rows, status, branch]
  );

  const active = status !== ALL || branch !== ALL;

  // Fall back to the branches present in the rows when none were supplied, so
  // the filter is never an empty select.
  const branchOptions = React.useMemo(
    () => branches ?? [...new Set(rows.map((c) => c.branch).filter(Boolean))].sort(),
    [branches, rows]
  );

  function decide(claim: ExpenseClaim, next: ApprovalStatus) {
    if (next === "pending") return;
    run(() => decideExpense(claim.id, next, claim.expense));
  }

  function remove(claim: ExpenseClaim) {
    run(() => deleteExpenseClaim(claim.id, claim.expense));
  }

  function saveComment(claim: ExpenseClaim, comment: string) {
    run(() => saveExpenseComment(claim.id, comment));
  }

  const isBranch = scope === "branch";

  const columns: ColumnDef<ExpenseClaim>[] = [
    // Branch register names the branch; the headquarters one names the staff.
    isBranch
      ? {
          accessorKey: "branch",
          header: "Branch",
          cell: ({ row }) => <span className="whitespace-nowrap font-medium text-[var(--st-ink)]">{row.original.branch}</span>,
        }
      : {
          accessorKey: "expense",
          header: "Expenses",
          cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.expense}</span>,
        },
    ...(isBranch
      ? [
          {
            accessorKey: "expense",
            header: "Expenses",
            cell: ({ row }) => <span className="text-[var(--st-ink)]">{row.original.expense}</span>,
          } as ColumnDef<ExpenseClaim>,
        ]
      : []),
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="block max-w-[260px] truncate text-[var(--st-ink-soft)]" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    },
    ...(isBranch
      ? [
          {
            accessorKey: "comment",
            header: "Comment",
            cell: ({ row }) =>
              row.original.comment ? (
                <span className="block max-w-[200px] truncate text-[12.5px] text-[var(--st-ink-soft)]" title={row.original.comment}>
                  {row.original.comment}
                </span>
              ) : (
                <span className="text-[var(--st-ink-faint)]">—</span>
              ),
          } as ColumnDef<ExpenseClaim>,
        ]
      : [
          {
            accessorKey: "staff",
            header: "Staff",
            cell: ({ row }) => <span className="whitespace-nowrap">{row.original.staff}</span>,
          } as ColumnDef<ExpenseClaim>,
        ]),
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={APPROVAL_TONE[row.original.status]}>
          {APPROVAL_LABEL[row.original.status]}
        </StatusBadge>
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
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => {
        const claim = row.original;
        const pending = claim.status === "pending";
        return (
          <div className="st-row-action flex justify-end gap-1.5">
            {decidable && pending && (
              <>
                <DecisionAction claim={claim} next="approved" onConfirm={decide} />
                <DecisionAction claim={claim} next="rejected" onConfirm={decide} />
              </>
            )}
            <IconButton
              icon={Pencil}
              label={`Comment on ${claim.expense}`}
              tone="secondary"
              onClick={() => setEditing(claim)}
            />
            <DeleteClaimAction claim={claim} onConfirm={remove} />
          </div>
        );
      },
    },
  ];

  // The totals row must be exactly as wide as the columns above it.
  const labelSpan = isBranch ? 2 : 1;
  const trailingSpan = columns.length - labelSpan - 1;

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
            <Filter label="Status" htmlFor="ec-status">
              <Select id="ec-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value={ALL}>All statuses</option>
                {APPROVAL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {APPROVAL_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Filter>
            {isBranch && (
              <Filter label="Branch" htmlFor="ec-branch">
                <Select id="ec-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value={ALL}>All branches</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Filter>
            )}
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={filtered}
            searchFields={["expense", "branch", "staff", "description"]}
            searchPlaceholder="Search expense or description…"
            emptyState={{
              icon: ClipboardList,
              title: active ? "No requests match these filters" : emptyTitle,
              description: active ? "Widen or clear the filters above to see more." : emptyDescription,
            }}
            renderFooter={(shown) => (
              <>
                <td colSpan={labelSpan} className="font-semibold text-[var(--st-ink)]">
                  Total ({shown.length})
                </td>
                <td>
                  <Money strong>{formatMoney(shown.reduce((s, c) => s + c.amount, 0))}</Money>
                </td>
                <td colSpan={trailingSpan} />
              </>
            )}
          />
        </div>
      </SettingsCard>

      {editing && (
        <CommentDialog key={editing.id} claim={editing} onClose={() => setEditing(null)} onSave={saveComment} />
      )}
    </>
  );
}

function DecisionAction({
  claim,
  next,
  onConfirm,
}: {
  claim: ExpenseClaim;
  next: ApprovalStatus;
  onConfirm: (claim: ExpenseClaim, next: ApprovalStatus) => void;
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
          label={`${approving ? "Approve" : "Reject"} ${claim.expense} request`}
          tone="secondary"
        />
      }
      title={`${approving ? "Approve" : "Reject"} this ${claim.expense} request?`}
      consequence={
        approving
          ? `${formatMoney(claim.amount)} will be released to ${claim.scope === "branch" ? claim.branch : claim.staff}.`
          : `The request for ${formatMoney(claim.amount)} will be closed and nothing released. It can be raised again.`
      }
      confirmLabel={approving ? "Approve" : "Reject"}
      pendingLabel={approving ? "Approving…" : "Rejecting…"}
      tone={approving ? "primary" : "danger"}
      onConfirm={() => {
        onConfirm(claim, next);
        setOpen(false);
      }}
    />
  );
}

function DeleteClaimAction({
  claim,
  onConfirm,
}: {
  claim: ExpenseClaim;
  onConfirm: (claim: ExpenseClaim) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete ${claim.expense} request`} tone="secondary" />}
      title="Delete this request?"
      consequence={`The ${claim.expense} request for ${formatMoney(claim.amount)} will be removed. If it was already approved, the payment itself is unaffected — this removes the record of the request.`}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(claim);
        setOpen(false);
      }}
    />
  );
}

/**
 * Editing a claim means adding the decision comment; the amount is the
 * requester's and is shown read-only.
 *
 * The caller keys this on the claim's id, so switching rows remounts it and the
 * field initialises from the new claim. Syncing with an effect instead would
 * set state during render and cascade a second pass for nothing.
 */
function CommentDialog({
  claim,
  onClose,
  onSave,
}: {
  claim: ExpenseClaim;
  onClose: () => void;
  onSave: (claim: ExpenseClaim, comment: string) => void;
}) {
  const [comment, setComment] = React.useState(claim.comment ?? "");

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`Comment — ${claim.expense}`}
      description={`${formatMoney(claim.amount)} · ${claim.scope === "branch" ? claim.branch : claim.staff} · ${formatOpsDate(claim.date)}`}
      formId="claim-comment-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(claim, comment.trim());
        onClose();
      }}
      submitLabel="Save comment"
    >
      <Field label="Description" htmlFor="cc-description" help="As entered by the requester.">
        <TextInput id="cc-description" value={claim.description} readOnly disabled />
      </Field>
      <Field label="Comment" htmlFor="cc-comment" help="Why this was approved or rejected.">
        <textarea
          id="cc-comment"
          rows={3}
          className="st-control"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Field>
    </SettingsDialog>
  );
}
