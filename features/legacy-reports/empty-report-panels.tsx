"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Archive, ArrowDownLeft, ArrowUpRight, Ban, FileText, Receipt } from "lucide-react";
import { Money, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Button } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { PeriodTabs } from "./shared";
import { LEGACY_REPORT_PERIODS } from "@/lib/legacy/report-source";

/**
 * The six Report screens that currently return no rows.
 *
 * Presentation only. Their columns, their totals rows and the fact that each is
 * empty are all unchanged — what changed is that they are now drawn with
 * SettingsCard and SettingsTable, the components every Menu-tab module uses, so
 * an empty Report screen looks like an empty Loan screen.
 *
 * Headings are spell-corrected to this app's convention, as the Menu modules'
 * are. The zero totals are the reports' own.
 */

/** No row exists for any table in this file. */
type NoRows = Record<string, never>;

/** A muted zero in a totals row, so it reads as "nothing" not as a figure. */
function Zero() {
  return (
    <Money strong muted>
      {formatMoney(0)}
    </Money>
  );
}

/* ---------------------------------------------------------- Cash Transaction */

export function CashTransactionPanel() {
  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/No." },
    { id: "customer", header: "Customer Name" },
    { id: "deposit", header: () => <span className="block text-right">Deposit</span> },
    { id: "withdrawal", header: () => <span className="block text-right">Withdrawal</span> },
    { id: "date", header: "Date" },
    { id: "actions", header: () => <span className="block text-right">Action</span> },
  ];

  return (
    <SettingsCard
      title="Transaction list (0)"
      description="Cash in and out at the counter."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={[]}
        emptyState={{
          icon: Receipt,
          title: "No transactions",
          description: "No cash has moved across the counter in this period.",
        }}
        footerWhenEmpty
        renderFooter={() => (
          <>
            <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={2}>
              TOTAL
            </td>
            <td className="px-4 py-3">
              <Zero />
            </td>
            <td className="px-4 py-3">
              <Zero />
            </td>
            <td colSpan={2} />
          </>
        )}
      />
    </SettingsCard>
  );
}

/* ------------------------------------------------------------------------ File */

/**
 * Report → File.
 *
 * Eleven columns and then a column per month — January, March, May and June,
 * which is what the report serves. Not consecutive, and unchanged here.
 */
export function FileReportPanel() {
  const months = ["January", "March", "May", "June"];

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/No." },
    { id: "branch", header: "Branch Name" },
    { id: "customer", header: "Customer Name" },
    { id: "phone", header: "Phone Number" },
    { id: "amount", header: () => <span className="block text-right">Loan Amount</span> },
    { id: "duration", header: "Duration Type" },
    { id: "collection", header: () => <span className="block text-right">Collection</span> },
    { id: "paid", header: () => <span className="block text-right">Paid Amount</span> },
    { id: "remain", header: () => <span className="block text-right">Remain Amount</span> },
    { id: "withdrawalDate", header: "Withdrawal Date" },
    { id: "status", header: "Loan Status" },
    ...months.map(
      (m): ColumnDef<NoRows> => ({
        id: m.toLowerCase(),
        header: () => <span className="block text-right">{m}</span>,
      })
    ),
  ];

  return (
    <SettingsCard
      title="File (0)"
      description="A loan per row, with a column for each month it was collected in."
      actions={
        <Button tone="secondary" icon={Archive} disabled>
          Archive
        </Button>
      }
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={[]}
        emptyState={{
          icon: FileText,
          title: "No loans on file",
          description: "No loan has been collected in this period.",
        }}
        footerWhenEmpty
        renderFooter={() => (
          <>
            <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={11}>
              TOTAL
            </td>
            {months.map((m) => (
              <td key={m} className="px-4 py-3">
                <Zero />
              </td>
            ))}
          </>
        )}
      />
    </SettingsCard>
  );
}

/* ------------------------------------------------------------- Loan Pending */

export function LoanPendingReportPanel() {
  const [period, setPeriod] = React.useState<string>("Monthly");

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/No." },
    { id: "branch", header: "Branch Name" },
    { id: "customer", header: "Customer Name" },
    { id: "phone", header: "Phone Number" },
    { id: "amount", header: () => <span className="block text-right">Loan Amount</span> },
    { id: "duration", header: "Duration Type" },
    { id: "pending", header: () => <span className="block text-right">Pending Amount</span> },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-4">
      <PeriodTabs options={LEGACY_REPORT_PERIODS.withoutAll} value={period} onChange={setPeriod} />

      <SettingsCard
        title="All loan pending (0)"
        description="Applications still waiting, for the period selected above."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: FileText,
            title: "No pending applications",
            description: "Nothing is waiting on a decision in this period.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

/* --------------------------------------------------------------- Write-off */

export function WriteOffPanel() {
  const [state, setState] = React.useState<string>(LEGACY_REPORT_PERIODS.writeOff[0]);

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/No." },
    { id: "branch", header: "Branch Name" },
    { id: "customer", header: "Customer Name" },
    { id: "phone", header: "Phone Number" },
    { id: "amount", header: () => <span className="block text-right">Loan Amount</span> },
    { id: "restoration", header: () => <span className="block text-right">Restoration</span> },
    { id: "duration", header: "Duration Type" },
    { id: "repayments", header: () => <span className="block text-right">Number of Repayment</span> },
    { id: "writeOff", header: () => <span className="block text-right">Write-off Amount</span> },
    { id: "startDate", header: "Start date" },
    { id: "endDate", header: "End date" },
  ];

  return (
    <div className="space-y-4">
      <PeriodTabs
        options={["Write-off loan", "Bad Debt", "Bad Debt Done"]}
        value={state}
        onChange={setState}
      />

      <SettingsCard
        title="Write-off Loan (0)"
        description="Loans the business has given up on."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: Ban,
            title: "Nothing written off",
            description: "No loan has been written off in this period.",
          }}
          footerWhenEmpty
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={8}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Zero />
              </td>
              <td colSpan={2} />
            </>
          )}
        />
      </SettingsCard>
    </div>
  );
}

/* --------------------------------------------------------- Today Receivable */

export function TodayReceivablePanel() {
  const [period, setPeriod] = React.useState<string>("Monthly");

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no" },
    { id: "customer", header: "Customer" },
    { id: "branch", header: "Branch" },
    { id: "number", header: "Number" },
    { id: "duration", header: "Duration" },
    { id: "loan", header: () => <span className="block text-right">Loan</span> },
    { id: "restoration", header: () => <span className="block text-right">Restoration</span> },
    { id: "receivable", header: () => <span className="block text-right">Receivable Amount</span> },
    { id: "paid", header: () => <span className="block text-right">Paid Amount</span> },
    { id: "pending", header: () => <span className="block text-right">Pending amount</span> },
    { id: "status", header: "Status" },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-4">
      <PeriodTabs options={LEGACY_REPORT_PERIODS.withoutAll} value={period} onChange={setPeriod} />

      <SettingsCard
        title="All Receivable (0)"
        description="What is due in, for the period selected above."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: ArrowDownLeft,
            title: "Nothing receivable",
            description: "No instalment falls due in this period.",
          }}
        />
      </SettingsCard>
    </div>
  );
}

/* ----------------------------------------------------------- Today Received */

export function TodayReceivedPanel() {
  const [period, setPeriod] = React.useState<string>("All");

  const columns: ColumnDef<NoRows>[] = [
    { id: "row", header: "S/no" },
    { id: "customer", header: "Customer" },
    { id: "branch", header: "Branch" },
    { id: "number", header: "Number" },
    { id: "duration", header: "Duration" },
    { id: "loan", header: () => <span className="block text-right">Loan</span> },
    { id: "received", header: () => <span className="block text-right">Received Amount</span> },
    { id: "principal", header: () => <span className="block text-right">Principal</span> },
    { id: "interest", header: () => <span className="block text-right">Interest</span> },
    { id: "reserve", header: () => <span className="block text-right">Reserve</span> },
    { id: "employee", header: "Employee" },
    { id: "date", header: "Date" },
  ];

  return (
    <div className="space-y-4">
      <PeriodTabs options={LEGACY_REPORT_PERIODS.withAll} value={period} onChange={setPeriod} />

      <SettingsCard
        title="All Received (0)"
        description="What has actually come in, and which officer brought it."
        bodyClassName="pt-0 sm:pt-0"
      >
        <SettingsTable
          columns={columns}
          data={[]}
          emptyState={{
            icon: ArrowUpRight,
            title: "Nothing received",
            description: "No payment has come in during this period.",
          }}
          footerWhenEmpty
          renderFooter={() => (
            <>
              <td className="px-4 py-3 font-semibold text-[var(--st-ink)]" colSpan={6}>
                TOTAL
              </td>
              <td className="px-4 py-3">
                <Zero />
              </td>
              <td className="px-4 py-3">
                <Zero />
              </td>
              <td className="px-4 py-3">
                <Zero />
              </td>
              <td className="px-4 py-3">
                <Zero />
              </td>
              <td colSpan={2} />
            </>
          )}
        />
      </SettingsCard>
    </div>
  );
}
