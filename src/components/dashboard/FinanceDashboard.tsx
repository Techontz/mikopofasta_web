"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Loading } from "@/components/ui/Loading";
import { SelectBox } from "@/components/ui/SelectBox";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface Line {
  key: string;
  label: string;
  amount: number;
}

export interface FinanceDashboardData {
  month: string;
  month_label: string;
  cards: {
    cash_balance: number;
    cash_balance_change: number | null;
    disbursed_today: number;
    disbursed_today_change: number | null;
    collected_today: number;
    collected_today_change: number | null;
    loan_outstanding: number;
    loan_outstanding_change: number | null;
    expected_month: number;
    collected_month: number;
    collected_month_percent: number;
    arrears_within_term: number;
    arrears_percent: number;
    default_outstanding: number;
    default_percent: number;
  };
  expected_vs_actual: { expected: number; actual: number; cash: number; offset: number; outstanding: number };
  payment_methods: { total: number; rows: (Line & { percent: number })[] };
  channels: { label: string; channel: string; expected: number; collected: number; clients: number }[];
  income_expenses: { income: Line[]; expenses: Line[]; total_income: number; total_expenses: number; net: number; net_change: number | null };
  cash_flow: { opening: number; cash_in: number; cash_out: number; closing: number };
  approvals: { workflow: string; label: string; count: number; amount: number; status: string; link: string }[];
}

/** Colours of the design (Finance dashboard mock-up). */
const C = { blue: "#1d6ff2", green: "#16a34a", orange: "#f59e0b", red: "#ef4444", purple: "#8b5cf6", navy: "#0b3b82", grey: "#8a9099", sky: "#4f8ef7" };

const METHOD_COLOURS: Record<string, string> = { bank: C.navy, mobile: C.green, cash: "#facc15", offset: C.blue, other: C.grey };

const thisMonth = () => new Date().toISOString().slice(0, 7);

/** "180,000,000" → "180M" for chart axes. */
const short = (value: number) => (Math.abs(value) >= 1e9 ? `${+(value / 1e9).toFixed(1)}B` : Math.abs(value) >= 1e6 ? `${+(value / 1e6).toFixed(1)}M` : Math.abs(value) >= 1e3 ? `${+(value / 1e3).toFixed(0)}K` : `${value}`);

/**
 * Finance Dashboard (role Finance only): the month's cash, collections, portfolio, income and expenses for the whole
 * company or one branch. Every figure comes from GET /dashboard/finance; nothing is computed or invented here.
 */
export function FinanceDashboard() {
  const [month, setMonth] = useState(thisMonth);
  const [branchId, setBranchId] = useState("");
  const { data, isLoading } = useApi<FinanceDashboardData>("dashboard/finance", { month, branch_id: branchId || undefined });

  return (
    <div className="fd">
      <div className="fd-head">
        <div>
          <h1 className="fd-title">Finance Dashboard</h1>
          <p className="fd-subtitle">Overview of financial performance and cash flow</p>
        </div>
        <div className="fd-filters">
          <label className="fd-filter">
            <i className="icon-calendar" />
            <input type="month" value={month} max={thisMonth()} onChange={(event) => setMonth(event.target.value || thisMonth())} aria-label="Month" />
          </label>
          <div className="fd-filter fd-filter-branch">
            <SelectBox inputId="fd-branch" placeholder="All Branches" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => setBranchId(value ?? "")} />
          </div>
        </div>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} />}
    </div>
  );
}

function Body({ data }: { data: FinanceDashboardData }) {
  const k = data.cards;
  const monthLabel = data.month_label;

  return (
    <>
      <div className="fd-grid fd-grid-4">
        <StatCard icon="fa fa-briefcase" tone={C.blue} title="Total Cash & Account Balance" value={k.cash_balance} change={k.cash_balance_change} compare="vs last month" href="/reports/cash-flow" />
        <StatCard icon="fa fa-paper-plane" tone={C.red} title="Disbursed Today" value={k.disbursed_today} change={k.disbursed_today_change} compare="vs yesterday" href="/loans/disbursed" />
        <StatCard icon="fa fa-bar-chart" tone={C.green} title="Collection Today" value={k.collected_today} change={k.collected_today_change} compare="vs yesterday" href="/reports/collections" />
        <StatCard icon="fa fa-database" tone={C.purple} title="Total Loan Outstanding" value={k.loan_outstanding} change={k.loan_outstanding_change} compare="vs last month" href="/reports/portfolio" />
      </div>

      <div className="fd-grid fd-grid-4">
        <ProgressCard icon="fa fa-calendar" tone={C.blue} title="Expected This Month" value={k.expected_month} percent={k.collected_month_percent} href="/reports/collections" />
        <ProgressCard icon="fa fa-database" tone={C.green} title="Actual Collection This Month" value={k.collected_month} percent={k.collected_month_percent} href="/reports/collections" />
        <ProgressCard icon="fa fa-clock-o" tone={C.orange} title="Arrears (Within Term)" value={k.arrears_within_term} percent={k.arrears_percent} href="/reports/arrears" />
        <ProgressCard icon="fa fa-exclamation-triangle" tone={C.red} title="Default (Overdue)" value={k.default_outstanding} percent={k.default_percent} href="/reports/default" />
      </div>

      <div className="fd-grid fd-grid-3">
        <Panel title="Expected vs Actual Collection" period={monthLabel}>
          <ExpectedVsActual data={data.expected_vs_actual} />
        </Panel>
        <Panel title="Collection by Payment Method" period={monthLabel}>
          <PaymentMethods data={data.payment_methods} />
        </Panel>
        <Panel title="Collection by Bank / Channel" period={monthLabel}>
          <Channels rows={data.channels} />
        </Panel>
      </div>

      <div className="fd-grid fd-grid-3">
        <Panel title="Income vs Expenses" period={monthLabel}>
          <IncomeExpenses data={data.income_expenses} />
        </Panel>
        <Panel title="Cash Flow" period={monthLabel}>
          <CashFlow data={data.cash_flow} />
        </Panel>
        <Panel title="Pending Approvals / Applications" action={<Link href="/approvals" className="fd-view-all">View All</Link>}>
          <Approvals rows={data.approvals} />
        </Panel>
      </div>
    </>
  );
}

function IconTile({ icon, tone }: { icon: string; tone: string }) {
  return (
    <span className="fd-icon" style={{ color: tone, background: `${tone}1f` }}>
      <i className={icon} />
    </span>
  );
}

function Arrow({ href }: { href: string }) {
  return (
    <Link href={href} className="fd-arrow" aria-label="Open the detail">
      <i className="fa fa-chevron-right" />
    </Link>
  );
}

function Change({ value, compare }: { value: number | null; compare: string }) {
  if (value === null) {
    return <span className="fd-compare">No figure to compare {compare.replace("vs ", "with ")}</span>;
  }
  const up = value >= 0;
  return (
    <>
      <span className={`fd-change ${up ? "up" : "down"}`}>
        <i className={`fa fa-arrow-${up ? "up" : "down"}`} /> {Math.abs(value).toFixed(1)}%
      </span>
      <span className="fd-compare">{compare}</span>
    </>
  );
}

function StatCard({ icon, tone, title, value, change, compare, href }: { icon: string; tone: string; title: string; value: number; change: number | null; compare: string; href: string }) {
  return (
    <div className="fd-card fd-stat">
      <IconTile icon={icon} tone={tone} />
      <div className="fd-stat-body">
        <div className="fd-stat-title">{title}</div>
        <div className="fd-stat-value">TZS {money(value)}</div>
        <div className="fd-stat-foot">
          <Change value={change} compare={compare} />
          <Arrow href={href} />
        </div>
      </div>
    </div>
  );
}

function ProgressCard({ icon, tone, title, value, percent, href }: { icon: string; tone: string; title: string; value: number; percent: number; href: string }) {
  return (
    <div className="fd-card fd-stat">
      <IconTile icon={icon} tone={tone} />
      <div className="fd-stat-body">
        <div className="fd-stat-title">{title}</div>
        <div className="fd-stat-value">TZS {money(value)}</div>
        <div className="fd-stat-foot">
          <div className="fd-progress" title="Share of the instalments expected this month">
            <span style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: tone }} />
          </div>
          <span className="fd-percent" style={tone === C.orange ? { color: tone } : undefined}>{percent.toFixed(1)}%</span>
          <Arrow href={href} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, period, action, children }: { title: string; period?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="fd-card fd-panel">
      <div className="fd-panel-head">
        <h3>{title}</h3>
        {period && <span className="fd-chip">{period}</span>}
        {action}
      </div>
      {children}
    </div>
  );
}

function ExpectedVsActual({ data }: { data: FinanceDashboardData["expected_vs_actual"] }) {
  const bars = [
    { name: "Expected", value: data.expected, fill: C.grey },
    { name: "Actual (Total)", value: data.actual, fill: C.green },
    { name: "Cash", value: data.cash, fill: C.navy },
    { name: "Offset", value: data.offset, fill: C.sky },
    { name: "Outstanding", value: data.outstanding, fill: C.red },
  ];
  return (
    <div className="fd-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={bars} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} interval={0} />
          <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} />
          <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} cursor={{ fill: "var(--mf-surface-hover)" }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={56}>
            {bars.map((bar) => <Cell key={bar.name} fill={bar.fill} />)}
            <LabelList dataKey="value" position="top" formatter={(value) => money(Number(value))} style={{ fill: "var(--mf-heading)", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PaymentMethods({ data }: { data: FinanceDashboardData["payment_methods"] }) {
  const slices = data.rows.filter((row) => row.amount > 0);
  return (
    <div className="fd-donut-wrap">
      <div className="fd-donut">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={slices.length ? slices : [{ key: "none", amount: 1 }]} dataKey="amount" nameKey="label" innerRadius="62%" outerRadius="92%" startAngle={90} endAngle={-270} stroke="none">
              {(slices.length ? slices : [{ key: "none" }]).map((row) => <Cell key={row.key} fill={METHOD_COLOURS[row.key] ?? "var(--mf-surface-strong)"} />)}
            </Pie>
            {slices.length > 0 && <Tooltip formatter={(value) => `TZS ${money(Number(value))}`} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="fd-donut-centre">
          <b>TZS</b>
          <b>{money(data.total)}</b>
          <span>Total Collection</span>
        </div>
      </div>
      <ul className="fd-legend">
        {data.rows.map((row) => (
          <li key={row.key}>
            <i style={{ background: METHOD_COLOURS[row.key] }} />
            <div>
              <div>{row.label}</div>
              <small>{money(row.amount)}</small>
            </div>
            <span>{row.percent.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHANNEL_ICON: Record<string, string> = { mobile: "fa fa-mobile", cash: "fa fa-money", offset: "fa fa-exchange", other: "fa fa-ellipsis-h" };

function Channels({ rows }: { rows: FinanceDashboardData["channels"] }) {
  if (rows.length === 0) {
    return <p className="fd-empty">No instalments due and no collections this month.</p>;
  }
  return (
    <div className="fd-channels">
      {rows.map((row) => (
        <div key={row.label} className="fd-channel">
          <span className={`fd-channel-badge ${row.channel}`}>{row.channel === "bank" ? row.label.slice(0, 3) : <i className={CHANNEL_ICON[row.channel] ?? CHANNEL_ICON.other} />}</span>
          <b className="fd-channel-name">{row.label}</b>
          <div>
            <small>Expected</small>
            <div>{money(row.expected)}</div>
          </div>
          <div>
            <small>Collected</small>
            <div>{money(row.collected)}</div>
          </div>
          <div className="text-right">
            <b>{row.clients}</b>
            <small className="d-block">Clients</small>
          </div>
        </div>
      ))}
    </div>
  );
}

const INCOME_COLOURS = [C.green, C.blue, C.orange, C.red, C.purple];
const EXPENSE_COLOURS = [C.red, C.blue, C.purple, C.navy];

function IncomeExpenses({ data }: { data: FinanceDashboardData["income_expenses"] }) {
  return (
    <>
      <div className="fd-ie">
        <div className="fd-ie-col">
          <div className="fd-ie-total income">
            <IconTile icon="fa fa-money" tone={C.green} />
            <div>
              <small>Total Income</small>
              <b>TZS {money(data.total_income)}</b>
            </div>
          </div>
          <ul className="fd-lines">
            {data.income.map((line, index) => (
              <li key={line.key}>
                <i style={{ background: INCOME_COLOURS[index % INCOME_COLOURS.length] }} />
                <span>{line.label}</span>
                <b>{money(line.amount)}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="fd-ie-col">
          <div className="fd-ie-total expense">
            <IconTile icon="fa fa-file-text-o" tone={C.red} />
            <div>
              <small>Total Expenses</small>
              <b>TZS {money(data.total_expenses)}</b>
            </div>
          </div>
          <ul className="fd-lines">
            {data.expenses.map((line, index) => (
              <li key={line.key}>
                <i style={{ background: EXPENSE_COLOURS[index % EXPENSE_COLOURS.length] }} />
                <span>{line.label}</span>
                <b>{money(line.amount)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="fd-net">
        <IconTile icon="fa fa-line-chart" tone={C.navy} />
        <span>Net Operating Result</span>
        <b className={data.net < 0 ? "text-danger" : ""}>TZS {money(data.net)}</b>
        <Change value={data.net_change} compare="vs last month" />
      </div>
    </>
  );
}

function CashFlow({ data }: { data: FinanceDashboardData["cash_flow"] }) {
  // Waterfall: each bar spans [from, to] — Cash In rises from the opening balance, Cash Out falls back to the closing one.
  const top = data.opening + data.cash_in;
  const bars = [
    { name: "Opening Balance", span: [0, data.opening], fill: C.grey, label: data.opening },
    { name: "Cash In", span: [data.opening, top], fill: C.green, label: data.cash_in },
    { name: "Cash Out", span: [top - data.cash_out, top], fill: C.red, label: data.cash_out },
    { name: "Closing Balance", span: [0, data.closing], fill: C.blue, label: data.closing },
  ];
  return (
    <div className="fd-chart">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={bars} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "var(--mf-border-strong)" }} tick={{ fill: "var(--mf-text)", fontSize: 12 }} interval={0} />
          <YAxis tickFormatter={short} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 11 }} width={44} domain={[0, "auto"]} />
          <Tooltip formatter={(_value, _name, item) => `TZS ${money(Number((item.payload as { label: number }).label))}`} cursor={{ fill: "var(--mf-surface-hover)" }} />
          <Bar dataKey="span" maxBarSize={64} minPointSize={2}>
            {bars.map((bar) => <Cell key={bar.name} fill={bar.fill} />)}
            <LabelList dataKey="label" position="top" formatter={(value) => money(Number(value))} style={{ fill: "var(--mf-heading)", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const APPROVAL_ICONS: Record<string, string> = {
  "loans.approval": "fa fa-file-text-o",
  "payroll.run": "fa fa-users",
  "hrm.staff_credit": "fa fa-user-plus",
  "expenses.request": "fa fa-file-o",
};

function Approvals({ rows }: { rows: FinanceDashboardData["approvals"] }) {
  if (rows.length === 0) {
    return <p className="fd-empty">Nothing is waiting for approval.</p>;
  }
  return (
    <ul className="fd-approvals">
      {rows.map((row) => (
        <li key={row.workflow}>
          <i className={`${APPROVAL_ICONS[row.workflow] ?? "fa fa-database"} fd-approval-icon`} />
          <b className="fd-approval-count">{row.count}</b>
          <span className="fd-approval-label">{row.label}</span>
          <span className={`fd-approval-status ${/finance/i.test(row.status) ? "finance" : "pending"}`}>{row.status}</span>
          <Link href={row.link} className="fd-arrow" aria-label={`Open ${row.label}`}>
            <i className="fa fa-chevron-right" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
