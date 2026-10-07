"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";
import { SelectBox } from "@/components/ui/SelectBox";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface Performance {
  label: string;
  applications: number;
  approved: number;
  rejection_percent: number;
  arrears_percent?: number;
}

export interface CreditDashboardData {
  month: string;
  month_label: string;
  year: number;
  cards: {
    applications: number;
    applications_customers: number;
    approved: number;
    approved_customers: number;
    rejected: number;
    rejected_customers: number;
    active_loans: number;
    active_customers: number;
  };
  applications_trend: { month: string; label: string; applied: number; approved: number; rejected: number }[];
  collection_trend: { month: string; label: string; expected: number; collected: number; unpaid: number }[];
  approvals: { key: string; label: string; count: number; status: string; tone: "warning" | "danger"; link: string | null }[];
  today: { expected: number; expected_accounts: number; collected: number; collected_accounts: number; unpaid: number; unpaid_accounts: number };
  payment_mandate: { total: number; collected: number; unpaid: number; collected_percent: number; unpaid_percent: number };
  officers: (Performance & { arrears_percent: number })[];
  branches: { label: string; active_loans: number; arrears_percent: number; default_percent: number }[];
  customer_types: { label: string; applications: number; approved: number; default_percent: number }[];
}

/** Series colours of the Credit Department design: black, grey and the brand red. */
const SERIES = { dark: "var(--cd-series-dark)", grey: "var(--cd-series-grey)", red: "var(--cd-red)" };

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** "180,000,000" → "180M" for chart axes. */
const short = (value: number) => (Math.abs(value) >= 1e9 ? `${+(value / 1e9).toFixed(1)}B` : Math.abs(value) >= 1e6 ? `${+(value / 1e6).toFixed(1)}M` : Math.abs(value) >= 1e3 ? `${+(value / 1e3).toFixed(0)}K` : `${value}`);

/**
 * Credit Department dashboard (role Credit Officer): applications, the approval pipeline, today's collections and portfolio
 * quality per officer, branch and customer type. Every figure comes from GET /dashboard/credit; nothing is computed here.
 */
export function CreditDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth);
  const [branchId, setBranchId] = useState("");
  const { data, isLoading } = useApi<CreditDashboardData>("dashboard/credit", { month, branch_id: branchId || undefined });

  return (
    <div className="cd">
      <div className="cd-head">
        <div className="cd-heading">
          <h1 className="cd-title">Credit Department</h1>
          <p className="cd-subtitle">Welcome, {user?.full_name}</p>
        </div>
        <div className="cd-filters">
          <label className="cd-filter">
            <i className="icon-calendar" />
            <input type="month" value={month} max={thisMonth()} onChange={(event) => setMonth(event.target.value || thisMonth())} aria-label="Month" />
          </label>
          <div className="cd-filter cd-filter-branch">
            <SelectBox inputId="cd-branch" placeholder="All Branches" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => setBranchId(value ?? "")} />
          </div>
        </div>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} />}
    </div>
  );
}

function Body({ data }: { data: CreditDashboardData }) {
  const k = data.cards;
  const t = data.today;
  const m = data.payment_mandate;

  return (
    <>
      <div className="cd-grid cd-grid-4">
        <KpiCard title="Total Loan Applications" value={k.applications} customers={k.applications_customers} red href="/loans/pending" />
        <KpiCard title="Approved Loans" value={k.approved} customers={k.approved_customers} href="/loans/withdrawal" />
        <KpiCard title="Rejected Loans" value={k.rejected} customers={k.rejected_customers} red href="/loans/rejected" />
        <KpiCard title="Active Loans (Portfolio)" value={k.active_loans} customers={k.active_customers} href="/loans/disbursed" />
      </div>

      <div className="cd-grid cd-grid-3">
        <Panel title={`Loan Applications Trend (Year ${data.year})`} chip={String(data.year)}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.applications_trend} margin={{ top: 10, right: 6, left: -12, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--mf-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={40} />
              <Tooltip cursor={{ fill: "var(--mf-surface-hover)" }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="applied" name="Applied" fill={SERIES.dark} maxBarSize={12} />
              <Bar dataKey="approved" name="Approved" fill={SERIES.grey} maxBarSize={12} />
              <Bar dataKey="rejected" name="Rejected" fill={SERIES.red} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Collection vs Outstanding (Year ${data.year})`} chip={String(data.year)}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.collection_trend} margin={{ top: 10, right: 6, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="var(--mf-border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} interval={0} />
              <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} />
              <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} cursor={{ fill: "var(--mf-surface-hover)" }} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="expected" name="Expected Collection" fill={SERIES.dark} maxBarSize={12} />
              <Bar dataKey="collected" name="Actual Collection" fill={SERIES.grey} maxBarSize={12} />
              <Bar dataKey="unpaid" name="Unpaid / Outstanding" fill={SERIES.red} maxBarSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Pending Approvals / Applications" action={<Link href="/loans/pending" className="cd-view-all">View All</Link>}>
          <Approvals rows={data.approvals} />
        </Panel>
      </div>

      <div className="cd-grid cd-grid-4">
        <MoneyCard title="Today's Expected Collection" amount={t.expected} accounts={t.expected_accounts} red />
        <MoneyCard title="Collected Today" amount={t.collected} accounts={t.collected_accounts} />
        <MoneyCard title="Unpaid / Outstanding Today" amount={t.unpaid} accounts={t.unpaid_accounts} red />
        <div className="cd-card cd-kpi">
          <div className="cd-card-title">Total Payment Mandate ({data.year})</div>
          <div className="cd-mandate-total">TZS {money(m.total)}</div>
          <ul className="cd-mandate">
            <li>
              <i className="is-dark" /> <span>Collected</span> <b>TZS {money(m.collected)}</b> <em className="is-good">{m.collected_percent.toFixed(1)}%</em>
            </li>
            <li>
              <i className="is-red" /> <span>Unpaid</span> <b>TZS {money(m.unpaid)}</b> <em className="is-bad">{m.unpaid_percent.toFixed(1)}%</em>
            </li>
          </ul>
          <small className="cd-note">Instalments due from 1 January to today.</small>
        </div>
      </div>

      <div className="cd-grid cd-grid-3">
        <TablePanel
          title="Loan Officer Performance (Portfolio Quality)"
          headings={["Loan Officer", "Applications", "Approved", "Rejection %", "Arrears %"]}
          rows={data.officers.map((row) => [row.label, row.applications, row.approved, <Rate key="r" value={row.rejection_percent} />, <Rate key="a" value={row.arrears_percent} />])}
          empty="No applications this month."
        />
        <TablePanel
          title="Branch Performance (Repayment)"
          headings={["Branch", "Active Loans", "Arrears %", "Default %"]}
          rows={data.branches.map((row) => [row.label, money(row.active_loans), <Rate key="a" value={row.arrears_percent} />, <Rate key="d" value={row.default_percent} />])}
          empty="No active loans."
        />
        <TablePanel
          title="Customer Type Performance"
          headings={["Customer Type", "Applications", "Approved", "Default %"]}
          rows={data.customer_types.map((row) => [row.label, row.applications, row.approved, <Rate key="d" value={row.default_percent} />])}
          empty="No applications or loans."
        />
      </div>
    </>
  );
}

function KpiCard({ title, value, customers, red, href }: { title: string; value: number; customers: number; red?: boolean; href: string }) {
  return (
    <Link href={href} className="cd-card cd-kpi cd-link">
      <div className="cd-card-title">{title}</div>
      <div className="cd-kpi-row">
        <span className={`cd-kpi-value${red ? " is-red" : ""}`}>{money(value)}</span>
        <span className="cd-kpi-side">
          <b>{money(customers)}</b>
          <small>Customers</small>
        </span>
      </div>
    </Link>
  );
}

function MoneyCard({ title, amount, accounts, red }: { title: string; amount: number; accounts: number; red?: boolean }) {
  return (
    <div className="cd-card cd-kpi">
      <div className="cd-card-title">{title}</div>
      <div className="cd-kpi-row">
        <span className={`cd-kpi-value cd-kpi-money${red ? " is-red" : ""}`}>TZS {money(amount)}</span>
        <span className="cd-kpi-side">
          <b>{money(accounts)}</b>
          <small>Accounts</small>
        </span>
      </div>
    </div>
  );
}

function Panel({ title, chip, action, children }: { title: string; chip?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="cd-card cd-panel">
      <div className="cd-panel-head">
        <h3>{title}</h3>
        {chip && <span className="cd-chip">{chip}</span>}
        {action}
      </div>
      {children}
    </div>
  );
}

/** Red when a rate is worth attention, as on the design. */
function Rate({ value }: { value: number }) {
  return <span className={value > 0 ? "cd-rate is-bad" : "cd-rate"}>{value.toFixed(1)}%</span>;
}

const VISIBLE_ROWS = 5;

/** A performance table showing its first rows; View All opens every row in a popup. */
function TablePanel({ title, headings, rows, empty }: { title: string; headings: string[]; rows: ReactNode[][]; empty: string }) {
  const [open, setOpen] = useState(false);
  const table = (list: ReactNode[][]) => (
    <div className="table-responsive">
      <table className="table cd-table mb-0">
        <thead>
          <tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={headings.length} className="cd-empty">{empty}</td></tr>}
          {list.map((row, index) => (
            <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Panel title={title} action={rows.length > VISIBLE_ROWS && <button type="button" className="cd-view-all" onClick={() => setOpen(true)}>View All</button>}>
      {table(rows.slice(0, VISIBLE_ROWS))}
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        {table(rows)}
      </Modal>
    </Panel>
  );
}

const APPROVAL_ICONS: Record<string, string> = {
  applications: "fa fa-file-text-o",
  disbursements: "fa fa-database",
  credit_review: "fa fa-file-o",
  top_ups: "fa fa-plus-circle",
  mandates: "fa fa-refresh",
  disbursement_issues: "fa fa-exclamation-circle",
  returned: "fa fa-exclamation-triangle",
};

/** The panel is a brief: only its first rows fit the card without a scroll — View All opens the full list. */
const APPROVALS_SHOWN = 5;

function Approvals({ rows }: { rows: CreditDashboardData["approvals"] }) {
  return (
    <ul className="cd-approvals">
      {rows.slice(0, APPROVALS_SHOWN).map((row) => (
        <li key={row.key}>
          <i className={`${APPROVAL_ICONS[row.key] ?? "fa fa-file-o"} cd-approval-icon`} />
          <b className="cd-approval-count">{row.count}</b>
          <span className="cd-approval-label">{row.label}</span>
          <span className={`cd-approval-status ${row.tone}`}>{row.status}</span>
          {row.link ? (
            <Link href={row.link} className="cd-arrow" aria-label={`Open ${row.label}`}>
              <i className="fa fa-chevron-right" />
            </Link>
          ) : (
            <span className="cd-arrow is-disabled" aria-hidden="true"><i className="fa fa-chevron-right" /></span>
          )}
        </li>
      ))}
    </ul>
  );
}
