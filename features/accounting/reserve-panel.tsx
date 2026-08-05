"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, PiggyBank, Plus, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SettingsDialog } from "@/components/settings/dialog";
import {
  ActionButtons,
  Button,
  Field,
  FieldGrid,
  IconButton,
  Select,
  TextArea,
  TextInput,
} from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  RESERVE_PURPOSES,
  RESERVE_PURPOSE_LABELS,
  type ReservePurpose,
  type ReserveUtilisation,
} from "@/types/accounting";
import {
  approveReserveUtilisation,
  rejectReserveUtilisation,
  requestReserveUtilisation,
} from "@/features/accounting/actions";
import { LedgerReference, ReserveStatusBadge } from "@/features/accounting/shared";
import { formatDateTime } from "@/features/accounting/format";

/** A branch the requester may name, supplied live from the API. */
export interface BranchOption {
  id: string;
  name: string;
}

/**
 * Raise a use of the Reserve — Decision Register D1.
 *
 * Nothing posts here. D1 requires Admin approval before reserve leaves the
 * fund, so a request is a row and only a decision is a posting.
 *
 * There is no destination account to pick, which is the part worth explaining
 * on screen: every purpose posts `Dr Reserve · Cr Capital`. The reserve is a
 * control account holding no cash, so releasing it un-reserves equity, and the
 * branch or department is then funded from capital.
 */
export function ReserveRequestDialog({ branches }: { branches: BranchOption[] }) {
  const [open, setOpen] = React.useState(false);
  const [purpose, setPurpose] = React.useState<ReservePurpose>("return_to_capital");
  const [amount, setAmount] = React.useState("");
  const [narrative, setNarrative] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [pending, startTransition] = useTransition();

  const needsBranch = purpose === "new_branch";
  const amountValue = Number(amount);
  const amountError =
    amount.trim() === ""
      ? undefined
      : !Number.isFinite(amountValue) || amountValue <= 0
        ? "Enter an amount greater than zero."
        : undefined;

  const narrativeError =
    narrative.trim() === "" || narrative.trim().length >= 10
      ? undefined
      : "Explain what the reserve is being used for.";

  const canSubmit =
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    narrative.trim().length >= 10 &&
    (!needsBranch || branchId !== "") &&
    !pending;

  function reset() {
    setPurpose("return_to_capital");
    setAmount("");
    setNarrative("");
    setBranchId("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await requestReserveUtilisation({
        purpose,
        amount: amountValue,
        narrative: narrative.trim(),
        targetBranchId: needsBranch ? branchId : undefined,
      });

      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      trigger={
        <button type="button" className="st-btn st-btn-primary">
          <Plus className="size-4" aria-hidden />
          Request reserve
        </button>
      }
      title="Request a use of the Reserve"
      description="Raised for Admin approval. Nothing leaves the fund until it is approved."
      formId="reserve-request-form"
      onSubmit={onSubmit}
      submitLabel="Raise request"
      pendingLabel="Raising…"
      pending={pending}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="reserve-request-form" tone="primary" loading={pending} disabled={!canSubmit}>
            {pending ? "Raising…" : "Raise request"}
          </Button>
        </ActionButtons>
      }
    >
      <FieldGrid columns={2}>
        <Field label="Purpose" htmlFor="reserve-purpose" required>
          <Select
            id="reserve-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as ReservePurpose)}
          >
            {RESERVE_PURPOSES.map((value) => (
              <option key={value} value={value}>
                {RESERVE_PURPOSE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Amount" htmlFor="reserve-amount" required error={amountError}>
          <TextInput
            id="reserve-amount"
            inputMode="decimal"
            prefix="TZS"
            value={amount}
            invalid={Boolean(amountError)}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
      </FieldGrid>

      {needsBranch && (
        <Field
          label="Branch"
          htmlFor="reserve-branch"
          required
          help="Recorded against the request. The posting stays company-wide — capital is not held by a branch."
        >
          <Select id="reserve-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Select a branch…</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        label="Narrative"
        htmlFor="reserve-narrative"
        required
        error={narrativeError}
        help="D1 requires every reserve movement to be fully audited. This is the record of why."
      >
        <TextArea
          id="reserve-narrative"
          rows={3}
          value={narrative}
          invalid={Boolean(narrativeError)}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="What is the reserve being used for?"
        />
      </Field>

      <p className="st-field-help">
        Approval posts <span className="font-tabular">Dr Reserve · Cr Capital</span>. The reserve holds no cash of
        its own, so a release returns it to capital, and the spending then happens through the normal path.
      </p>
    </SettingsDialog>
  );
}

/**
 * Approve / reject, offered only while a request is pending.
 *
 * The API refuses a decision by whoever raised it (§14), so a requester looking
 * at their own row sees the same disabled state the server would enforce —
 * rather than a button that fails when pressed.
 */
function ReserveDecisionActions({
  request,
  currentUserId,
  canApprove,
}: {
  request: ReserveUtilisation;
  currentUserId: string;
  canApprove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const isOwn = request.requestedBy === currentUserId;
  const blocked = isOwn || !canApprove;

  const blockedLabel = isOwn
    ? "You raised this request, so someone else must decide it"
    : "Only Admin can release reserve";

  function onApprove() {
    startTransition(async () => {
      const result = await approveReserveUtilisation(request.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function onReject() {
    startTransition(async () => {
      const result = await rejectReserveUtilisation(request.id, reason);
      if (result.ok) {
        toast.success(result.message);
        setRejecting(false);
        setReason("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex justify-end gap-1.5">
      <IconButton
        icon={Check}
        tone="secondary"
        disabled={pending || blocked}
        label={blocked ? blockedLabel : `Release ${formatMoney(request.amount)} to Capital`}
        onClick={onApprove}
      />

      <SettingsDialog
        open={rejecting}
        onOpenChange={setRejecting}
        trigger={
          <IconButton
            icon={X}
            tone="secondary"
            disabled={pending || blocked}
            label={blocked ? blockedLabel : "Reject this request"}
          />
        }
        title="Reject this reserve request?"
        description={`${formatMoney(request.amount)} — ${request.purposeLabel}. Nothing is posted and the fund is untouched.`}
        footer={
          <ActionButtons>
            <Button type="button" tone="secondary" onClick={() => setRejecting(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              tone="danger"
              onClick={onReject}
              loading={pending}
              disabled={reason.trim().length < 3}
            >
              {pending ? "Rejecting…" : "Reject"}
            </Button>
          </ActionButtons>
        }
      >
        <Field
          label="Reason"
          htmlFor="reserve-reject-reason"
          required
          help="Recorded against the request as the only account of the decision."
        >
          <TextArea
            id="reserve-reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being refused?"
          />
        </Field>
      </SettingsDialog>
    </div>
  );
}

/**
 * The reserve queue and its history in one table.
 *
 * One list rather than a pending screen and a history screen: a request moves
 * between the two by being decided, and splitting them would mean an approver
 * loses sight of a request the moment they act on it.
 */
export function ReserveTable({
  requests,
  currentUserId,
  canApprove,
}: {
  requests: ReserveUtilisation[];
  currentUserId: string;
  /** Whether this user holds `reserve.approve`. Admin does; Finance does not. */
  canApprove: boolean;
}) {
  const columns: ColumnDef<ReserveUtilisation>[] = [
    {
      accessorKey: "reference",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Reference" />,
      cell: ({ row }) => (
        <span className="font-tabular font-medium text-[var(--st-ink)]">{row.original.reference}</span>
      ),
    },
    {
      accessorKey: "purposeLabel",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Purpose" />,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="text-[var(--st-ink)]">{row.original.purposeLabel}</p>
          {row.original.targetBranchName && (
            <p className="text-[12px] text-[var(--st-ink-faint)]">{row.original.targetBranchName}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{formatMoney(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "narrative",
      header: "Narrative",
      cell: ({ row }) => (
        <p className="max-w-[26rem] text-[13px] text-[var(--st-ink-soft)]">{row.original.narrative}</p>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <div className="space-y-1">
          <ReserveStatusBadge status={row.original.status} />
          {row.original.decisionReason && (
            <p className="max-w-[18rem] text-[12px] text-[var(--st-ink-faint)]">{row.original.decisionReason}</p>
          )}
        </div>
      ),
    },
    {
      id: "audit",
      header: "Audit",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-[12px] text-[var(--st-ink-faint)]">
          <p>Raised by {row.original.requesterName ?? "—"}</p>
          <p>{formatDateTime(row.original.createdAt)}</p>
          {row.original.approverName && (
            <p>
              {row.original.status === "approved" ? "Approved" : "Rejected"} by {row.original.approverName} ·{" "}
              {formatDateTime(row.original.approvedAt)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "ledger",
      header: "Ledger",
      cell: ({ row }) => (
        <LedgerReference
          journalEntryId={row.original.journalEntryId}
          absentLabel={row.original.status === "pending" ? "Nothing posted yet" : "Not posted"}
        />
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <ReserveDecisionActions
            request={row.original}
            currentUserId={currentUserId}
            canApprove={canApprove}
          />
        ) : (
          <div className="flex justify-end">
            <span className="text-[12px] text-[var(--st-ink-faint)]">Decided</span>
          </div>
        ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={requests}
      searchFields={["reference", "narrative", "purposeLabel"]}
      searchPlaceholder="Search reserve requests…"
      emptyState={{
        icon: PiggyBank,
        title: "No reserve requests",
        description:
          "Reserve accumulates at each month-end close. Raise a request to release some of it back to capital.",
      }}
    />
  );
}
