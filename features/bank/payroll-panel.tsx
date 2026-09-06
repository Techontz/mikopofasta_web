"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Filter, FilterBar, Money, SettingsCard, StatusBadge } from "@/components/settings";
import { SettingsTable } from "@/components/settings/table";
import { Select } from "@/components/settings/form";
import { formatMoneyExact } from "@/lib/domain/money";
import type { PayslipRecord } from "@/lib/api/hr";
import { PAYROLL_TONE, formatPeriod } from "@/features/bank/shared";

const ALL = "__all__";

/**
 * Bank → Payroll.
 *
 * One row per member of staff for the chosen period, from `GET /payslips`.
 *
 * The period filter navigates rather than filtering in the browser: the API
 * returns one period at a time — a screen whose opening view was every payslip
 * ever issued would be unreadable and would grow without bound — so changing it
 * is a fetch. Branch and department are client-side, because they narrow rows
 * already in hand.
 *
 * A payslip has no status of its own: §11 pays a run as one act, so the pill
 * reads "paid" when the run is paid and "pending" until then. Inventing a
 * per-employee payment state would imply the company can pay half a payroll.
 */
export function PayrollPanel({
  payslips,
  period,
  periods,
}: {
  payslips: PayslipRecord[];
  period: string | null;
  periods: string[];
}) {
  const router = useRouter();
  const [branch, setBranch] = React.useState(ALL);
  const [department, setDepartment] = React.useState(ALL);

  const branches = React.useMemo(
    () => [...new Set(payslips.map((p) => p.branch).filter((b): b is string => b !== null))].sort(),
    [payslips]
  );
  const departments = React.useMemo(
    () =>
      [...new Set(payslips.map((p) => p.department).filter((d): d is string => d !== null))].sort(),
    [payslips]
  );

  const filtered = React.useMemo(
    () =>
      payslips.filter(
        (p) =>
          (branch === ALL || p.branch === branch) &&
          (department === ALL || p.department === department)
      ),
    [payslips, branch, department]
  );

  const active = branch !== ALL || department !== ALL;

  const columns: ColumnDef<PayslipRecord>[] = [
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
          <p className="font-tabular mt-0.5 text-[12.5px] text-[var(--st-ink-faint)]">
            {row.original.staffNo} · {row.original.branch ?? "—"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.original.department ?? "—",
    },
    {
      accessorKey: "bankName",
      header: "Bank",
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.bankName ?? "—"}</span>,
    },
    {
      accessorKey: "accountNumber",
      header: "Account",
      cell: ({ row }) => (
        <span className="font-tabular whitespace-nowrap">{row.original.accountNumber ?? "—"}</span>
      ),
    },
    {
      accessorKey: "grossPay",
      header: () => <span className="block text-right">Salary</span>,
      // Gross — base plus commission plus allowances — computed by the API, so
      // the column cannot disagree with the payslip it summarises.
      cell: ({ row }) => <Money>{formatMoneyExact(row.original.grossPay)}</Money>,
    },
    {
      id: "deductions",
      header: () => <span className="block text-right">Deductions</span>,
      cell: ({ row }) => (
        <Money muted={row.original.deductionsTotal === 0}>
          {row.original.deductionsTotal === 0
            ? "—"
            : `−${formatMoneyExact(row.original.deductionsTotal)}`}
        </Money>
      ),
    },
    {
      id: "net",
      header: () => <span className="block text-right">Net Salary</span>,
      cell: ({ row }) => <Money strong>{formatMoneyExact(row.original.netSalary)}</Money>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const paid = row.original.status === "paid";
        return (
          <StatusBadge tone={PAYROLL_TONE[paid ? "paid" : "pending"]} className="capitalize">
            {paid ? "paid" : "pending"}
          </StatusBadge>
        );
      },
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

  const net = filtered.reduce((s, r) => s + r.netSalary, 0);

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
            setBranch(ALL);
            setDepartment(ALL);
          }}
        >
          <Filter label="Month" htmlFor="pr-period">
            <Select
              id="pr-period"
              value={period ?? ""}
              onChange={(e) => router.push(`/treasury/payroll?period=${e.target.value}`)}
            >
              {periods.length === 0 && <option value="">No payroll yet</option>}
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </Select>
          </Filter>

          <Filter label="Branch" htmlFor="pr-branch">
            <Select id="pr-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value={ALL}>All branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Filter>

          <Filter label="Department" htmlFor="pr-department">
            <Select
              id="pr-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value={ALL}>All departments</option>
              {departments.map((d) => (
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
          searchFields={["employee", "staffNo"]}
          searchPlaceholder="Search by employee or staff number…"
          emptyState={{
            icon: Eye,
            title: "No payslips for this period",
            description: "Payroll has not been generated, or no staff match these filters.",
          }}
        />
      </div>
    </SettingsCard>
  );
}
