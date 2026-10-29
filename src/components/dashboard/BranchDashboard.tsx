"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Loading } from "@/components/ui/Loading";
import { SelectBox } from "@/components/ui/SelectBox";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface Figure {
  count: number;
  amount: number;
}

interface TypeFigures {
  active_count: number;
  active_amount: number;
  arrears_count: number;
  arrears_amount: number;
  default_count: number;
  default_amount: number;
  outstanding: number;
}

export interface BranchDashboardData {
  month: string;
  month_label: string;
  cards: { active: Figure; arrears: Figure; default: Figure; outstanding: Figure & { change: number | null } };
  petty_cash: { amount: number; change: number | null };
  today: {
    collection: { amount: number; loans: number; change: number | null };
    disbursement: { amount: number; loans: number; change: number | null };
  };
  customer_types: {
    rows: (TypeFigures & { id: number; label: string; customers: number })[];
    total: TypeFigures & { customers: number };
  };
  approvals: { key: string; label: string; count: number; status: string; tone: "warning" | "danger"; link: string | null }[];
  pipeline: { key: string; label: string; count: number; amount: number }[];
}

/** One colour per customer type, in the order of the design: red, black, yellow, green, grey (then repeated). */
const TYPE_COLOURS = ["var(--bd-type-1)", "var(--bd-type-2)", "var(--bd-type-3)", "var(--bd-type-4)", "var(--bd-type-5)"];
const typeColour = (index: number) => TYPE_COLOURS[index % TYPE_COLOURS.length];

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** "85,400,000" → "85.4M" for chart labels. */
const short = (value: number) => (Math.abs(value) >= 1e9 ? `${+(value / 1e9).toFixed(1)}B` : Math.abs(value) >= 1e6 ? `${+(value / 1e6).toFixed(1)}M` : Math.abs(value) >= 1e3 ? `${+(value / 1e3).toFixed(0)}K` : `${value}`);

/**
 * Branch dashboard (Teller, Loan Officer, Branch Manager): the loan book of the employee's branch, petty cash, today's
 * collection and disbursement, the portfolio per customer type, the approval queue and the month's pipeline. Every figure
 * comes from GET /dashboard/branch; nothing is computed here.
 */
export function BranchDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth);
  const [branchId, setBranchId] = useState("");
  const { data, isLoading } = useApi<BranchDashboardData>("dashboard/branch", { month, branch_id: branchId || undefined });

  return (
    <div className="cd bd">
      <div className="cd-head">
        <div className="cd-heading">
          <h1 className="cd-title">Dashboard</h1>
          <p className="cd-subtitle">Welcome, {user?.full_name}</p>
        </div>
        <div className="cd-filters">
          <label className="cd-filter">
            <i className="icon-calendar" />
            <input type="month" value={month} max={thisMonth()} onChange={(event) => setMonth(event.target.value || thisMonth())} aria-label="Month" />
          </label>
          <div className="cd-filter cd-filter-branch">
            <SelectBox inputId="bd-branch" placeholder="My Branch" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => setBranchId(value ?? "")} />
          </div>
        </div>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} />}
    </div>
  );
}

function Body({ data }: { data: BranchDashboardData }) {
  const k = data.cards;
  const t = data.today;

  return (
    <>
      <div className="cd-grid cd-grid-4">
        <BookCard title="Active Loans" figure={k.active} href="/loans/disbursed" />
        <BookCard title="Arrears Loans" figure={k.arrears} href="/reports/arrears" />
        <BookCard title="Default Loans" figure={k.default} href="/reports/default" filled />
        <BookCard title="Total Outstanding" figure={k.outstanding} change={k.outstanding.change} href="/reports/portfolio" />
      </div>

      <div className="bd-main">
        <div className="bd-today">
          <TodayCard title="Petty Cash" amount={data.petty_cash.amount} change={data.petty_cash.change} href="/expenses/requests" />
          <TodayCard title="Today's Collection" amount={t.collection.amount} loans={t.collection.loans} change={t.collection.change} href="/reports/received" />
          <TodayCard title="Today's Disbursement" amount={t.disbursement.amount} loans={t.disbursement.loans} change={t.disbursement.change} href="/loans/withdrawal" />
        </div>

        <Panel title="Customer Portfolio by Type" className="bd-portfolio">
          <PortfolioTable data={data.customer_types} />
        </Panel>

        <Panel title="Pending Approvals / Applications" className="bd-approvals" action={<Link href="/loans/pending" className="cd-view-all">View All</Link>}>
          <Approvals rows={data.approvals} />
        </Panel>
      </div>

      <div className="bd-charts">
        <Panel title="Portfolio Outstanding by Customer Type (TZS)">
          <OutstandingChart rows={data.customer_types.rows} />
        </Panel>
        <Panel title="Customer Type Distribution">
          <Distribution rows={data.customer_types.rows} total={data.customer_types.total.customers} />
        </Panel>
      </div>

      <Panel title={`Loan Applications Pipeline (${data.month_label})`}>
        <Pipeline stages={data.pipeline} />
      </Panel>
    </>
  );
}

function Change({ value, compare }: { value: number | null; compare: string }) {
  if (value === null) {
    return null;
  }
  const up = value >= 0;
  return (
    <span className="bd-change">
      <b className={up ? "is-up" : "is-down"}>
        <i className={`fa fa-arrow-${up ? "up" : "down"}`} /> {Math.abs(value).toFixed(1)}%
      </b>
      <small>{compare}</small>
    </span>
  );
}

/** Summary card: figures only, not clickable (enhancement §11.1). */
export function BookCard({ title, figure, change, filled }: { title: string; figure: Figure; change?: number | null; href?: string; filled?: boolean }) {
  return (
    <div className={`cd-card bd-book${filled ? " is-filled" : ""}`}>
      <div className="bd-book-value">
        <span>TZS {money(figure.amount)}</span>
        <i aria-hidden="true">|</i>
        <span className="bd-book-count">{money(figure.count)}</span>
      </div>
      <div className="bd-book-foot">
        <span className="bd-book-title">{title}</span>
        <Change value={change ?? null} compare="vs last month" />
      </div>
    </div>
  );
}

/** Summary card: figures only, not clickable (enhancement §11.1). */
export function TodayCard({ title, amount, loans, change }: { title: string; amount: number; loans?: number; change: number | null; href?: string }) {
  return (
    <div className="cd-card cd-kpi bd-today-card">
      <div className="cd-card-title">{title}</div>
      <div className="bd-today-row">
        <span className="bd-today-value">TZS {money(amount)}</span>
        {loans !== undefined && <span className="bd-today-loans" title="Loans">{money(loans)}</span>}
        <Change value={change} compare="vs yesterday" />
      </div>
    </div>
  );
}

export function Panel({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={`cd-card cd-panel${className ? ` ${className}` : ""}`}>
      <div className="cd-panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** "45 | TZS 72,000,000" — number of loans and what is still owed on them. */
function Pair({ count, amount }: { count: number; amount: number }) {
  return (
    <>
      <td className="bd-count">{money(count)}</td>
      <td className="bd-amount">TZS {money(amount)}</td>
    </>
  );
}

function PortfolioTable({ data }: { data: BranchDashboardData["customer_types"] }) {
  const total = data.total;
  return (
    <div className="table-responsive">
      <table className="table cd-table bd-table mb-0">
        <thead>
          <tr>
            <th>#</th>
            <th>Customer Type</th>
            <th colSpan={2}>Active Loans</th>
            <th colSpan={2}>Arrears Loans</th>
            <th colSpan={2}>Default Loans</th>
            <th className="text-right">Total Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 && <tr><td colSpan={9} className="cd-empty">No customers in this branch yet.</td></tr>}
          {data.rows.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>{row.label} ({money(row.customers)})</td>
              <Pair count={row.active_count} amount={row.active_amount} />
              <Pair count={row.arrears_count} amount={row.arrears_amount} />
              <Pair count={row.default_count} amount={row.default_amount} />
              <td className="text-right font-weight-bold">TZS {money(row.outstanding)}</td>
            </tr>
          ))}
        </tbody>
        {data.rows.length > 0 && (
          <tfoot>
            <tr>
              <td />
              <td>TOTAL ({money(total.customers)})</td>
              <Pair count={total.active_count} amount={total.active_amount} />
              <Pair count={total.arrears_count} amount={total.arrears_amount} />
              <Pair count={total.default_count} amount={total.default_amount} />
              <td className="text-right">TZS {money(total.outstanding)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function OutstandingChart({ rows }: { rows: BranchDashboardData["customer_types"]["rows"] }) {
  if (rows.every((row) => row.outstanding === 0)) {
    return <p className="cd-empty">No loans outstanding.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 24, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--mf-border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} interval={0} />
        <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} />
        <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} cursor={{ fill: "var(--mf-surface-hover)" }} />
        <Bar dataKey="outstanding" name="Total Outstanding" maxBarSize={72}>
          {rows.map((row, index) => <Cell key={row.id} fill={typeColour(index)} />)}
          <LabelList dataKey="outstanding" position="top" formatter={(value) => short(Number(value))} style={{ fill: "var(--mf-heading)", fontWeight: 700, fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Distribution({ rows, total }: { rows: BranchDashboardData["customer_types"]["rows"]; total: number }) {
  if (total === 0) {
    return <p className="cd-empty">No customers in this branch yet.</p>;
  }
  return (
    <div className="bd-donut">
      <div className="bd-donut-chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={rows} dataKey="customers" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1} stroke="none">
              {rows.map((row, index) => <Cell key={row.id} fill={typeColour(index)} />)}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="bd-donut-centre">
          <b>{money(total)}</b>
          <small>Total Customers</small>
        </div>
      </div>
      <ul className="bd-legend">
        {rows.map((row, index) => (
          <li key={row.id}>
            <i style={{ background: typeColour(index) }} />
            <span>{row.label}</span>
            <b>{money(row.customers)}</b>
            <em>({Math.round((row.customers / total) * 100)}%)</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pipeline({ stages }: { stages: BranchDashboardData["pipeline"] }) {
  return (
    <div className="bd-pipeline">
      {stages.map((stage, index) => (
        <div key={stage.key} className="bd-stage-wrap">
          {index > 0 && <i className="fa fa-chevron-right bd-stage-arrow" aria-hidden="true" />}
          <div className={`bd-stage is-${stage.key}`}>
            <span>{stage.label}</span>
            <b>{money(stage.count)}</b>
            <small>TZS {money(stage.amount)}</small>
          </div>
        </div>
      ))}
    </div>
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

export function Approvals({ rows }: { rows: BranchDashboardData["approvals"] }) {
  return (
    <ul className="cd-approvals">
      {rows.slice(0, APPROVALS_SHOWN).map((row) => (
        <li key={row.key}>
          <i className={`${APPROVAL_ICONS[row.key] ?? "fa fa-file-o"} cd-approval-icon`} />
          <b className={`cd-approval-count${row.count > 0 ? " mf-pending-alert" : ""}`}>{row.count}</b>
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
