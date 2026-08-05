"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { SettingsCard } from "@/components/settings";
import { ActionButtons, Button, Field, FieldGrid, Select, TextInput } from "@/components/settings/form";
import { raiseBankMovement } from "@/features/bank/actions";
import { TRANSACTION_TYPES, type TransactionType } from "@/types/bank";

/**
 * Raise a bank transaction for someone else to decide on.
 *
 * `raiseBankMovement` — and `POST /api/v1/bank-transactions` behind it — has
 * been available all along with nothing in the interface calling it. The Bank
 * Transaction screen could approve a request and reject a request, but there
 * was no way to make one, so the queue it decided on could only ever be filled
 * from outside the application. The screen's own reject copy gives the game
 * away: it tells the officer the requester "can raise it again", using a
 * control that did not exist.
 *
 * The two-person rule is the API's, not this form's: whoever raises a request
 * cannot be the one who approves it, and the decision buttons enforce that
 * server-side. This is only the asking half.
 */

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  charge: "Charge",
};

/** The API requires a branch on a deposit or a withdrawal — there is no till without one. */
const NEEDS_BRANCH: TransactionType[] = ["deposit", "withdrawal"];

export function RaiseTransactionForm({
  accounts,
  branches,
}: {
  accounts: { id: string; label: string }[];
  branches: { id: string; name: string }[];
}) {
  const [bankAccountId, setBankAccountId] = React.useState("");
  const [type, setType] = React.useState<TransactionType>("deposit");
  const [amount, setAmount] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = useTransition();

  const branchRequired = NEEDS_BRANCH.includes(type);
  const parsedAmount = Number(amount);
  const complete =
    bankAccountId !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    (!branchRequired || branchId !== "");

  function reset() {
    setBankAccountId("");
    setType("deposit");
    setAmount("");
    setBranchId("");
    setNote("");
  }

  return (
    <SettingsCard
      title="Raise a Transaction"
      description="Ask for money to move into or out of a bank account. It is held as pending until a second person decides on it."
    >
      <FieldGrid columns={3}>
        <Field label="Bank account" htmlFor="raise-account" className="sm:col-span-2">
          <Select
            id="raise-account"
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type" htmlFor="raise-type">
          <Select
            id="raise-type"
            value={type}
            onChange={(e) => {
              const next = e.target.value as TransactionType;
              setType(next);
              // A branch on a transfer or a charge is rejected by the API, so
              // clearing it here keeps the form from sending one.
              if (!NEEDS_BRANCH.includes(next)) setBranchId("");
            }}
          >
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Amount (TZS)" htmlFor="raise-amount">
          <TextInput
            id="raise-amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        {branchRequired && (
          <Field
            label="Branch"
            htmlFor="raise-branch"
            help="Required for a deposit or a withdrawal — it names the till."
          >
            <Select id="raise-branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Note" htmlFor="raise-note" className="sm:col-span-3">
          <TextInput
            id="raise-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What this is for — the approver reads this."
          />
        </Field>
      </FieldGrid>

      <ActionButtons className="mt-4">
        <Button tone="ghost" onClick={reset} disabled={pending}>
          Clear
        </Button>
        <Button
          tone="primary"
          icon={Plus}
          loading={pending}
          disabled={pending || !complete}
          onClick={() =>
            startTransition(async () => {
              const result = await raiseBankMovement({
                bankAccountId,
                type,
                amount: parsedAmount,
                ...(branchRequired ? { branchId } : {}),
                note: note.trim() === "" ? null : note.trim(),
              });
              if (result.ok) {
                toast.success(result.message);
                reset();
              } else {
                toast.error(result.message);
              }
            })
          }
        >
          Raise Request
        </Button>
      </ActionButtons>
    </SettingsCard>
  );
}
