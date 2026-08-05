"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Banknote, Check, Landmark, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { SettingsTable } from "@/components/settings/table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SettingsDialog } from "@/components/settings/dialog";
import { ActionButtons, Button, Field, IconButton, Select } from "@/components/settings/form";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import type { CashDeposit } from "@/types/accounting";
import type { UnbankedPayment } from "@/lib/api/accounting";
import { recordCashDeposit, reconcileCashDeposit } from "@/features/accounting/actions";
import { DepositStatusBadge, LedgerReference } from "@/features/accounting/shared";
import { formatDateTime } from "@/features/accounting/format";

export interface BankAccountOption {
  id: string;
  label: string;
}

/**
 * A teller banks the day's takings — the first half of §7's verification loop.
 *
 * The payments are picked from the live unbanked list rather than typed. The
 * amount is derived from what is ticked, because the reconciliation refuses any
 * mismatch outright: a teller who typed a different figure would only discover
 * it when Finance rejected the deposit.
 *
 * Nothing posts here. The cash was ledgered into the till at the counter and
 * does not move until the bank confirms receipt — recording it as banked on a
 * teller's say-so is the fraud the two trust states exist to prevent.
 */
export function CashDepositDialog({
  payments,
  bankAccounts,
  branchId,
}: {
  payments: UnbankedPayment[];
  bankAccounts: BankAccountOption[];
  /** The teller's own branch. §13 pins the deposit to it. */
  branchId: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [pending, startTransition] = useTransition();

  const total = React.useMemo(
    () => payments.filter((p) => selected.has(p.id)).reduce((sum, p) => sum + p.amount, 0),
    [payments, selected]
  );

  const canSubmit = selected.size > 0 && bankAccountId !== "" && branchId !== null && !pending;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setSelected(new Set());
    setBankAccountId("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (branchId === null) return;

    startTransition(async () => {
      const result = await recordCashDeposit({
        branchId,
        bankAccountId,
        amount: total,
        paymentIds: Array.from(selected),
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
          Bank cash
        </button>
      }
      title="Bank the day's cash"
      description="Select the payments this deposit covers. Finance verifies the total before anything moves."
      size="lg"
      formId="cash-deposit-form"
      onSubmit={onSubmit}
      pending={pending}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="cash-deposit-form" tone="primary" loading={pending} disabled={!canSubmit}>
            {pending ? "Recording…" : `Bank ${formatMoney(total)}`}
          </Button>
        </ActionButtons>
      }
    >
      {payments.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Nothing to bank"
          description="Every cash payment you have taken is already on a deposit."
          className="border-none"
        />
      ) : (
        <>
          <Field label="Bank account" htmlFor="deposit-bank-account" required>
            <Select
              id="deposit-bank-account"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
            >
              <option value="">Select an account…</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Payments"
            required
            help="The amount banked is the sum of what you tick. Finance refuses a deposit that does not match."
          >
            <div className="st-card max-h-64 divide-y divide-[var(--st-line)] overflow-y-auto">
              {payments.map((payment) => (
                <label
                  key={payment.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-[13px]"
                >
                  <Checkbox
                    checked={selected.has(payment.id)}
                    onCheckedChange={() => toggle(payment.id)}
                    aria-label={`Include ${payment.paymentReference}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--st-ink)]">
                      {payment.customerName ?? payment.paymentReference}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--st-ink-faint)]">
                      {payment.loanNumber ?? payment.paymentReference} · {formatDateTime(payment.receivedAt)}
                    </span>
                  </span>
                  <span className="font-tabular whitespace-nowrap text-[var(--st-ink)]">
                    {formatMoney(payment.amount)}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          <div
            className="st-card flex items-center justify-between px-4 py-3"
            style={{ background: "var(--st-subtle)" }}
          >
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--st-ink-faint)]">
              Amount banked
            </span>
            <span className="font-tabular text-[15px] font-semibold text-[var(--st-ink)]">
              {formatMoney(total)}
            </span>
          </div>
        </>
      )}
    </SettingsDialog>
  );
}

/**
 * Finance confirms a deposit — the transition nothing could previously make.
 *
 * Posts `Dr Bank · Cr Teller Cash` and moves every named payment to
 * `confirmed`. Asked as a confirmation because it is the moment a teller's word
 * becomes the bank's; the API still refuses a mismatch, so the dialog states
 * the figure being vouched for rather than only asking "are you sure".
 */
function ReconcileAction({ deposit, canReconcile }: { deposit: CashDeposit; canReconcile: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  if (deposit.status === "confirmed") {
    return <span className="text-[12px] text-[var(--st-ink-faint)]">Confirmed</span>;
  }

  function onConfirm() {
    startTransition(async () => {
      const result = await reconcileCashDeposit(deposit.id);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <IconButton
          icon={Check}
          tone="secondary"
          disabled={!canReconcile || pending}
          label={
            canReconcile
              ? `Confirm ${formatMoney(deposit.amount)} received`
              : "Only Finance can confirm a deposit"
          }
        />
      }
      title="Confirm this deposit?"
      description={`${formatMoney(deposit.amount)} from ${deposit.branchName ?? "the branch"} till, covering ${deposit.paymentIds.length} payment${deposit.paymentIds.length === 1 ? "" : "s"}. This posts Dr Bank · Cr Teller Cash and marks those payments confirmed.`}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" tone="primary" onClick={onConfirm} loading={pending}>
            {pending ? "Confirming…" : "Confirm receipt"}
          </Button>
        </ActionButtons>
      }
    >
      <p className="text-[13px] text-[var(--st-ink-soft)]">
        No income is recognised here — that happened when the teller took the money. This entry only moves it from
        the branch till to the bank.
      </p>
      {!deposit.hasSlip && (
        <p className="st-field-error" role="alert">
          No deposit slip was attached to this deposit.
        </p>
      )}
    </SettingsDialog>
  );
}

/** The reconciliation queue and its history. */
export function CashDepositTable({
  deposits,
  canReconcile,
}: {
  deposits: CashDeposit[];
  /** Whether this user holds `repayments.reconcile`. Finance does. */
  canReconcile: boolean;
}) {
  const columns: ColumnDef<CashDeposit>[] = [
    {
      accessorKey: "branchName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-[var(--st-ink)]">{row.original.branchName ?? "—"}</p>
          <p className="text-[12px] text-[var(--st-ink-faint)]">
            Banked by {row.original.tellerName ?? "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "bankAccountName",
      header: "Bank account",
      cell: ({ row }) => (
        <span className="text-[var(--st-ink-soft)]">{row.original.bankAccountName ?? "—"}</span>
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
      id: "payments",
      header: "Payments",
      cell: ({ row }) => (
        <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.paymentIds.length}</span>
      ),
    },
    {
      id: "slip",
      header: "Slip",
      cell: ({ row }) =>
        row.original.hasSlip ? (
          <span className="text-[12px] text-[var(--st-ink-soft)]">Attached</span>
        ) : (
          <span className="text-[12px] text-[var(--st-ink-faint)]">None</span>
        ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <DepositStatusBadge status={row.original.status} />,
    },
    {
      id: "audit",
      header: "Audit",
      cell: ({ row }) => (
        <div className="space-y-0.5 text-[12px] text-[var(--st-ink-faint)]">
          <p>Banked {formatDateTime(row.original.createdAt)}</p>
          {row.original.reconciledAt && <p>Confirmed {formatDateTime(row.original.reconciledAt)}</p>}
        </div>
      ),
    },
    {
      id: "ledger",
      header: "Ledger",
      cell: ({ row }) => (
        <LedgerReference
          journalEntryId={row.original.journalEntryId}
          absentLabel="Awaiting verification"
        />
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ReconcileAction deposit={row.original} canReconcile={canReconcile} />
        </div>
      ),
    },
  ];

  return (
    <SettingsTable
      columns={columns}
      data={deposits}
      searchFields={["branchName", "bankAccountName", "tellerName"]}
      searchPlaceholder="Search deposits…"
      emptyState={{
        icon: Landmark,
        title: "No deposits recorded",
        description:
          "A teller banks the day's cash and names the payments it covers; Finance verifies the total before anything moves.",
      }}
    />
  );
}
