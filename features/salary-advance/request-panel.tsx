"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { approveAdvance, raiseAdvanceRequest, rejectAdvance } from "@/features/salary-advance/actions";
import type { ActionResult } from "@/lib/domain/action-result";
import type { SalaryAdvanceCategoryRecord } from "@/lib/api/salary-advance";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, HandCoins, RotateCcw, Send, Trash2 } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog } from "@/components/settings/dialog";
import { Button, Field, FieldGrid, IconButton, Select, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  SalaryAdvanceRequestInputSchema,
  sumAdvances,
  type SalaryAdvance,
  type SalaryAdvanceRequestInput,
} from "@/types/salary-advance";
import {
  ADVANCE_SEARCH_FIELDS,
  branchColumn,
  customerColumn,
  dateColumn,
  interestColumn,
  loanAmountColumn,
  paidAmountColumn,
  principalPlusInterestColumn,
  remainingColumn,
  statusColumn,
} from "@/features/salary-advance/shared";

const EMPTY: SalaryAdvanceRequestInput = {
  branch: "",
  customerName: "",
  categoryId: "",
  loanAmount: 0,
};

/**
 * Salary Advance → Salary Advance Request.
 *
 * Two sections, as the original screen has: the request form, then the advances
 * already requested. Raising one here does not release money — it queues the
 * request for a decision, which is why the table's actions are Approve and
 * Delete rather than anything that pays out.
 */
export function RequestPanel({
  advances,
  categories,
  staff,
}: {
  advances: SalaryAdvance[];
  categories: SalaryAdvanceCategoryRecord[];
  /** Real employees, from the staff register — an advance is staff, not customer. */
  staff: { id: string; name: string; branch: string }[];
}) {
  /*
   * The branch picker offers the branches staff are actually posted to, taken
   * from the register itself rather than a fixed list — a fixed one goes stale
   * the first time a branch opens.
   */
  const branches = React.useMemo(
    () => [...new Set(staff.map((member) => member.branch).filter(Boolean))].sort(),
    [staff],
  );

  const rows = advances;
  const [, startTransition] = React.useTransition();

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SalaryAdvanceRequestInput>({
    resolver: zodResolver(SalaryAdvanceRequestInputSchema),
    defaultValues: EMPTY,
  });

  /* useWatch, not watch(): the latter returns a fresh function the React
     Compiler cannot memoize, so it opts the whole component out. */
  const branch = useWatch({ control, name: "branch" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const loanAmount = useWatch({ control, name: "loanAmount" });

  // The customer list narrows to the chosen branch — an advance is raised where
  // the customer is served, and offering all of them invites a mismatched pair.
  const customers = staff.filter((c) => branch === "" || c.branch === branch);
  const category = categories.find((c) => c.id === categoryId);

  /*
   * Interest is previewed live from the chosen category, so the officer sees
   * what the customer will owe before submitting rather than after. The figure
   * is derived here exactly as the table derives it.
   */
  const preview =
    category && loanAmount > 0
      ? {
          interest: Math.round((loanAmount * category.interestRate) / 100),
          fee: category.chargeFee,
          inRange: loanAmount >= category.fromAmount && loanAmount <= category.toAmount,
        }
      : null;

  /*
   * The category is NOT sent. The server prices the advance by the band the
   * amount falls into — letting the requester choose would let them choose
   * their own interest rate, and two people borrowing the same amount would be
   * on different terms. The picker below is a preview of what that band will
   * be, which is why it is shown but not submitted.
   */
  function onSubmit(values: SalaryAdvanceRequestInput) {
    const member = staff.find((c) => c.name === values.customerName);

    if (member === undefined) {
      toast.error("Choose a staff member.");

      return;
    }

    run(
      () => raiseAdvanceRequest({ staffProfileId: member.id, amount: values.loanAmount }),
      () => reset(EMPTY),
    );
  }

  function approve(advance: SalaryAdvance) {
    run(() => approveAdvance(advance.id, advance.reference));
  }

  /*
   * Reject, not delete. A request that has been raised is a decision someone
   * has to make, and there is no endpoint that removes one — rejecting closes
   * it and leaves the record, which is what an audit trail is for.
   */
  function reject(advance: SalaryAdvance) {
    run(() => rejectAdvance(advance.id, advance.reference));
  }

  const columns: ColumnDef<SalaryAdvance>[] = [
    customerColumn,
    branchColumn,
    loanAmountColumn,
    interestColumn,
    principalPlusInterestColumn,
    paidAmountColumn,
    remainingColumn,
    statusColumn,
    dateColumn,
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end gap-1.5">
          <ApproveAction advance={row.original} onConfirm={approve} />
          <DeleteAction advance={row.original} onConfirm={reject} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Request Salary Advance"
        description="Raise an advance for a customer. The category decides the interest and the charge fee — neither is entered by hand."
        footer={
          <>
            <Button type="button" tone="secondary" onClick={() => reset(EMPTY)}>
              Cancel
            </Button>
            <Button type="button" tone="secondary" icon={RotateCcw} onClick={() => reset(EMPTY)}>
              Reset
            </Button>
            <Button type="submit" form="advance-request-form" tone="primary" icon={Send} loading={isSubmitting}>
              Request
            </Button>
          </>
        }
      >
        <form id="advance-request-form" noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FieldGrid columns={2}>
            <Field label="Branch" htmlFor="sr-branch" required error={errors.branch?.message}>
              <Select id="sr-branch" invalid={!!errors.branch} {...register("branch")}>
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Customer"
              htmlFor="sr-customer"
              required
              error={errors.customerName?.message}
              help={
                branch === ""
                  ? "Choose a branch first."
                  : `${customers.length} customer${customers.length === 1 ? "" : "s"} at ${branch}.`
              }
            >
              <Select id="sr-customer" invalid={!!errors.customerName} {...register("customerName")}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FieldGrid>

          <FieldGrid columns={2}>
            <Field
              label="Salary Advance Category"
              htmlFor="sr-category"
              required
              error={errors.categoryId?.message}
              help={
                category
                  ? `${category.interestRate}% interest · ${formatMoney(category.chargeFee)} fee · ${formatMoney(category.fromAmount)}–${formatMoney(category.toAmount)}`
                  : undefined
              }
            >
              <Select id="sr-category" invalid={!!errors.categoryId} {...register("categoryId")}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Loan Amount"
              htmlFor="sr-amount"
              required
              error={errors.loanAmount?.message}
              /*
               * A soft warning, not a rule. The band is guidance for pricing and
               * an officer may knowingly step outside it, so the form says so
               * and still lets the request through.
               */
              help={
                preview
                  ? preview.inRange
                    ? `Interest ${formatMoney(preview.interest)} · fee ${formatMoney(preview.fee)} · repayable ${formatMoney(loanAmount + preview.interest)}`
                    : `Outside this category's ${formatMoney(category!.fromAmount)}–${formatMoney(category!.toAmount)} band.`
                  : undefined
              }
            >
              <TextInput
                id="sr-amount"
                type="number"
                step="any"
                inputMode="decimal"
                prefix="TSh"
                invalid={!!errors.loanAmount}
                {...register("loanAmount", { valueAsNumber: true })}
              />
            </Field>
          </FieldGrid>
        </form>
      </SettingsCard>

      <SettingsCard
        title={`Salary Advance Requested (${rows.length})`}
        description="Advances raised and waiting on a decision, and those already decided."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={ADVANCE_SEARCH_FIELDS}
          searchPlaceholder="Search customer or reference…"
          emptyState={{
            icon: HandCoins,
            title: "No advances requested yet",
            description: "Raise the first request using the form above.",
          }}
          renderFooter={(shown) => {
            const t = sumAdvances(shown);
            return (
              <>
                <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                  Total
                </td>
                <td>
                  <Money strong>{formatMoney(t.loanAmount)}</Money>
                </td>
                <td>
                  <Money strong>{formatMoney(t.interest)}</Money>
                </td>
                <td>
                  <Money strong>{formatMoney(t.principalPlusInterest)}</Money>
                </td>
                <td>
                  <Money strong>{formatMoney(t.paidAmount)}</Money>
                </td>
                <td>
                  <Money strong>{formatMoney(t.remaining)}</Money>
                </td>
                <td colSpan={3} />
              </>
            );
          }}
        />
      </SettingsCard>
    </div>
  );
}

function ApproveAction({
  advance,
  onConfirm,
}: {
  advance: SalaryAdvance;
  onConfirm: (advance: SalaryAdvance) => void;
}) {
  const [open, setOpen] = React.useState(false);

  /* Only a request still awaiting a decision can be approved. */
  if (advance.status !== "requested") {
    return (
      <IconButton icon={Check} tone="secondary" disabled label={`${advance.reference} is already ${advance.status}`} />
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Check} label={`Approve ${advance.reference}`} tone="secondary" />}
      title={`Approve ${advance.reference}?`}
      consequence={`${formatMoney(advance.loanAmount)} will be committed to ${advance.customerName}, repayable at ${formatMoney(advance.loanAmount + advance.interest)}. The request moves to the approved list.`}
      confirmLabel="Approve"
      pendingLabel="Approving…"
      tone="primary"
      onConfirm={() => {
        onConfirm(advance);
        setOpen(false);
      }}
    />
  );
}

function DeleteAction({
  advance,
  onConfirm,
}: {
  advance: SalaryAdvance;
  onConfirm: (advance: SalaryAdvance) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={Trash2} label={`Delete ${advance.reference}`} tone="secondary" />}
      title={`Delete ${advance.reference}?`}
      consequence={`The request for ${formatMoney(advance.loanAmount)} will be removed and nothing committed. ${advance.customerName} can be raised again.`}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      onConfirm={() => {
        onConfirm(advance);
        setOpen(false);
      }}
    />
  );
}
