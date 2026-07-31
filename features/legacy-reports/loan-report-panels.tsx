"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Ban, CircleX, FileText, Landmark, Printer, Receipt } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Button, IconButton } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import {
  ALL,
  BranchFilter,
  CollectionStatus,
  DateCell,
  FilterBar,
  Muted,
  Num,
  PeriodTabs,
  Primary,
  matchesBranch,
} from "./shared";
import {
  LEGACY_BRANCHWISE,
  LEGACY_BRANCHWISE_TOTALS,
  LEGACY_DEFAULT_LOANS,
  LEGACY_DEFAULT_LOAN_TOTALS,
  LEGACY_LOAN_COLLECTIONS,
  LEGACY_LOAN_COLLECTION_TOTALS,
  LEGACY_LOAN_REPAYMENTS,
  LEGACY_LOAN_REPAYMENT_TOTALS,
  LEGACY_REPORT_PERIODS,
} from "@/lib/legacy/report-source";

/**
 * The four Report screens that carry rows.
 *
 * Presentation only: every row, figure and total below is the one the report
 * already served, and the filtering, searching, sorting and paging are
 * SettingsTable's — the same component the Menu modules use. What changed is
 * the surface they are drawn on.
 *
 * Headings follow this app's convention and are spell-corrected, as they are
 * everywhere else in the Menu modules; the VALUES are untouched, because those
 * are records rather than labels. Figures that do not add up in the source —
 * Default Loan row 6, Loan Collection row 8's negative remainder — are still
 * reproduced exactly, and flagged under the table rather than repaired.
 */

/* ------------------------------------------------------ Branchwise Loan Summary */

type Branchwise = (typeof LEGACY_BRANCHWISE)[number];

export function BranchWiseReportPanel() {
  const columns: ColumnDef<Branchwise>[] = [
    {
      accessorKey: "branch",
      header: "Branch Name",
      cell: ({ row }) => <Primary value={row.original.branch} />,
    },
    {
      accessorKey: "totalReceivable",
      header: () => <span className="block text-right">Total Receivable</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.totalReceivable)}</Money>,
    },
    {
      accessorKey: "receivablePrincipal",
      header: () => <span className="block text-right">Receivable Principal</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.receivablePrincipal)}</Money>,
    },
    {
      accessorKey: "receivableInterest",
      header: () => <span className="block text-right">Receivable Interest</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.receivableInterest)}</Money>,
    },
    {
      accessorKey: "totalReceived",
      header: () => <span className="block text-right">Total Received</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.totalReceived)}</Money>,
    },
    {
      accessorKey: "receivedPrincipal",
      header: () => <span className="block text-right">Received Principal</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.receivedPrincipal)}</Money>,
    },
    {
      accessorKey: "receivedInterest",
      header: () => <span className="block text-right">Received Interest</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.receivedInterest)}</Money>,
    },
    {
      accessorKey: "totalPending",
      header: () => <span className="block text-right">Total Pending</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.totalPending)}</Money>,
    },
    {
      accessorKey: "reserve",
      header: () => <span className="block text-right">Reserve</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.reserve)}</Money>,
    },
  ];

  return (
    <SettingsCard
      title={`Branchwise Loan Summary (${LEGACY_BRANCHWISE.length})`}
      description="Every branch's book, and what it has collected against it."
      actions={
        <Button tone="secondary" icon={Printer} disabled>
          Print
        </Button>
      }
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={[...LEGACY_BRANCHWISE]}
        searchFields={["branch"]}
        searchPlaceholder="Search branch…"
        emptyState={{ icon: Landmark, title: "No branches", description: "No branch has a book yet." }}
        renderFooter={() => (
          <>
            <td className="px-4 py-3 font-semibold text-[var(--st-ink)]">TOTAL</td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.totalReceivable)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.receivablePrincipal)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.receivableInterest)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.totalReceived)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.receivedPrincipal)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.receivedInterest)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.totalPending)}</Money>
            </td>
            <td className="px-4 py-3">
              <Money strong>{formatMoney(LEGACY_BRANCHWISE_TOTALS.reserve)}</Money>
            </td>
          </>
        )}
      />
    </SettingsCard>
  );
}

/* ------------------------------------------------------------- Loan Repayment */

type Repayment = (typeof LEGACY_LOAN_REPAYMENTS)[number];

export function LoanRepaymentReportPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const rows = React.useMemo(
    () => LEGACY_LOAN_REPAYMENTS.filter((r) => matchesBranch(r.branch, branch)),
    [branch]
  );
  const branches = [...new Set(LEGACY_LOAN_REPAYMENTS.map((r) => r.branch))];

  const columns: ColumnDef<Repayment>[] = [
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <Primary value={row.original.customerName} meta={row.original.branch} />,
    },
    { accessorKey: "loanAc", header: "Loan Ac", cell: ({ row }) => <Num>{row.original.loanAc}</Num> },
    {
      accessorKey: "principal",
      header: () => <span className="block text-right">Principal</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.principal)}</Money>,
    },
    {
      accessorKey: "interest",
      header: () => <span className="block text-right">Interest Amount</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.interest)}</Money>,
    },
    {
      accessorKey: "total",
      header: () => <span className="block text-right">Principal + Interest</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.total)}</Money>,
    },
    { accessorKey: "duration", header: "Loan Duration" },
    {
      accessorKey: "repayments",
      header: () => <span className="block text-right">Number Of Repayment</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.repayments}</span>,
    },
    {
      accessorKey: "withdrawalDate",
      header: "Withdrawal Date",
      cell: ({ row }) => <DateCell value={row.original.withdrawalDate} />,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => <DateCell value={row.original.endDate} />,
    },
  ];

  return (
    <SettingsCard
      title={`Loan Repayment (${LEGACY_LOAN_REPAYMENT_TOTALS.rowCount})`}
      description="What each loan is scheduled to return, and over how long."
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
          <BranchFilter id="rep-branch" value={branch} onChange={setBranch} branches={branches} />
        </FilterBar>

        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["customerName", "loanAc", "branch"]}
          searchPlaceholder="Search customer or account…"
          emptyState={{
            icon: Receipt,
            title: "No repayments match these filters",
            description: "Widen or clear the filter above to see more.",
          }}
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={2}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_REPAYMENT_TOTALS.principal)}</Money>
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_REPAYMENT_TOTALS.interest)}</Money>
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_REPAYMENT_TOTALS.total)}</Money>
              </td>
              <td colSpan={4} />
            </>
          )}
        />
      </div>
    </SettingsCard>
  );
}

/* --------------------------------------------------------------- Default Loan */

type DefaultLoan = (typeof LEGACY_DEFAULT_LOANS)[number];

export function DefaultLoanPanel() {
  const [period, setPeriod] = React.useState<string>("All");
  const [branch, setBranch] = React.useState(ALL);

  const rows = React.useMemo(
    () => LEGACY_DEFAULT_LOANS.filter((r) => matchesBranch(r.branch, branch)),
    [branch]
  );
  const branches = [...new Set(LEGACY_DEFAULT_LOANS.map((r) => r.branch))];

  const columns: ColumnDef<DefaultLoan>[] = [
    {
      accessorKey: "row",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.row}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <Primary value={row.original.customerName} meta={row.original.branch} />,
    },
    { accessorKey: "phone", header: "Phone Number", cell: ({ row }) => <Num>{row.original.phone}</Num> },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "restoration",
      header: () => <span className="block text-right">Restoration</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.restoration)}</Money>,
    },
    { accessorKey: "duration", header: "Duration Type" },
    {
      accessorKey: "repayments",
      header: () => <span className="block text-right">Number of Repayment</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.repayments}</span>,
    },
    {
      accessorKey: "paidThisMonth",
      header: () => <span className="block text-right">Paid This Month</span>,
      cell: ({ row }) => (
        <Money muted={row.original.paidThisMonth === 0}>{formatMoney(row.original.paidThisMonth)}</Money>
      ),
    },
    {
      accessorKey: "remain",
      header: () => <span className="block text-right">Remain Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.remain)}</Money>,
    },
    {
      accessorKey: "startDate",
      header: "Start date",
      cell: ({ row }) => <DateCell value={row.original.startDate} />,
    },
    {
      accessorKey: "endDate",
      header: "End date",
      cell: ({ row }) => <DateCell value={row.original.endDate} />,
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <div className="st-row-action flex justify-end">
          <IconButton icon={CircleX} label="Write off loan" tone="danger" disabled />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PeriodTabs options={LEGACY_REPORT_PERIODS.withAll} value={period} onChange={setPeriod} />

      <SettingsCard
        title={`All default loan (${LEGACY_DEFAULT_LOAN_TOTALS.rowCount})`}
        description="Loans past their end date with money still outstanding."
        bodyClassName="pt-0 sm:pt-0"
      >
        <div className="space-y-4">
          <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
            <BranchFilter id="def-branch" value={branch} onChange={setBranch} branches={branches} />
          </FilterBar>

          <SettingsTable
            columns={columns}
            data={rows}
            searchFields={["customerName", "phone", "branch"]}
            searchPlaceholder="Search customer or phone…"
            emptyState={{
              icon: Ban,
              title: "No defaults match these filters",
              description: "Widen or clear the filter above to see more.",
            }}
            renderFooter={() => (
              <>
                <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={7}>
                  TOTAL
                </td>
                <td className="px-4 py-3">
                  <Money strong>{formatMoney(LEGACY_DEFAULT_LOAN_TOTALS.paidThisMonth)}</Money>
                </td>
                <td className="px-4 py-3">
                  <Money strong>{formatMoney(LEGACY_DEFAULT_LOAN_TOTALS.remain)}</Money>
                </td>
                <td colSpan={3} />
              </>
            )}
          />

          <p className="text-[12.5px] text-[var(--st-ink-soft)]">
            Row 6 does not add up in the source report: 3,360,000 over one monthly instalment, with
            1,300,000 remaining and nothing paid this month. Reproduced as served.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}

/* ------------------------------------------------------------- Loan Collection */

type Collection = (typeof LEGACY_LOAN_COLLECTIONS)[number];

export function LoanCollectionPanel() {
  const [branch, setBranch] = React.useState(ALL);
  const rows = React.useMemo(
    () => LEGACY_LOAN_COLLECTIONS.filter((r) => matchesBranch(r.branch, branch)),
    [branch]
  );
  const branches = [...new Set(LEGACY_LOAN_COLLECTIONS.map((r) => r.branch))];

  const columns: ColumnDef<Collection>[] = [
    {
      accessorKey: "row",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.row}</span>,
    },
    {
      accessorKey: "customerName",
      header: "Customer Name",
      cell: ({ row }) => <Primary value={row.original.customerName} meta={row.original.branch} />,
    },
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => <Muted>{row.original.employee}</Muted>,
    },
    {
      accessorKey: "amount",
      header: () => <span className="block text-right">Loan Amount</span>,
      cell: ({ row }) => <Money strong>{formatMoney(row.original.amount)}</Money>,
    },
    {
      accessorKey: "collection",
      header: () => <span className="block text-right">Collection</span>,
      cell: ({ row }) => <Money>{formatMoney(row.original.collection)}</Money>,
    },
    {
      accessorKey: "paid",
      header: () => <span className="block text-right">Paid Amount</span>,
      cell: ({ row }) => <Money muted={row.original.paid === 0}>{formatMoney(row.original.paid)}</Money>,
    },
    {
      accessorKey: "remain",
      header: () => <span className="block text-right">Remain Amount</span>,
      /* Row 8 is negative: 31,000 collected against a 26,000 loan. Shown as the
         report serves it, in the danger ink so it cannot read as a positive. */
      cell: ({ row }) =>
        row.original.remain < 0 ? (
          <span
            className="font-tabular block text-right font-semibold"
            style={{ color: "var(--st-danger-ink)" }}
            title="Overpaid — the report serves this as a negative"
          >
            −{formatMoney(Math.abs(row.original.remain))}
          </span>
        ) : (
          <Money strong muted={row.original.remain === 0}>
            {formatMoney(row.original.remain)}
          </Money>
        ),
    },
    {
      accessorKey: "penalty",
      header: () => <span className="block text-right">Penalty Amount</span>,
      cell: ({ row }) => <Money muted={row.original.penalty === 0}>{formatMoney(row.original.penalty)}</Money>,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => <DateCell value={row.original.endDate} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <CollectionStatus value={row.original.status} />,
    },
  ];

  return (
    <SettingsCard
      title={`Loan Collection (${LEGACY_LOAN_COLLECTIONS.length})`}
      description="What each loan should return, what it has returned, and who is collecting it."
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar active={branch !== ALL} onReset={() => setBranch(ALL)}>
          <BranchFilter id="col-branch" value={branch} onChange={setBranch} branches={branches} />
        </FilterBar>

        <SettingsTable
          columns={columns}
          data={rows}
          searchFields={["customerName", "branch", "employee"]}
          searchPlaceholder="Search customer, branch or officer…"
          emptyState={{
            icon: FileText,
            title: "No collections match these filters",
            description: "Widen or clear the filter above to see more.",
          }}
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={3}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_COLLECTION_TOTALS.amount)}</Money>
              </td>
              <td />
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_COLLECTION_TOTALS.paid)}</Money>
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_COLLECTION_TOTALS.remain)}</Money>
              </td>
              <td className="px-4 py-3">
                <Money strong>{formatMoney(LEGACY_LOAN_COLLECTION_TOTALS.penalty)}</Money>
              </td>
              <td colSpan={2} />
            </>
          )}
        />

        <p className="text-[12.5px] text-[var(--st-ink-soft)]">
          Row 8 carries a negative Remain Amount: 31,000 was collected against a 26,000 loan, and the
          report serves the 5,000 overpayment as −5,000.
        </p>
      </div>
    </SettingsCard>
  );
}
