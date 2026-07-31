"use client";

import * as React from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Users } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Select } from "@/components/settings/form";
import { formatMoneyExact } from "@/lib/domain/money";
import { payrollTotals, type PayrollRow } from "@/types/bank";
import { BRANCHES, DEPARTMENTS, PAYROLL_PERIODS } from "@/lib/mock-data/bank";
import { PAYROLL_TONE, formatPeriod } from "@/features/bank/shared";

const ALL = "__all__";

/**
 * Bank → Payroll.
 *
 * One row per member of staff for the chosen period. Gross, deductions and net
 * are derived from the row through payrollTotals rather than read from a stored
 * figure, so the column always foots against the tiles above it.
 */
export function PayrollPanel({ rows }: { rows: PayrollRow[] }) {
  const [period, setPeriod] = React.useState<string>(PAYROLL_PERIODS[0]);
  const [branch, setBranch] = React.useState(ALL);
  const [department, setDepartment] = React.useState(ALL);

  const filtered = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (period === ALL || r.period === period) &&
          (branch === ALL || r.branch === branch) &&
          (department === ALL || r.department === department)
      ),
    [rows, period, branch, department]
  );

  const active = period !== PAYROLL_PERIODS[0] || branch !== ALL || department !== ALL;

  const columns: ColumnDef<PayrollRow>[] = [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={`/treasury/payroll/${row.original.id}`}
            className="rounded-[var(--st-radius-xs)] font-medium text-[var(--st-ink)] hover:text-[var(--st-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--st-accent)]"
          >
            {row.original.employee}
          </Link>
          <p className="font-tabular mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
            {row.original.staffNo} · {row.original.branch}
          </p>
        </div>
      ),
    },
    { accessorKey: "department", header: "Department" },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.bankName}</span>,
    },
    {
      accessorKey: "accountNumber",
      header: "Account",
      cell: ({ row }) => <span className="font-tabular whitespace-nowrap">{row.original.accountNumber}</span>,
    },
    {
      accessorKey: "salary",
      header: () => <span className="block text-right">Salary</span>,
      cell: ({ row }) => <Money>{formatMoneyExact(payrollTotals(row.original).gross)}</Money>,
    },
    {
      id: "deductions",
      header: () => <span className="block text-right">Deductions</span>,
      cell: ({ row }) => {
        const { deductionsTotal } = payrollTotals(row.original);
        return (
          <Money muted={deductionsTotal === 0}>
            {deductionsTotal === 0 ? "—" : `−${formatMoneyExact(deductionsTotal)}`}
          </Money>
        );
      },
    },
    {
      id: "net",
      header: () => <span className="block text-right">Net Salary</span>,
      cell: ({ row }) => <Money strong>{formatMoneyExact(payrollTotals(row.original).net)}</Money>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge tone={PAYROLL_TONE[row.original.status]} className="capitalize">
          {row.original.status}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Action</span>,
      cell: ({ row }) => (
        <div className="st-row-action flex justify-end">
          <Link
            href={`/treasury/payroll/${row.original.id}`}
            aria-label={`View ${row.original.employee}'s payslip`}
            title={`View ${row.original.employee}'s payslip`}
            className="st-btn st-btn-secondary st-btn-icon"
          >
            <Eye className="size-4" strokeWidth={1.9} aria-hidden />
          </Link>
        </div>
      ),
    },
  ];

  const net = filtered.reduce((s, r) => s + payrollTotals(r).net, 0);

  return (
    <SettingsCard
      title={`Payroll List (${filtered.length})`}
      description={`${formatMoneyExact(net)} net across the staff shown.`}
      bodyClassName="pt-0 sm:pt-0"
    >
      <div className="space-y-4">
        <FilterBar
          active={active}
          onReset={() => {
            setPeriod(PAYROLL_PERIODS[0]);
            setBranch(ALL);
            setDepartment(ALL);
          }}
        >
          <Filter label="Month" htmlFor="pr-period">
            <Select id="pr-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value={ALL}>All periods</option>
              {PAYROLL_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Branch" htmlFor="pr-branch">
            <Select id="pr-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Department" htmlFor="pr-department">
            <Select id="pr-department" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value={ALL}>All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Filter>
        </FilterBar>

        <SettingsTable
          columns={columns}
          data={filtered}
          searchFields={["employee", "staffNo", "department", "bankName", "accountNumber"]}
          searchPlaceholder="Search employee or staff no…"
          emptyState={{
            icon: Users,
            title: active ? "No staff match these filters" : "No payroll for this period",
            description: active
              ? "Widen or clear the filters above to see more."
              : "A payslip appears here once payroll is generated for the period.",
          }}
        />
      </div>
    </SettingsCard>
  );
}
