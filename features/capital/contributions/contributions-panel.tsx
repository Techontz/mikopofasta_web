"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Wallet } from "lucide-react";
import { SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsDialog } from "@/components/settings/dialog";
import { ActionButtons, Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import {
  CapitalContributionInputSchema,
  PAY_METHODS,
  PAY_METHOD_LABELS,
  type CapitalContribution,
  type CapitalContributionInput,
  type CapitalTotals,
  type Shareholder,
} from "@/types/capital";
import { deleteCapital, recordCapital } from "@/features/capital/actions";

const RECORDED_AT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const EMPTY: CapitalContributionInput = {
  shareholderId: "",
  amount: 0,
  payMethod: "cash",
  receiptNo: "",
  chequeNo: "",
};

/**
 * Capital → Add Capitals.
 *
 * Form above, table below, and the table is grouped by shareholder with the
 * two totals beneath — the legacy screen's arrangement, kept because it is how
 * the figures are read: each holder's payments together, then the two answers.
 */
export function ContributionsPanel({
  shareholders,
  contributions,
  totals,
}: {
  shareholders: Shareholder[];
  contributions: CapitalContribution[];
  totals: CapitalTotals;
}) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CapitalContributionInput>({
    resolver: zodResolver(CapitalContributionInputSchema),
    defaultValues: EMPTY,
  });

  const payMethod = useWatch({ control, name: "payMethod" });

  function onSubmit(values: CapitalContributionInput) {
    startTransition(async () => {
      const result = await recordCapital(values);
      if (result.ok) {
        toast.success(result.message);
        reset(EMPTY);
      } else {
        toast.error(result.message);
      }
    });
  }

  // Grouped in the order the API returned them, which is by shareholder.
  const groups = React.useMemo(() => {
    const byHolder = new Map<string, { name: string; rows: CapitalContribution[] }>();
    for (const row of contributions) {
      const group = byHolder.get(row.shareholderId) ?? { name: row.shareholderName, rows: [] };
      group.rows.push(row);
      byHolder.set(row.shareholderId, group);
    }
    return [...byHolder.entries()].map(([id, g]) => ({ id, ...g }));
  }, [contributions]);

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Add Capital"
        description="Money paid into the company by a shareholder. Each entry posts to the ledger against account 1000."
        footer={
          <Button type="submit" form="capital-form" tone="primary" loading={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        }
      >
        <form id="capital-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Field order is the legacy form's. */}
          <FieldGrid columns={3}>
            <Field label="Share Holder Name" htmlFor="cap-holder" required error={errors.shareholderId?.message}>
              <Select id="cap-holder" invalid={!!errors.shareholderId} {...register("shareholderId")}>
                <option value="">Select Share Holder</option>
                {shareholders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount" htmlFor="cap-amount" required error={errors.amount?.message}>
              <TextInput
                id="cap-amount"
                type="number"
                min="0"
                inputMode="decimal"
                suffix="TZS"
                placeholder="Amount"
                invalid={!!errors.amount}
                {...register("amount", { valueAsNumber: true })}
              />
            </Field>
            <Field
              label="Pay Method"
              htmlFor="cap-method"
              required
              error={errors.payMethod?.message}
              help={payMethod === "cash" ? "Lands in the head-office till." : "Lands in the bank account."}
            >
              <Select id="cap-method" invalid={!!errors.payMethod} {...register("payMethod")}>
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAY_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label="Receipt no" htmlFor="cap-receipt" error={errors.receiptNo?.message}>
              <TextInput id="cap-receipt" placeholder="Receipt" {...register("receiptNo")} />
            </Field>
            <Field
              label="Cheque Number"
              htmlFor="cap-cheque"
              required={payMethod === "cheque"}
              error={errors.chequeNo?.message}
              help={payMethod === "cheque" ? undefined : "Only needed when the pay method is cheque."}
            >
              <TextInput id="cap-cheque" placeholder="Cheque number" invalid={!!errors.chequeNo} {...register("chequeNo")} />
            </Field>
          </FieldGrid>
        </form>
      </SettingsCard>

      <SettingsCard title="Capital" bodyClassName="px-0 sm:px-0 pb-0 sm:pb-0">
        {contributions.length === 0 ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <EmptyState
              icon={Wallet}
              title="No capital recorded yet"
              description="Use the form above to record the first contribution."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th>S/No</th>
                  <th>Share Holder</th>
                  <th>Amount</th>
                  <th>Pay method</th>
                  <th>Receipt no</th>
                  <th>Chaque no</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {groups.map((group, groupIndex) => (
                  <React.Fragment key={group.id}>
                    {/* The holder's name heads their block, then their payments. */}
                    <tr>
                      <td className="font-tabular text-[var(--st-ink-faint)]">{groupIndex + 1}.</td>
                      <td className="font-medium text-[var(--st-ink)]">{group.name}</td>
                      <td colSpan={6} />
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.id}>
                        <td />
                        <td />
                        <td className="font-tabular whitespace-nowrap">{formatMoney(row.amount)}</td>
                        <td>
                          <StatusBadge tone="neutral" dot={false}>
                            {row.payMethodLabel}
                          </StatusBadge>
                        </td>
                        <td>{row.receiptNo ?? "-"}</td>
                        <td>{row.chequeNo ?? "-"}</td>
                        <td className="font-tabular whitespace-nowrap">
                          {row.createdAt ? RECORDED_AT.format(new Date(row.createdAt)) : "-"}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <DeleteCapitalDialog contribution={row} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                <tr style={{ background: "var(--st-subtle)" }}>
                  <td colSpan={2} className="font-semibold uppercase tracking-wide text-[12px]">
                    Share Holder Capital
                  </td>
                  <td colSpan={6} className="font-tabular font-semibold">
                    {formatMoney(totals.shareholderCapital)}
                  </td>
                </tr>
                <tr style={{ background: "var(--st-subtle)" }}>
                  <td colSpan={2} className="font-semibold uppercase tracking-wide text-[12px]">
                    Total Company Capital
                  </td>
                  <td colSpan={6} className="font-tabular font-semibold">
                    {formatMoney(totals.companyCapital)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      {/*
        The two totals answer different questions — what shareholders paid in,
        and what account 1000 holds. Saying so beats leaving a reader to wonder
        why they differ.
      */}
      {totals.shareholderCapital !== totals.companyCapital && (
        <p className="st-field-help">
          Share Holder Capital is the sum of the payments above. Total Company Capital is the balance of ledger
          account 1000. A difference between them is a reconciliation item, not an error in either figure.
        </p>
      )}
    </div>
  );
}

function DeleteCapitalDialog({ contribution }: { contribution: CapitalContribution }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteCapital(contribution.id);
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
          icon={Trash2}
          tone="secondary"
          label={`Remove ${formatMoney(contribution.amount)} from ${contribution.shareholderName}`}
        />
      }
      title="Remove this capital entry?"
      description={`${formatMoney(contribution.amount)} from ${contribution.shareholderName}. The ledger entry is reversed, not deleted — the money will still show as having arrived and then left.`}
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" tone="danger" onClick={onDelete} loading={pending}>
            {pending ? "Removing…" : "Remove and reverse"}
          </Button>
        </ActionButtons>
      }
    >
      <></>
    </SettingsDialog>
  );
}
