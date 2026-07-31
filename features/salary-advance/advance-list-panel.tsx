"use client";

import * as React from "react";
import { toast } from "sonner";
import { approveAdvance, disburseAdvance, rejectAdvance } from "@/features/salary-advance/actions";
import type { ActionResult } from "@/lib/domain/action-result";
import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, Check, Eye, HandCoins, X } from "lucide-react";
import { Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { ConfirmDialog, SettingsDialog } from "@/components/settings/dialog";
import { Button, IconButton } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { advanceTotals, sumAdvances, type SalaryAdvance } from "@/types/salary-advance";
import {
  ADVANCE_SEARCH_FIELDS,
  ADVANCE_STATUS_LABEL,
  ADVANCE_TONE,
  alertColumn,
  branchColumn,
  chargeFeeColumn,
  customerColumn,
  dateColumn,
  formatAdvanceDate,
  interestColumn,
  loanAmountColumn,
  paidAmountColumn,
  phoneColumn,
  principalPlusInterestColumn,
  remainingColumn,
  statusColumn,
} from "@/features/salary-advance/shared";

export type AdvanceListVariant = "approved" | "active" | "repayment";

/**
 * Salary Advance → Approved, Active and Repayment.
 *
 * The same advance at three points in its life, so one component with three
 * column sets rather than three tables that would drift. Each variant declares
 * its columns and the matching totals row — the two have to agree on width, so
 * they are declared together.
 *
 * Nothing here computes money: principal + interest and the remaining balance
 * come from advanceTotals, and the totals row from sumAdvances, so a column and
 * its total can never disagree.
 */
export function AdvanceListPanel({
  advances,
  variant,
  title,
  description,
  emptyTitle,
  emptyDescription,
}: {
  advances: SalaryAdvance[];
  variant: AdvanceListVariant;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const rows = advances;
  const [viewing, setViewing] = React.useState<SalaryAdvance | null>(null);
  const [, startTransition] = React.useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message ?? "Something went wrong.");
    });
  }

  /*
   * View, and whatever decision this stage actually offers.
   *
   * The fixture version offered Delete on every row and an Edit that let
   * someone type in a paid amount. Neither survives contact with real data: an
   * advance is recovered by a payroll deduction that posts to the ledger, so
   * typing over the paid figure would put the advance at odds with 7020 Staff
   * Advance Receivable and with the payslip that took the money — and a
   * disbursed advance cannot be deleted at all, because there is a journal
   * entry behind it. There is no endpoint for either, deliberately.
   *
   * What replaces them is the decision each stage genuinely has: approve or
   * reject a request, disburse an approved one. §11 gives those to different
   * grants — HR approves, Finance disburses — and the server enforces it.
   */
  const actions: ColumnDef<SalaryAdvance> = {
    id: "actions",
    header: () => <span className="block text-right">Actions</span>,
    cell: ({ row }) => {
      const advance = row.original;

      return (
        <div className="st-row-action flex justify-end gap-1.5">
          <IconButton
            icon={Eye}
            label={`View ${advance.reference}`}
            tone="secondary"
            onClick={() => setViewing(advance)}
          />

          {advance.status === "requested" && (
            <>
              <DecisionAction
                advance={advance}
                decision="approve"
                onConfirm={() => run(() => approveAdvance(advance.id, advance.reference))}
              />
              <DecisionAction
                advance={advance}
                decision="reject"
                onConfirm={() => run(() => rejectAdvance(advance.id, advance.reference))}
              />
            </>
          )}

          {advance.status === "approved" && (
            <DecisionAction
              advance={advance}
              decision="disburse"
              onConfirm={() => run(() => disburseAdvance(advance.id, advance.reference))}
            />
          )}
        </div>
      );
    },
  };

  /*
   * Columns and the totals row are declared side by side per variant: the
   * footer's colSpans have to add up to the column count, and splitting them
   * apart is how that silently breaks.
   */
  const { columns, footer } = React.useMemo(() => {
    const money = (t: ReturnType<typeof sumAdvances>) => (
      <>
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
      </>
    );

    if (variant === "approved") {
      // 12 columns: 3 identity + 5 money + status + fee + date + actions.
      return {
        columns: [
          customerColumn, phoneColumn, branchColumn,
          loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
          statusColumn, chargeFeeColumn, dateColumn, actions,
        ] as ColumnDef<SalaryAdvance>[],
        footer: (shown: SalaryAdvance[]) => {
          const t = sumAdvances(shown);
          return (
            <>
              <td colSpan={3} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              {money(t)}
              <td />
              <td>
                <Money strong>{formatMoney(t.chargeFee)}</Money>
              </td>
              <td colSpan={2} />
            </>
          );
        },
      };
    }

    if (variant === "active") {
      // 12 columns: 2 identity + 5 money + status + fee + date + alert + actions.
      return {
        columns: [
          customerColumn, branchColumn,
          loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
          statusColumn, chargeFeeColumn, dateColumn, alertColumn, actions,
        ] as ColumnDef<SalaryAdvance>[],
        footer: (shown: SalaryAdvance[]) => {
          const t = sumAdvances(shown);
          return (
            <>
              <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
                Total ({shown.length})
              </td>
              {money(t)}
              <td />
              <td>
                <Money strong>{formatMoney(t.chargeFee)}</Money>
              </td>
              <td colSpan={3} />
            </>
          );
        },
      };
    }

    // repayment — 10 columns: 2 identity + 5 money + status + date + actions.
    return {
      columns: [
        customerColumn, branchColumn,
        loanAmountColumn, interestColumn, principalPlusInterestColumn, paidAmountColumn, remainingColumn,
        statusColumn, dateColumn, actions,
      ] as ColumnDef<SalaryAdvance>[],
      footer: (shown: SalaryAdvance[]) => {
        const t = sumAdvances(shown);
        return (
          <>
            <td colSpan={2} className="font-semibold text-[var(--st-ink)]">
              Total ({shown.length})
            </td>
            {money(t)}
            <td colSpan={3} />
          </>
        );
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `actions` closes over setters only
  }, [variant]);

  return (
    <>
      <SettingsCard title={`${title} (${rows.length})`} description={description} bodyClassName="pt-0 sm:pt-0">
        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={ADVANCE_SEARCH_FIELDS}
          searchPlaceholder="Search customer, reference or branch…"
          emptyState={{ icon: HandCoins, title: emptyTitle, description: emptyDescription }}
          renderFooter={footer}
        />
      </SettingsCard>

      {viewing && <ViewAdvanceDialog advance={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/**
 * One confirm dialog for all three decisions.
 *
 * The consequence text is the point: approving commits the company to paying
 * out, disbursing actually moves money out of the staff fund, and rejecting
 * closes the request. Each says which.
 */
function DecisionAction({
  advance,
  decision,
  onConfirm,
}: {
  advance: SalaryAdvance;
  decision: "approve" | "reject" | "disburse";
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const copy = {
    approve: {
      icon: Check,
      label: `Approve ${advance.reference}`,
      title: `Approve ${advance.reference}?`,
      consequence: `${formatMoney(advance.loanAmount)} will be cleared for ${advance.customerName}. Finance disburses it separately — approving does not move money.`,
      confirm: "Approve",
      pending: "Approving…",
      tone: "primary" as const,
    },
    reject: {
      icon: X,
      label: `Reject ${advance.reference}`,
      title: `Reject ${advance.reference}?`,
      consequence: `The request is closed and nothing is paid. ${advance.customerName} can raise another.`,
      confirm: "Reject",
      pending: "Rejecting…",
      tone: "danger" as const,
    },
    disburse: {
      icon: Banknote,
      label: `Disburse ${advance.reference}`,
      title: `Disburse ${advance.reference}?`,
      consequence: `${formatMoney(advance.loanAmount)} leaves the staff fund and is recovered from ${advance.customerName}'s payslips and recovered from their payslips.`,
      confirm: "Disburse",
      pending: "Disbursing…",
      tone: "primary" as const,
    },
  }[decision];

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<IconButton icon={copy.icon} label={copy.label} tone="secondary" />}
      title={copy.title}
      consequence={copy.consequence}
      confirmLabel={copy.confirm}
      pendingLabel={copy.pending}
      tone={copy.tone}
      onConfirm={() => {
        onConfirm();
        setOpen(false);
      }}
    />
  );
}

function ViewAdvanceDialog({
  advance,
  onClose,
}: {
  advance: SalaryAdvance | null;
  onClose: () => void;
}) {
  if (!advance) return null;
  const { principalPlusInterest, remaining } = advanceTotals(advance);
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: "Reference", value: advance.reference, mono: true },
    { label: "Customer", value: advance.customerName },
    { label: "Phone", value: advance.phone, mono: true },
    { label: "Branch", value: advance.branch },
    { label: "Category", value: advance.categoryName },
    { label: "Date", value: formatAdvanceDate(advance.date), mono: true },
    { label: "Loan amount", value: formatMoney(advance.loanAmount), mono: true },
    { label: "Interest", value: formatMoney(advance.interest), mono: true },
    { label: "Principal + interest", value: formatMoney(principalPlusInterest), mono: true },
    { label: "Paid amount", value: formatMoney(advance.paidAmount), mono: true },
    { label: "Remaining amount", value: formatMoney(remaining), mono: true },
    { label: "Charge fee", value: formatMoney(advance.chargeFee), mono: true },
  ];

  return (
    <SettingsDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={advance.customerName}
      description={`${advance.reference} · ${advance.categoryName}`}
      size="lg"
      footer={
        <Button type="button" tone="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={ADVANCE_TONE[advance.status]}>{ADVANCE_STATUS_LABEL[advance.status]}</StatusBadge>
        {advance.overdueDays > 0 && (
          <StatusBadge tone={advance.overdueDays >= 14 ? "danger" : "warning"}>
            {advance.overdueDays} day{advance.overdueDays === 1 ? "" : "s"} late
          </StatusBadge>
        )}
      </div>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--st-ink-faint)]">
              {fact.label}
            </dt>
            <dd className={`mt-0.5 text-[13.5px] text-[var(--st-ink)] ${fact.mono ? "font-tabular" : ""}`}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </SettingsDialog>
  );
}

/**
 * Edit, on an active advance.
 *
 * Only the paid amount is editable — it is the figure an officer corrects when
 * a receipt is reconciled. The principal, interest and fee were set when the
 * advance was priced and are not re-priced here, and the remaining balance
 * stays derived, so a correction cannot put a row out of step with itself.
 */
/*
 * EditPaidDialog is gone. It let someone type a paid amount over an advance's
 * balance, which only made sense against a fixture: recovery is a payroll
 * deduction that posts to 7020 Staff Advance Receivable, so a hand-typed
 * figure would put this screen at odds with both the payslip that took the
 * money and the ledger that recorded it. The Salary Advance Repayment screen
 * shows what was actually recovered, instalment by instalment.
 */
