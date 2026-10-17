"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Change, IconTile, Panel } from "@/components/dashboard/parts";
import { Loading } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth";
import { BRAND, BRAND_SERIES } from "@/lib/brand";
import { useApi } from "@/lib/hooks";

interface Card {
  value: number;
  change: number | null;
}

interface CrmDashboardData {
  cards: Record<"total_customers" | "pending_kyc" | "kyc_approved" | "kyc_rejected" | "open_complaints" | "pending_requests" | "follow_ups_due" | "customer_updates", Card>;
  cases_by_category: { total: number; rows: Array<{ category: string; label: string; count: number; percent: number }> };
  case_status: Array<{ status: string; label: string; count: number }>;
  pending_kyc: Array<{ id: number; customer_code: string | null; name: string; phone: string | null; submitted_on: string | null }>;
  recent_updates: Array<{ request_id: number; customer_id: number; customer_code: string | null; name: string | null; field: string; old: string; new: string; updated_on: string | null; by: string | null }>;
}

const C = BRAND;

const CATEGORY_COLOURS = BRAND_SERIES;

const STATUS_COLOURS: Record<string, string> = { open: C.red, in_progress: C.black, waiting: C.greyLight, resolved: C.greyDark, closed: C.grey };

const CARDS: Array<{ field: keyof CrmDashboardData["cards"]; title: string; icon: string; tone: string; compare: string; href: string }> = [
  { field: "total_customers", title: "Total Customers", icon: "fa fa-users", tone: C.black, compare: "vs last month", href: "/customers" },
  { field: "pending_kyc", title: "Pending KYC", icon: "fa fa-shield", tone: C.greyDark, compare: "vs last month", href: "/customers/approvals" },
  { field: "kyc_approved", title: "KYC Approved", icon: "fa fa-check-circle", tone: C.redDark, compare: "this month", href: "/customers?approval_status=approved" },
  { field: "kyc_rejected", title: "KYC Rejected", icon: "fa fa-times-circle", tone: C.red, compare: "this month", href: "/customers?approval_status=rejected" },
  { field: "open_complaints", title: "Open Complaints", icon: "fa fa-exclamation-triangle", tone: C.redLight, compare: "vs last month", href: "/crm/complaints" },
  { field: "pending_requests", title: "Pending Requests", icon: "fa fa-file-text", tone: C.black, compare: "vs last month", href: "/crm/requests" },
  { field: "follow_ups_due", title: "Follow-ups Due Today", icon: "fa fa-clock-o", tone: C.redLight, compare: "vs yesterday", href: "/crm/follow-ups" },
  { field: "customer_updates", title: "Customer Updates", icon: "fa fa-pencil-square-o", tone: C.grey, compare: "this month", href: "/crm/updates" },
];

/**
 * CRM department dashboard ("Customer Care Overview", role CRM): customers, KYC, complaints, requests, follow-ups and changes to
 * customers' details across every branch. Every figure comes from GET /crm/dashboard; nothing is computed here.
 */
export function CrmDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useApi<CrmDashboardData>("crm/dashboard");

  return (
    <div className="fd">
      <div className="fd-head">
        <div>
          <h1 className="fd-title">Dashboard</h1>
          <p className="fd-subtitle">Customer Care Overview · Welcome, {user?.full_name}</p>
        </div>
        <form className="fd-filters crm-search" onSubmit={(event) => { event.preventDefault(); router.push(`/customers?search=${encodeURIComponent(search.trim())}`); }}>
          <label className="fd-filter">
            <i className="icon-magnifier" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Customer Number, Name or Phone Number…" aria-label="Search customers" />
          </label>
          <button type="submit" className="btn btn-danger">Search</button>
        </form>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} />}
    </div>
  );
}

function Body({ data }: { data: CrmDashboardData }) {
  return (
    <>
      <div className="fd-grid fd-grid-4">
        {CARDS.slice(0, 4).map((card) => <CountCard key={card.field} {...card} data={data.cards[card.field]} />)}
      </div>
      <div className="fd-grid fd-grid-4">
        {CARDS.slice(4).map((card) => <CountCard key={card.field} {...card} data={data.cards[card.field]} />)}
      </div>

      <div className="fd-grid crm-grid-2">
        <Panel title="Customer Cases by Category (This Month)">
          <CasesByCategory data={data.cases_by_category} />
        </Panel>
        <Panel title="Case Status Overview">
          <CaseStatus rows={data.case_status} />
        </Panel>
      </div>

      <div className="fd-grid crm-grid-2">
        <Panel title="Pending KYC Approval" action={<Link href="/customers/approvals" className="fd-view-all">View All</Link>}>
          <PendingKyc rows={data.pending_kyc} />
        </Panel>
        <Panel title="Recent Customer Updates" action={<Link href="/crm/updates?status=approved" className="fd-view-all">View All</Link>}>
          <RecentUpdates rows={data.recent_updates} />
        </Panel>
      </div>
    </>
  );
}

function CountCard({ title, icon, tone, compare, href, data }: (typeof CARDS)[number] & { data: Card }) {
  return (
    <Link href={href} className="fd-card fd-stat crm-card">
      <IconTile icon={icon} tone={tone} />
      <div className="fd-stat-body">
        <div className="fd-stat-title">{title}</div>
        <div className="fd-stat-value">{data.value.toLocaleString()}</div>
        <div className="fd-stat-foot">
          <Change value={data.change} compare={compare} />
        </div>
      </div>
    </Link>
  );
}

function CasesByCategory({ data }: { data: CrmDashboardData["cases_by_category"] }) {
  if (data.total === 0) {
    return <p className="fd-empty">No complaints or requests this month.</p>;
  }
  return (
    <div className="fd-donut-wrap">
      <div className="fd-donut">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.rows} dataKey="count" nameKey="label" innerRadius="58%" outerRadius="92%" paddingAngle={1} stroke="none">
              {data.rows.map((row, index) => <Cell key={row.category} fill={CATEGORY_COLOURS[index % CATEGORY_COLOURS.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => Number(value).toLocaleString()} />
          </PieChart>
        </ResponsiveContainer>
        <div className="fd-donut-centre">
          <b>{data.total.toLocaleString()}</b>
          <span>Total Cases</span>
        </div>
      </div>
      <ul className="fd-legend">
        {data.rows.map((row, index) => (
          <li key={row.category}>
            <i style={{ background: CATEGORY_COLOURS[index % CATEGORY_COLOURS.length] }} />
            <div>{row.label}</div>
            <span><b>{row.count}</b> <small>({row.percent.toFixed(0)}%)</small></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CaseStatus({ rows }: { rows: CrmDashboardData["case_status"] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 24, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--mf-border)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 12 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--mf-muted)", fontSize: 12 }} />
        <Tooltip cursor={{ fill: "var(--mf-surface-muted)" }} />
        <Bar dataKey="count" name="Cases" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {rows.map((row) => <Cell key={row.status} fill={STATUS_COLOURS[row.status] ?? C.grey} />)}
          <LabelList dataKey="count" position="top" style={{ fill: "var(--mf-heading)", fontWeight: 700 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PendingKyc({ rows }: { rows: CrmDashboardData["pending_kyc"] }) {
  if (rows.length === 0) {
    return <p className="fd-empty">No registration is waiting for KYC approval.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0 crm-table">
        <thead><tr><th>#</th><th>Customer No</th><th>Name</th><th>Phone</th><th>Submitted On</th><th>Status</th><th className="text-center">Action</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td>{index + 1}</td>
              <td>{row.customer_code ?? "—"}</td>
              <td>{row.name}</td>
              <td>{row.phone ?? "—"}</td>
              <td>{row.submitted_on ?? "—"}</td>
              <td><span className="crm-pill warning">Pending</span></td>
              <td className="text-center"><Link href={`/customers/${row.id}`} className="btn btn-sm btn-outline-danger">View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentUpdates({ rows }: { rows: CrmDashboardData["recent_updates"] }) {
  if (rows.length === 0) {
    return <p className="fd-empty">No customer details have been changed yet.</p>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm mb-0 crm-table">
        <thead><tr><th>#</th><th>Customer No</th><th>Customer Name</th><th>Field Updated</th><th>Old Value</th><th>New Value</th><th>Updated On</th><th>By</th></tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.request_id}-${row.field}`}>
              <td>{index + 1}</td>
              <td>{row.customer_code ?? "—"}</td>
              <td><Link href={`/customers/${row.customer_id}`}>{row.name}</Link></td>
              <td>{row.field}</td>
              <td className="crm-value">{row.old || "—"}</td>
              <td className="crm-value">{row.new || "—"}</td>
              <td>{row.updated_on ?? "—"}</td>
              <td>{row.by ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
