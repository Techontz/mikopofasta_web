"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Eye, Landmark, Pencil, Plus, RotateCcw } from "lucide-react";
import { Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextArea, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  ACCOUNT_STATUSES,
  BankAccountInputSchema,
  CURRENCIES,
  type BankAccountInput,
  type BankAccountRecord,
} from "@/types/bank";
import { saveBankAccount } from "@/features/bank/actions";
import type { ActionResult } from "@/lib/domain/action-result";
import { ACCOUNT_TONE, FactGrid, formatDate, type Fact } from "@/features/bank/shared";

const EMPTY: BankAccountInput = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  branch: "",
  currency: "TZS",
  openingBalance: 0,
  status: "active",
  description: "",
};

/**
 * Bank → Register Account.
 *
 * Register form above, the register itself below — the arrangement the original
 * screen uses, and the one the Share Holder page established. Editing reuses
 * the form in place rather than opening a second copy of the same eight fields.
 *
 * Every mutation goes through a Server Action and the list re-renders from what
 * the server sends back. It is not edited locally as well: registering an
 * account posts an opening balance to the ledger, and a row showing a balance
 * this component invented would disagree with the one the ledger holds.
 *
 * `bankNames` and `branches` are passed in rather than read from a constant, so
 * the two selects offer what the company actually has.
 */
export function RegisterAccountPanel({
  accounts,
  bankNames,
  branches,
}: {
  accounts: BankAccountRecord[];
  bankNames: string[];
  branches: string[];
}) {
  const rows = accounts;
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState<BankAccountRecord | null>(null);
  const [viewing, setViewing] = React.useState<BankAccountRecord | null>(null);
  const formRef = React.useRef<HTMLDivElement>(null);

  const defaults: BankAccountInput = editing
    ? {
        bankName: editing.bankName,
        accountName: editing.accountName,
        accountNumber: editing.accountNumber,
        branch: editing.branch,
        currency: editing.currency,
        openingBalance: editing.openingBalance,
        status: editing.status,
        description: editing.description ?? "",
      }
    : EMPTY;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountInput>({ resolver: zodResolver(BankAccountInputSchema), defaultValues: defaults });

  // Selecting a different account to edit must repopulate the fields.
  React.useEffect(() => {
    reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults derives from `editing`
  }, [editing?.id]);

  function startEdit(account: BankAccountRecord) {
    setEditing(account);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Something went wrong.");
      }
    });
  }

  function onSubmit(values: BankAccountInput) {
    const id = editing?.id;

    run(
      () => saveBankAccount(values, id),
      () => {
        if (id) setEditing(null);
        else reset(EMPTY);
      }
    );
  }

  /*
   * Deactivating goes through the same save as any other edit, because it is
   * one: the backend takes the account's chart row out of service with it, so
   * a deactivated account genuinely cannot be posted to.
   */
  function setStatus(account: BankAccountRecord, status: BankAccountRecord["status"]) {
    run(() =>
      saveBankAccount(
        {
          bankName: account.bankName,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          branch: account.branch,
          currency: account.currency,
          openingBalance: account.openingBalance,
          status,
          description: account.description ?? "",
        },
        account.id
      )
    );
  }

  const columns: ColumnDef<BankAccountRecord>[] = [
    {
      id: "sno",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-faint)]">{row.index + 1}.</span>,
    },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => <span className="font-medium text-[var(--st-ink)]">{row.original.bankName}</span>,
    },
    { accessorKey: "accountName", header: "Account Name" },
    {
      accessorKey: "accountNumber",
      header: "Account Number",
      cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.accountNumber}</span>,
    },
    { accessorKey: "branch", header: "Branch" },
    {
      accessorKey: "currency",
      header: "Currency",
      cell: ({ row }) => (
        <StatusBadge tone="neutral" dot={false}>
          {row.original.currency}
        </StatusBadge>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <span className="block text-right">Balance</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.balance)}</Money>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={ACCOUNT_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Eye}
            label={`View ${row.original.accountName}`}
            tone="secondary"
            onClick={() => setViewing(row.original)}
          />
          <IconButton
            icon={Pencil}
            label={`Edit ${row.original.accountName}`}
            tone="secondary"
            onClick={() => startEdit(row.original)}
          />
          <ToggleStatusAction account={row.original} onConfirm={setStatus} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <SettingsCard
          title={editing ? `Edit ${editing.accountName}` : "Register Bank Account"}
          description={
            editing
              ? "Correcting an existing account. The account number identifies it at the bank, so change it only if it was mistyped."
              : "A bank account the company holds. Its opening balance is the position on the day it is registered."
          }
          footer={
            <>
              {editing && (
                <Button type="button" tone="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              )}
              <Button type="button" tone="secondary" icon={RotateCcw} onClick={() => reset(defaults)}>
                Reset
              </Button>
              <Button type="submit" form="bank-account-form" tone="primary" icon={editing ? undefined : Plus} loading={isSubmitting || pending}>
                {editing ? "Save changes" : "Save"}
              </Button>
            </>
          }
        >
          <form id="bank-account-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FieldGrid columns={3}>
              <Field label="Bank Name" htmlFor="ba-bank" required error={errors.bankName?.message}>
                <Select id="ba-bank" invalid={!!errors.bankName} {...register("bankName")}>
                  <option value="">Select bank</option>
                  {bankNames.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Account Name" htmlFor="ba-name" required error={errors.accountName?.message}>
                <TextInput id="ba-name" invalid={!!errors.accountName} {...register("accountName")} />
              </Field>
              <Field
                label="Account Number"
                htmlFor="ba-number"
                required
                error={errors.accountNumber?.message}
                help="Digits and dashes, as printed on the statement."
              >
                <TextInput
                  id="ba-number"
                  inputMode="numeric"
                  invalid={!!errors.accountNumber}
                  {...register("accountNumber")}
                />
              </Field>
            </FieldGrid>

            <FieldGrid columns={3}>
              <Field label="Branch" htmlFor="ba-branch" required error={errors.branch?.message}>
                <Select id="ba-branch" invalid={!!errors.branch} {...register("branch")}>
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency" htmlFor="ba-currency" required error={errors.currency?.message}>
                <Select id="ba-currency" invalid={!!errors.currency} {...register("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Opening Balance"
                htmlFor="ba-opening"
                required
                error={errors.openingBalance?.message}
                help="The position on the day the account is registered."
              >
                <TextInput
                  id="ba-opening"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  prefix="TSh"
                  invalid={!!errors.openingBalance}
                  {...register("openingBalance", { valueAsNumber: true })}
                />
              </Field>
            </FieldGrid>

            <FieldGrid columns={2}>
              <Field label="Status" htmlFor="ba-status" required error={errors.status?.message}>
                <Select id="ba-status" invalid={!!errors.status} {...register("status")}>
                  {ACCOUNT_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Description"
                htmlFor="ba-description"
                error={errors.description?.message}
                help="Optional. What this account is used for."
              >
                <TextArea id="ba-description" rows={3} invalid={!!errors.description} {...register("description")} />
              </Field>
            </FieldGrid>
          </form>
        </SettingsCard>
      </div>

      <SettingsCard
        title={`Registered Accounts (${rows.length})`}
        description="Every bank account the company holds, across all branches."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["bankName", "accountName", "accountNumber", "branch"]}
          searchPlaceholder="Search bank or account…"
          emptyState={{
            icon: Landmark,
            title: "No accounts registered yet",
            description: "Register the first bank account using the form above.",
          }}
        />
      </SettingsCard>

      <ViewAccountDialog account={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

/**
 * Deactivate is reversible and does not delete, so the confirmation says which
 * of the two it is — a dialog that only asks "are you sure?" makes the reader
 * guess whether the row is about to disappear.
 */
function ToggleStatusAction({
  account,
  onConfirm,
}: {
  account: BankAccountRecord;
  onConfirm: (account: BankAccountRecord, status: BankAccountRecord["status"]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const deactivating = account.status === "active";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <IconButton
          icon={deactivating ? Ban : CheckCircle2}
          label={`${deactivating ? "Deactivate" : "Reactivate"} ${account.accountName}`}
          tone="secondary"
        />
      }
      title={`${deactivating ? "Deactivate" : "Reactivate"} ${account.accountName}?`}
      consequence={
        deactivating
          ? "The account stays in the register with its balance intact and stops being offered for new transactions. You can reactivate it at any time."
          : "The account will be offered again when recording transactions and transfers."
      }
      confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
      pendingLabel={deactivating ? "Deactivating…" : "Reactivating…"}
      tone={deactivating ? "danger" : "primary"}
      onConfirm={() => {
        onConfirm(account, deactivating ? "inactive" : "active");
        setOpen(false);
      }}
    />
  );
}

function ViewAccountDialog({
  account,
  onClose,
}: {
  account: BankAccountRecord | null;
  onClose: () => void;
}) {
  if (!account) return null;
  const facts: Fact[] = [
    { label: "Bank", value: account.bankName },
    { label: "Account name", value: account.accountName },
    { label: "Account number", value: account.accountNumber, mono: true },
    { label: "Branch", value: account.branch },
    { label: "Currency", value: account.currency },
    { label: "Opening balance", value: formatMoney(account.openingBalance), mono: true },
    { label: "Current balance", value: formatMoney(account.balance), mono: true },
    { label: "Today's deposit", value: formatMoney(account.todayDeposit), mono: true },
    { label: "Today's withdrawal", value: formatMoney(account.todayWithdrawal), mono: true },
    { label: "Status", value: account.status, tone: ACCOUNT_TONE[account.status] },
    ...(account.description
      ? [{ label: "Description", value: account.description, wide: true } satisfies Fact]
      : []),
  ];

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={account.accountName}
      description={`${account.bankName} · ${account.branch}`}
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

/** Re-exported so pages can render a consistent "last updated" line. */
export { formatDate };
