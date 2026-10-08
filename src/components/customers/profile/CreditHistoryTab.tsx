"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Loading } from "@/components/ui/Loading";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

import { Detail } from "../common";

type Source = "legacy" | "current";
type Amount = number | null;

interface Located {
  source: Source;
  branch_id: number | null;
  branch_name: string | null;
}

interface LoanRow extends Located {
  id: number;
  loan_number: string;
  reference_number: string | null;
  product: string | null;
  loan_date: string | null;
  loan_amount: number;
  principal: Amount;
  interest: Amount;
  principal_interest: number;
  paid: Amount;
  remain: Amount;
  status: string;
  status_label: string;
  status_badge: string;
  status_group: "completed" | "active" | "default" | "not_disbursed";
  in_arrears: boolean;
  payment_status: "paid" | "partially_paid" | "unpaid" | "not_disbursed";
  withdrawn_at: string | null;
  end_date: string | null;
  closed_at: string | null;
}

interface ArrearsRow extends Located {
  id: number;
  due_date: string;
  loan_id: number;
  loan_number: string;
  expected: number;
  paid: number;
  arrears: number;
  days_overdue: number;
  paid_date: string | null;
  status: "paid_late" | "partially_paid" | "missed";
  status_label: string;
  loan_status_label: string;
}

interface DefaultRow extends Located {
  loan_id: number;
  loan_number: string;
  default_date: string | null;
  loan_amount: number;
  outstanding_at_default: Amount;
  reason: string | null;
  resolution: string;
  resolution_date: string | null;
  current_status: string;
  current_status_badge: string;
}

interface PenaltyRow extends Located {
  id: number;
  date: string | null;
  loan_id: number | null;
  loan_number: string | null;
  amount: number;
  paid: number;
  remain: number;
  status: "paid" | "partially_paid" | "unpaid" | "waived";
  reason: string | null;
}

interface ProfitRow extends Located {
  loan_id: number;
  loan_number: string;
  date: string | null;
  loan_amount: number;
  interest: Amount;
  collected: Amount;
  status_label: string;
}

interface AdvanceRow extends Located {
  id: number;
  date: string | null;
  amount: number;
  total_payable: number;
  paid: number;
  remain: Amount;
  status: string;
  status_label: string;
}

/** GET customers/{id}/credit-history (API CustomerCreditHistory). */
export interface CreditHistory {
  summary: {
    total_loans: number;
    completed_loans: number;
    active_loans: number;
    defaulted_loans: number;
    applications_not_disbursed: number;
    total_borrowed: number;
    old_system_borrowed: number;
    total_repaid: number;
    old_system_repaid: number;
    total_outstanding: number;
    outstanding: { loans: number; penalty: number; salary_advance: number; old_system: number };
    total_penalties_charged: number;
    total_interest: number;
    interest_collected: number;
    credit_status: { key: string; label: string; tone: string };
  };
  loans: LoanRow[];
  repayment: {
    total_instalments: number;
    paid_instalments: number;
    due_instalments: number;
    on_time: number;
    late: number;
    missed: number;
    arrears_events: number;
    arrears_amount: number;
    max_days_overdue: number | null;
    times_defaulted: number;
    on_time_rate: number | null;
    loans_without_schedule: number;
  };
  arrears: ArrearsRow[];
  defaults: { times_defaulted: number; rows: DefaultRow[] };
  penalties: { totals: { charged: number; paid: number; waived: number; outstanding: number; incidents: number }; rows: PenaltyRow[] };
  profit: { total: number; collected: number; excluded_legacy_loans: number; rows: ProfitRow[] };
  salary_advances: {
    totals: { count: number; amount: number; total_payable: number; paid: number; outstanding: number; completed: number; active: number; defaulted: number | null };
    rows: AdvanceRow[];
  };
  performance: string[];
}

interface Filters {
  from: string;
  to: string;
  status: "" | "completed" | "active" | "default" | "arrears";
  loanNumber: string;
  source: "" | Source;
  branchId: string;
  payment: "" | "paid" | "partially_paid" | "unpaid";
}

const NO_FILTERS: Filters = { from: "", to: "", status: "", loanNumber: "", source: "", branchId: "", payment: "" };

const NA = <span className="text-muted">N/A</span>;
const amount = (value: Amount): ReactNode => (value === null ? NA : money(value));
const PAYMENT_LABEL: Record<string, { tone: BadgeTone; label: string }> = {
  paid: { tone: "success", label: "Paid" },
  partially_paid: { tone: "warning", label: "Partially paid" },
  unpaid: { tone: "danger", label: "Unpaid" },
  waived: { tone: "default", label: "Waived" },
  not_disbursed: { tone: "default", label: "Not disbursed" },
};

function SourceBadge({ source }: { source: Source }) {
  return source === "legacy" ? <Badge tone="dark">Legacy System</Badge> : <Badge tone="info">Current System</Badge>;
}

function LoanLink({ id, number }: { id: number | null; number: string | null }) {
  return id === null ? NA : <Link href={`/loans/${id}`}>{number ?? id}</Link>;
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mf-section-box mf-stat">
      <div className="mf-stat-label">{label}</div>
      <div className="mf-stat-value">{value}</div>
      {hint && <div className="mf-cell-help">{hint}</div>}
    </div>
  );
}

/**
 * Customer Profile → Credit History: what the customer has done throughout their borrowing history. Read only. The summary
 * cards are the API's totals and never move with the filters; the filters narrow the tables only.
 */
export function CreditHistoryTab({ customerId }: { customerId: number }) {
  const { data, isLoading, error } = useApi<CreditHistory>(`customers/${customerId}/credit-history`);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));

  const loansById = useMemo(() => new Map((data?.loans ?? []).map((loan) => [loan.id, loan])), [data]);
  const branches = useMemo(() => {
    const all = [...(data?.loans ?? []), ...(data?.penalties.rows ?? []), ...(data?.salary_advances.rows ?? [])];
    return [...new Map(all.filter((row) => row.branch_id !== null).map((row) => [row.branch_id as number, row.branch_name ?? `Branch ${row.branch_id}`])).entries()];
  }, [data]);

  if (isLoading) {
    return <Loading />;
  }
  if (!data) {
    return <p className="text-muted mb-0">{error ? "The credit history could not be loaded." : "No credit history."}</p>;
  }

  /** Date range, source, branch, loan number, loan status and payment status, for any table row. */
  const keep = (row: Located, date: string | null, loanId: number | null, payment: string | null) => {
    const loan = loanId !== null ? loansById.get(loanId) : undefined;
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    if (filters.source && row.source !== filters.source) return false;
    if (filters.branchId && String(row.branch_id ?? "") !== filters.branchId) return false;
    if (filters.loanNumber.trim()) {
      const term = filters.loanNumber.trim().toLowerCase();
      if (!loan || ![loan.loan_number, loan.reference_number ?? ""].some((value) => value.toLowerCase().includes(term))) return false;
    }
    if (filters.status) {
      if (!loan) return false;
      if (filters.status === "arrears" ? !loan.in_arrears : loan.status_group !== filters.status) return false;
    }
    if (filters.payment && payment !== filters.payment) return false;
    return true;
  };

  const { summary: s, repayment: r } = data;
  const loans = data.loans.filter((loan) => keep(loan, loan.loan_date, loan.id, loan.payment_status));
  const arrears = data.arrears.filter((row) => keep(row, row.due_date, row.loan_id, row.status === "paid_late" ? "paid" : row.status === "missed" ? "unpaid" : row.status));
  const defaults = data.defaults.rows.filter((row) => keep(row, row.default_date, row.loan_id, null));
  const penalties = data.penalties.rows.filter((row) => keep(row, row.date, row.loan_id, row.status));
  const profit = data.profit.rows.filter((row) => keep(row, row.date, row.loan_id, loansById.get(row.loan_id)?.payment_status ?? null));
  const advances = filters.loanNumber.trim() || filters.status
    ? []
    : data.salary_advances.rows.filter((row) => keep(row, row.date, null, row.remain === null ? null : row.remain <= 0 ? "paid" : row.paid > 0 ? "partially_paid" : "unpaid"));
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const profitTotal = profit.reduce((total, row) => total + (row.interest ?? 0), 0);
  const profitCollected = profit.reduce((total, row) => total + (row.collected ?? 0), 0);

  const loanColumns: Column<LoanRow>[] = [
    { key: "loan_number", header: "Loan Number", render: (row) => <LoanLink id={row.id} number={row.loan_number} />, value: (row) => `${row.loan_number} ${row.reference_number ?? ""}` },
    { key: "loan_date", header: "Loan Date", className: "text-nowrap" },
    { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
    { key: "principal", header: "Principal", render: (row) => amount(row.principal) },
    { key: "interest", header: "Profit/Interest", render: (row) => amount(row.interest) },
    { key: "principal_interest", header: "Principal + Interest", render: (row) => money(row.principal_interest) },
    { key: "paid", header: "Paid", render: (row) => amount(row.paid) },
    { key: "remain", header: "Remain", render: (row) => amount(row.remain) },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status_badge as BadgeTone}>{row.status_label}</Badge>, value: (row) => row.status_label },
    { key: "withdrawn_at", header: "Withdrawal Date", className: "text-nowrap", render: (row) => row.withdrawn_at ?? NA },
    { key: "end", header: "Completion/End Date", className: "text-nowrap", render: (row) => row.closed_at ?? row.end_date ?? NA, value: (row) => row.closed_at ?? row.end_date },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} />, value: (row) => (row.source === "legacy" ? "Legacy System" : "Current System") },
  ];

  const arrearsColumns: Column<ArrearsRow>[] = [
    { key: "due_date", header: "Date", className: "text-nowrap" },
    { key: "loan_number", header: "Loan", render: (row) => <LoanLink id={row.loan_id} number={row.loan_number} /> },
    { key: "expected", header: "Expected", render: (row) => money(row.expected) },
    { key: "paid", header: "Paid", render: (row) => money(row.paid) },
    { key: "arrears", header: "Arrears", render: (row) => money(row.arrears) },
    { key: "days_overdue", header: "Days Overdue" },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "paid_late" ? "warning" : "danger"}>{row.status_label}</Badge>, value: (row) => row.status_label },
  ];

  const defaultColumns: Column<DefaultRow>[] = [
    { key: "loan_number", header: "Loan", render: (row) => <LoanLink id={row.loan_id} number={row.loan_number} /> },
    { key: "default_date", header: "Default Date", className: "text-nowrap", render: (row) => row.default_date ?? NA },
    { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
    { key: "outstanding_at_default", header: "Outstanding at Default", render: (row) => amount(row.outstanding_at_default) },
    { key: "reason", header: "Reason", render: (row) => row.reason ?? NA },
    { key: "resolution", header: "Resolution Status" },
    { key: "resolution_date", header: "Resolution Date", className: "text-nowrap", render: (row) => row.resolution_date ?? NA },
    { key: "current_status", header: "Current Status", render: (row) => <Badge tone={row.current_status_badge as BadgeTone}>{row.current_status}</Badge> },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} />, value: (row) => row.source },
  ];

  const penaltyColumns: Column<PenaltyRow>[] = [
    { key: "date", header: "Date", className: "text-nowrap" },
    { key: "loan_number", header: "Loan", render: (row) => <LoanLink id={row.loan_id} number={row.loan_number} /> },
    { key: "amount", header: "Penalty", render: (row) => money(row.amount) },
    { key: "paid", header: "Paid", render: (row) => money(row.paid) },
    { key: "remain", header: "Remain", render: (row) => money(row.remain) },
    { key: "status", header: "Status", render: (row) => <Badge tone={PAYMENT_LABEL[row.status].tone}>{PAYMENT_LABEL[row.status].label}</Badge>, value: (row) => PAYMENT_LABEL[row.status].label },
    { key: "reason", header: "Reason", render: (row) => row.reason ?? NA },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} />, value: (row) => row.source },
  ];

  const profitColumns: Column<ProfitRow>[] = [
    { key: "date", header: "Date", className: "text-nowrap" },
    { key: "loan_number", header: "Loan", render: (row) => <LoanLink id={row.loan_id} number={row.loan_number} /> },
    { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
    { key: "interest", header: "Profit/Interest", render: (row) => amount(row.interest) },
    { key: "collected", header: "Collected", render: (row) => amount(row.collected) },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} />, value: (row) => row.source },
  ];

  const advanceColumns: Column<AdvanceRow>[] = [
    { key: "date", header: "Date", className: "text-nowrap" },
    { key: "amount", header: "Amount", render: (row) => money(row.amount) },
    { key: "total_payable", header: "Amount + Interest", render: (row) => money(row.total_payable) },
    { key: "paid", header: "Paid", render: (row) => money(row.paid) },
    { key: "remain", header: "Remain", render: (row) => amount(row.remain) },
    { key: "status", header: "Status", render: (row) => <Badge tone={row.status === "active" ? "success" : row.status === "done" ? "primary" : "default"}>{row.status_label}</Badge>, value: (row) => row.status_label },
    { key: "source", header: "Source", render: (row) => <SourceBadge source={row.source} />, value: (row) => row.source },
  ];

  return (
    <>
      <div className="mf-section-title">Credit Summary</div>
      <div className="mf-grid mf-grid-4">
        <Stat label="Total Loans Taken" value={s.total_loans} hint={s.applications_not_disbursed > 0 ? `${s.applications_not_disbursed} application(s) not disbursed` : undefined} />
        <Stat label="Completed Loans" value={s.completed_loans} />
        <Stat label="Active Loans" value={s.active_loans} />
        <Stat label="Defaulted Loans" value={s.defaulted_loans} />
        <Stat label="Total Amount Borrowed" value={money(s.total_borrowed)} hint={s.old_system_borrowed > 0 ? `incl. ${money(s.old_system_borrowed)} legacy Loan Amount (principal + interest)` : undefined} />
        <Stat label="Total Amount Repaid" value={money(s.total_repaid)} hint={s.old_system_repaid > 0 ? `incl. ${money(s.old_system_repaid)} collected by the old system` : undefined} />
        <Stat label="Total Outstanding" value={money(s.total_outstanding)} hint={`Loans ${money(s.outstanding.loans)} · Penalty ${money(s.outstanding.penalty)} · Salary advance ${money(s.outstanding.salary_advance)}`} />
        <Stat label="Total Penalties Charged" value={money(s.total_penalties_charged)} />
        <Stat label="Total Profit/Interest Generated" value={money(s.total_interest)} hint={`${money(s.interest_collected)} collected${data.profit.excluded_legacy_loans > 0 ? " · legacy loans excluded" : ""}`} />
        <Stat label="Current Credit Status" value={<Badge tone={s.credit_status.tone as BadgeTone}>{s.credit_status.label}</Badge>} />
      </div>

      <div className="mf-section-title">Filters</div>
      <div className="mf-grid mf-grid-4">
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-from">From</label>
          <input id="ch-from" type="date" className="form-control" value={filters.from} onChange={(event) => set("from", event.target.value)} />
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-to">To</label>
          <input id="ch-to" type="date" className="form-control" value={filters.to} onChange={(event) => set("to", event.target.value)} />
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-status">Loan Status</label>
          <select id="ch-status" className="form-control" value={filters.status} onChange={(event) => set("status", event.target.value as Filters["status"])}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
            <option value="default">Default</option>
            <option value="arrears">Arrears</option>
          </select>
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-loan">Loan Number</label>
          <input id="ch-loan" type="search" className="form-control" placeholder="Search loan number" value={filters.loanNumber} onChange={(event) => set("loanNumber", event.target.value)} />
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-source">Source</label>
          <select id="ch-source" className="form-control" value={filters.source} onChange={(event) => set("source", event.target.value as Filters["source"])}>
            <option value="">All</option>
            <option value="current">Current System</option>
            <option value="legacy">Legacy System</option>
          </select>
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-branch">Branch</label>
          <select id="ch-branch" className="form-control" value={filters.branchId} onChange={(event) => set("branchId", event.target.value)}>
            <option value="">All</option>
            {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="mf-cell">
          <label className="mf-cell-label" htmlFor="ch-payment">Payment Status</label>
          <select id="ch-payment" className="form-control" value={filters.payment} onChange={(event) => set("payment", event.target.value as Filters["payment"])}>
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        <div className="mf-cell d-flex align-items-end">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!filtered} onClick={() => setFilters(NO_FILTERS)}>Clear filters</button>
        </div>
      </div>
      <div className="mf-cell-help">Filters narrow the tables below; the summary figures always cover the whole history.</div>

      <div className="mf-section-title">Loan History</div>
      <DataTable columns={loanColumns} rows={loans} rowKey={(row) => row.id} emptyMessage="No loans match." />
      <small className="text-muted">Paid and Remain include penalties. Legacy loans carry the old system&apos;s Loan Amount (principal + interest), which was never split: Principal and Profit/Interest are N/A.</small>

      <div className="mf-section-title">Repayment Performance</div>
      <dl className="mf-dl">
        <Detail label="Total Installments">{r.total_instalments}</Detail>
        <Detail label="Paid Installments">{r.paid_instalments}</Detail>
        <Detail label="On-Time Payments">{r.on_time}</Detail>
        <Detail label="Late Payments">{r.late}</Detail>
        <Detail label="Missed Payments">{r.missed}</Detail>
        <Detail label="Arrears Events">{r.arrears_events}</Detail>
        <Detail label="Total Arrears Amount">{money(r.arrears_amount)}</Detail>
        <Detail label="Maximum Days Overdue">{r.max_days_overdue ?? NA}</Detail>
        <Detail label="Times Defaulted">{r.times_defaulted}</Detail>
        <Detail label="On-Time Payment Rate">{r.on_time_rate === null ? NA : `${r.on_time_rate}%`}</Detail>
      </dl>
      <small className="text-muted">
        Payment dates are rebuilt from the repayments in date order. Missed = fallen due and not fully paid; Arrears Amount = still unpaid on due instalments of running loans.
        {r.loans_without_schedule > 0 && ` ${r.loans_without_schedule} loan(s) without an instalment schedule (legacy) are not included.`}
      </small>

      <div className="mf-section-title">Arrears History</div>
      <DataTable columns={arrearsColumns} rows={arrears} rowKey={(row) => row.id} emptyMessage="No instalment has gone past its due date unpaid." />

      <div className="mf-section-title">Default History — Times Defaulted: {data.defaults.times_defaulted}</div>
      <DataTable columns={defaultColumns} rows={defaults} rowKey={(row) => row.loan_id} searchable={defaults.length > 10} emptyMessage="No defaults." />

      <div className="mf-section-title">Penalty History</div>
      <dl className="mf-dl">
        <Detail label="Total Penalties Charged">{money(data.penalties.totals.charged)}</Detail>
        <Detail label="Total Penalties Paid">{money(data.penalties.totals.paid)}</Detail>
        <Detail label="Penalties Outstanding">{money(data.penalties.totals.outstanding)}</Detail>
        <Detail label="Penalty Incidents">{data.penalties.totals.incidents}</Detail>
        {data.penalties.totals.waived > 0 && <Detail label="Waived">{money(data.penalties.totals.waived)}</Detail>}
      </dl>
      <DataTable columns={penaltyColumns} rows={penalties} rowKey={(row) => row.id} emptyMessage="No penalties." />

      <div className="mf-section-title">Profit / Interest History — Total Profit Generated: {money(data.profit.total)}</div>
      <DataTable
        columns={profitColumns}
        rows={profit}
        rowKey={(row) => row.loan_id}
        emptyMessage="No disbursed loans."
        footer={
          <tr>
            <th colSpan={3}>TOTAL{filtered ? " (filtered)" : ""}</th>
            <th>{money(profitTotal)}</th>
            <th>{money(profitCollected)}</th>
            <th />
          </tr>
        }
      />
      {data.profit.excluded_legacy_loans > 0 && <small className="text-muted">Legacy System loans show N/A and are excluded from the total: the old system never separated their interest from principal.</small>}

      <div className="mf-section-title">Salary Advance History</div>
      <dl className="mf-dl">
        <Detail label="Salary Advances">{data.salary_advances.totals.count}</Detail>
        <Detail label="Total Amount">{money(data.salary_advances.totals.amount)}</Detail>
        <Detail label="Total Paid">{money(data.salary_advances.totals.paid)}</Detail>
        <Detail label="Outstanding">{money(data.salary_advances.totals.outstanding)}</Detail>
        <Detail label="Completed">{data.salary_advances.totals.completed}</Detail>
        <Detail label="Active">{data.salary_advances.totals.active}</Detail>
        <Detail label="Defaulted">{data.salary_advances.totals.defaulted ?? NA}</Detail>
      </dl>
      <DataTable columns={advanceColumns} rows={advances} rowKey={(row) => row.id} emptyMessage={filters.loanNumber.trim() || filters.status ? "Loan filters do not apply to salary advances." : "No salary advances."} />

      <div className="mf-section-title">Customer Credit Performance</div>
      <div className="mf-section-box">
        {data.performance.map((line) => <p key={line} className="mb-1">{line}</p>)}
      </div>
    </>
  );
}
