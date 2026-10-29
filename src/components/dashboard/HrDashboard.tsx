"use client";

import { PendingApprovalsPanel } from "@/components/dashboard/PendingApprovalsPanel";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { BRAND, BRAND_SERIES } from "@/lib/brand";
import { useApi } from "@/lib/hooks";

interface PendingRequest {
  id: string;
  type: string;
  type_label: string;
  staff: string | null;
  detail: string | null;
  amount: number;
  date: string;
  status: "Pending" | "Under Review";
  link: string;
}

export interface HrDashboardData {
  month: string;
  month_label: string;
  cards: {
    total_staff: number;
    total_staff_change: number | null;
    active_staff: number;
    active_staff_change: number | null;
    new_staff: number;
    new_staff_change: number | null;
    pending_requests: number;
    pending_requests_amount: number;
    pending_allowances: number;
    pending_allowances_amount: number;
    pending_staff_loans: number;
    pending_staff_loans_amount: number;
    pending_claims: number;
    pending_claims_amount: number;
    payroll_net: number;
    payroll_employees: number;
    payroll_status: string;
  };
  departments: { label: string; count: number; percent: number }[];
  payroll_trend: { month: string; label: string; net: number }[];
  requests_by_type: { key: string; label: string; count: number; percent: number }[];
  staff_fund: { month: string; label: string; contributions: number; benefits_paid: number; pending_claims: number }[];
  payroll_summary: { label: string; amount: number; employees: number }[];
  pending: PendingRequest[];
}

/** Brand palette: red, black and white. */
const C = BRAND;
const DEPARTMENT_COLOURS = BRAND_SERIES;
const TYPE_COLOURS: Record<string, string> = { staff_loan: C.black, salary_advance: C.greyDark, allowance: C.redLight, benefit_claim: C.red, leave: C.redDark, other: C.grey };

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** "142,500,000" → "142.5M" for chart axes and the payroll card. */
const short = (value: number) => (Math.abs(value) >= 1e9 ? `${+(value / 1e9).toFixed(1)}B` : Math.abs(value) >= 1e6 ? `${+(value / 1e6).toFixed(1)}M` : Math.abs(value) >= 1e3 ? `${+(value / 1e3).toFixed(0)}K` : `${value}`);

const ROWS_SHOWN = 5;

/**
 * HR Department dashboard (role HR): staff, the payroll of the selected period and the staff requests waiting for a
 * decision. Every figure comes from GET /dashboard/hr; nothing is computed here.
 */
export function HrDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth);
  const { data, isLoading } = useApi<HrDashboardData>("dashboard/hr", { month });

  return (
    <div className="hd">
      <div className="hd-head">
        <div className="hd-heading">
          <h1 className="hd-title">HR Department</h1>
          <p className="hd-subtitle">Welcome, {user?.full_name}</p>
        </div>
        <label className="hd-filter">
          <span>Payroll Period:</span>
          <i className="icon-calendar" />
          <input type="month" value={month} max={thisMonth()} onChange={(event) => setMonth(event.target.value || thisMonth())} aria-label="Payroll period" />
        </label>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} />}
    </div>
  );
}

function Body({ data }: { data: HrDashboardData }) {
  const k = data.cards;
  const allowances = data.pending.filter((row) => row.type === "allowance");
  const claims = data.pending.filter((row) => row.type === "benefit_claim");

  return (
    <>
      <div className="hd-grid hd-grid-4">
        <StatCard icon="fa fa-users" tone="blue" title="Total Staff" value={money(k.total_staff)} change={k.total_staff_change} href="/hrm/staff" />
        <StatCard icon="fa fa-user" tone="green" title="Active Staff" value={money(k.active_staff)} change={k.active_staff_change} href="/hrm/staff" />
        <StatCard icon="fa fa-user-plus" tone="blue" title="New Staff This Month" value={money(k.new_staff)} change={k.new_staff_change} href="/hrm/staff" />
        <StatCard icon="fa fa-file-text-o" tone="orange" title="Pending Staff Requests" value={money(k.pending_requests)} note={`TZS ${money(k.pending_requests_amount)}`} />
        <StatCard icon="fa fa-database" tone="yellow" title="Pending Allowances" value={money(k.pending_allowances)} note={`TZS ${money(k.pending_allowances_amount)}`} href="/hrm/allowances" />
        <StatCard icon="fa fa-money" tone="red" title="Pending Staff Loans / Advances" value={money(k.pending_staff_loans)} note={`TZS ${money(k.pending_staff_loans_amount)}`} href="/hrm/staff-loans" />
        <StatCard icon="fa fa-shield" tone="purple" title="Pending Benefits Claims" value={money(k.pending_claims)} note={`TZS ${money(k.pending_claims_amount)}`} href="/hrm/staff-fund" />
        <StatCard icon="fa fa-calculator" tone="blue" title={`Payroll - ${data.month_label}`} value={`TZS ${short(k.payroll_net)}`} note={`${money(k.payroll_employees)} Employees · ${k.payroll_status}`} href="/hrm/salary-sheet" />
      </div>

      <div className="hd-grid hd-grid-3">
        <Panel title="Staff by Department">
          <Departments rows={data.departments} />
        </Panel>

        <Panel title="Payroll Cost Trend (TZS)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.payroll_trend} margin={{ top: 24, right: 16, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="hd-payroll-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-red)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--brand-red)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--mf-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} />
              <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} />
              <Area type="linear" dataKey="net" name="Net Salary" stroke={C.red} strokeWidth={2} fill="url(#hd-payroll-fill)" dot={{ r: 4, fill: C.red }}>
                <LabelList dataKey="net" position="top" formatter={(value) => short(Number(value))} style={{ fill: "var(--mf-heading)", fontSize: 11 }} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Staff Requests by Type (This Month)">
          <ul className="hd-bars">
            {data.requests_by_type.map((row) => {
              const max = Math.max(1, ...data.requests_by_type.map((item) => item.count));
              return (
                <li key={row.key}>
                  <span className="hd-bar-label">{row.label}</span>
                  <span className="hd-bar-track"><span style={{ width: `${(row.count / max) * 100}%`, background: TYPE_COLOURS[row.key] ?? C.grey }} /></span>
                  <span className="hd-bar-value"><b>{row.count}</b> ({row.percent.toFixed(0)}%)</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="hd-grid hd-grid-wide">
        <Panel title="Staff Fund Contributions vs Benefits (TZS)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.staff_fund} margin={{ top: 18, right: 6, left: -4, bottom: 0 }} barGap={3}>
              <CartesianGrid vertical={false} stroke="var(--mf-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} />
              <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} cursor={{ fill: "var(--mf-surface-hover)" }} />
              <Legend verticalAlign="top" iconType="square" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              <Bar dataKey="contributions" name="Staff Contribution" fill={C.black} maxBarSize={18} />
              <Bar dataKey="benefits_paid" name="Benefits Paid" fill={C.redLight} maxBarSize={18} />
              <Bar dataKey="pending_claims" name="Pending Claims" fill={C.red} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Payroll Summary – ${data.month_label}`} action={<Link href="/hrm/salary-sheet" className="hd-link">View Details</Link>}>
          <div className="table-responsive">
            <table className="table hd-table hd-summary mb-0">
              <thead>
                <tr><th>Item</th><th className="text-right">Amount (TZS)</th><th className="text-right">Employees</th></tr>
              </thead>
              <tbody>
                {data.payroll_summary.map((row) => (
                  <tr key={row.label} className={row.label === "Net Salary" ? "hd-total" : undefined}>
                    <td>{row.label}</td>
                    <td className="text-right">{money(row.amount)}</td>
                    <td className="text-right">{money(row.employees)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="hd-grid hd-grid-3">
        <RequestTable
          title="Pending Staff Requests"
          viewAll="/hrm/staff-loans"
          headings={["Staff Name", "Request Type", "Amount (TZS)", "Date", "Status"]}
          rows={data.pending}
          cells={(row) => [row.staff ?? "—", row.type_label, row.amount > 0 ? money(row.amount) : "—", row.date]}
        />
        <RequestTable
          title="Pending Allowances"
          viewAll="/hrm/allowances"
          headings={["Staff Name", "Reason", "Amount (TZS)", "Status"]}
          rows={allowances}
          cells={(row) => [row.staff ?? "—", row.detail ?? "—", money(row.amount)]}
        />
        <RequestTable
          title="Pending Benefits Claims"
          viewAll="/hrm/staff-fund"
          headings={["Staff Name", "Reason", "Amount (TZS)", "Status"]}
          rows={claims}
          cells={(row) => [row.staff ?? "—", row.detail ?? "—", money(row.amount)]}
        />
      </div>

      <PendingApprovalsPanel />
    </>
  );
}

function StatCard({ icon, tone, title, value, change, note, href }: { icon: string; tone: string; title: string; value: string; change?: number | null; note?: string; href?: string }) {
  const body = (
    <>
      <span className={`hd-icon is-${tone}`}><i className={icon} /></span>
      <div className="hd-stat-body">
        <div className="hd-stat-title">{title}</div>
        <div className="hd-stat-value">{value}</div>
        {note !== undefined ? (
          <div className="hd-stat-note">{note}</div>
        ) : (
          <div className="hd-stat-note">
            {change === null || change === undefined ? (
              <span className="hd-change">—</span>
            ) : (
              <span className={`hd-change ${change >= 0 ? "up" : "down"}`}>
                <i className={`fa fa-arrow-${change >= 0 ? "up" : "down"}`} /> {Math.abs(change).toFixed(1)}%
              </span>
            )}
            <span>vs last month</span>
          </div>
        )}
      </div>
    </>
  );

  // Summary cards show figures only (enhancement §11.1); `href` is kept at the call sites but no longer followed.
  void href;
  return <div className="hd-card hd-stat">{body}</div>;
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="hd-card hd-panel">
      <div className="hd-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Departments({ rows }: { rows: HrDashboardData["departments"] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return <p className="hd-empty">No active staff.</p>;
  }

  return (
    <div className="hd-donut-wrap">
      <div className="hd-donut">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={rows} dataKey="count" nameKey="label" innerRadius="58%" outerRadius="95%" stroke="var(--mf-surface)" strokeWidth={2}>
              {rows.map((row, index) => <Cell key={row.label} fill={DEPARTMENT_COLOURS[index % DEPARTMENT_COLOURS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="hd-donut-centre">
          <b>{money(total)}</b>
          <span>Active Staff</span>
        </div>
      </div>
      <ul className="hd-legend">
        {rows.map((row, index) => (
          <li key={row.label}>
            <i style={{ background: DEPARTMENT_COLOURS[index % DEPARTMENT_COLOURS.length] }} />
            <span className="hd-legend-label">{row.label}</span>
            <b>{row.count}</b>
            <small>({row.percent.toFixed(0)}%)</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestTable({ title, viewAll, headings, rows, cells }: { title: string; viewAll: string; headings: string[]; rows: PendingRequest[]; cells: (row: PendingRequest) => ReactNode[] }) {
  return (
    <Panel title={title} action={<Link href={viewAll} className="hd-link">View All</Link>}>
      <div className="table-responsive">
        <table className="table hd-table mb-0">
          <thead>
            <tr>
              <th>#</th>
              {headings.map((heading) => <th key={heading}>{heading}</th>)}
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={headings.length + 2} className="hd-empty">Nothing waiting.</td></tr>}
            {rows.slice(0, ROWS_SHOWN).map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                {cells(row).map((cell, column) => <td key={column}>{cell}</td>)}
                <td><span className={`hd-status ${row.status === "Pending" ? "is-pending" : "is-review"}`}>{row.status}</span></td>
                <td><Link href={row.link} className="hd-view">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
