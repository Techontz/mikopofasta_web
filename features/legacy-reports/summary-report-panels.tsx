"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Eye, Loader2, Printer, Search, Users } from "lucide-react";
import { Money, SectionDivider, SettingsCard } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Button, Field, IconButton, Select } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import { Num, Primary } from "./shared";
import { LEGACY_DAILY_REPORT, LEGACY_MARKED_CUSTOMERS } from "@/lib/legacy/report-source";
import { PROFILE_OPTIONS, findProfile } from "@/lib/legacy/profile-fixtures";

/**
 * The three Report screens that are not a plain list.
 *
 * Presentation only. Daily Report's bands, figures and its green/red totals are
 * unchanged; Customer Development still lists the same three customers; the
 * Customer statement search still opens the same Teller screen with the same
 * customer and loan selection. All three are now drawn with the same cards,
 * tables and buttons the Menu-tab modules use.
 */

/* --------------------------------------------------------------- Daily Report */

/**
 * Report → Daily Report.
 *
 * Money in, money out, and the closing position. The inflow total prints green
 * and the outflow total red — the report's own use of colour, kept — and the
 * CLOSING is the figure it serves, which does not follow from the two totals
 * above it. That is stated under the table rather than corrected.
 */
export function DailyReportPanel() {
  const r = LEGACY_DAILY_REPORT;
  const stated = r.inflowTotal - r.outflowTotal;

  return (
    <SettingsCard
      title={`Daily Report / ${r.date}`}
      description="Everything that moved today, in and out, and what the business closes on."
      actions={
        <Button tone="secondary" icon={Printer} disabled>
          Print
        </Button>
      }
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <div className="st-card overflow-x-auto">
          <table className="st-table w-full">
            <thead>
              <tr>
                <th className="text-left">Description</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {r.inflows.map((line) => (
                <tr key={`in-${line.label}`}>
                  <td className={cn("heading" in line && line.heading && "font-semibold")}>
                    {line.label}
                  </td>
                  <td>
                    <Money muted={line.amount === 0}>{formatMoney(line.amount)}</Money>
                  </td>
                </tr>
              ))}
              <tr className="st-total-row">
                <td className="font-semibold" style={{ color: "var(--st-success-ink)" }}>
                  TOTAL
                </td>
                <td>
                  <span
                    className="font-tabular block text-right font-semibold"
                    style={{ color: "var(--st-success-ink)" }}
                  >
                    {formatMoney(r.inflowTotal)}
                  </span>
                </td>
              </tr>

              {/* The report leaves a band between money in and money out. */}
              <tr aria-hidden>
                <td colSpan={2} className="h-3 border-0 p-0" />
              </tr>

              {r.outflows.map((line) => (
                <tr key={`out-${line.label}`}>
                  <td>{line.label}</td>
                  <td>
                    <Money muted={line.amount === 0}>{formatMoney(line.amount)}</Money>
                  </td>
                </tr>
              ))}
              <tr className="st-total-row">
                <td className="font-semibold" style={{ color: "var(--st-danger-ink)" }}>
                  TOTAL
                </td>
                <td>
                  <span
                    className="font-tabular block text-right font-semibold"
                    style={{ color: "var(--st-danger-ink)" }}
                  >
                    {formatMoney(r.outflowTotal)}
                  </span>
                </td>
              </tr>

              <tr aria-hidden>
                <td colSpan={2} className="h-3 border-0 p-0" />
              </tr>

              <tr className="st-total-row">
                <td className="text-[14px] font-semibold text-[var(--st-ink)]">CLOSING</td>
                <td>
                  <Money strong>{formatMoney(r.closing)}</Money>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[12.5px] text-[var(--st-ink-soft)]">
          The report does not foot: opening nil, plus {formatMoney(r.inflowTotal)} in, less{" "}
          {formatMoney(r.outflowTotal)} out comes to {formatMoney(stated)}, where it serves{" "}
          {formatMoney(r.closing)} as closing. The same figure appears on the Teller screen, so
          whatever produces it is shared between the two.
        </p>
      </div>
    </SettingsCard>
  );
}

/* ------------------------------------------------------- Customer Development */

type Marked = (typeof LEGACY_MARKED_CUSTOMERS)[number];

export function CustomerDevelopmentPanel() {
  const columns: ColumnDef<Marked>[] = [
    {
      accessorKey: "row",
      header: "S/No.",
      cell: ({ row }) => <span className="font-tabular text-[var(--st-ink-soft)]">{row.original.row}</span>,
    },
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => <Primary value={row.original.name} meta={row.original.customerId} />,
    },
    {
      accessorKey: "age",
      header: () => <span className="block text-right">Age</span>,
      cell: ({ row }) => <span className="font-tabular block text-right">{row.original.age}</span>,
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => <span className="capitalize">{row.original.gender}</span>,
    },
    {
      accessorKey: "phone",
      header: "Phone number",
      cell: ({ row }) => <Num>{row.original.phone}</Num>,
    },
    { accessorKey: "branch", header: "Branch" },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: () => (
        <div className="st-row-action flex justify-end">
          <IconButton icon={Eye} label="View customer" tone="secondary" disabled />
        </div>
      ),
    },
  ];

  return (
    <SettingsCard
      title={`Customer List (${LEGACY_MARKED_CUSTOMERS.length})`}
      description="Customers marked for development."
      bodyClassName="pt-0 sm:pt-0"
    >
      <SettingsTable
        columns={columns}
        data={[...LEGACY_MARKED_CUSTOMERS]}
        searchFields={["name", "customerId", "phone", "branch"]}
        searchPlaceholder="Search customer…"
        emptyState={{
          icon: Users,
          title: "No customers marked",
          description: "Nobody has been marked for development.",
        }}
      />
    </SettingsCard>
  );
}

/* ---------------------------------------------------------- Customer statement */

/**
 * Report → Customer statement.
 *
 * The same two-step search it has always been — pick a customer, pick one of
 * their loans, open the statement on the Teller screen. Only the controls
 * changed: they are now the app's Field and Select rather than bare ones.
 */
export function CustomerStatementPanel() {
  const router = useRouter();
  const [customer, setCustomer] = React.useState("");
  const [loan, setLoan] = React.useState("");
  const [opening, startNavigation] = React.useTransition();

  const profile = customer ? findProfile(customer) : undefined;

  return (
    <SettingsCard
      title="Search Customer"
      description="Pick a customer, and a loan of theirs, to open their statement."
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (customer) startNavigation(() => router.push(`/teller/${customer}`));
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Customer" htmlFor="stmt-customer">
            <Select
              id="stmt-customer"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                setLoan("");
              }}
            >
              <option value="">Search Customer</option>
              {PROFILE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} / {c.id}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Loan"
            htmlFor="stmt-loan"
            help={profile && profile.loans.length === 0 ? "This customer holds no loan." : undefined}
          >
            <Select
              id="stmt-loan"
              value={loan}
              disabled={!profile}
              onChange={(e) => setLoan(e.target.value)}
            >
              <option value="">select loan</option>
              {profile?.loans.map((l) => (
                <option key={l.account} value={l.account}>
                  {l.account} — {formatMoney(l.principal)} ({l.status})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <SectionDivider />

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={customer === "" || opening}
            className="st-btn st-btn-primary"
          >
            {opening ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Opening…
              </>
            ) : (
              <>
                <Search className="size-4" strokeWidth={2} aria-hidden />
                Search
                <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
              </>
            )}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}
