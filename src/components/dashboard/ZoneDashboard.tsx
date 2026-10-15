"use client";

import Link from "next/link";
import { useState } from "react";

import { Approvals, BookCard, Panel, Pipeline, TodayCard, type BranchDashboardData } from "@/components/dashboard/BranchDashboard";
import { Loading } from "@/components/ui/Loading";
import { SelectBox } from "@/components/ui/SelectBox";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface BranchRow {
  branch_id: number | null;
  label: string;
  active_loans: number;
  portfolio: number;
  expected: number;
  collected: number;
  collection_percent: number;
  arrears_percent: number;
  default_percent: number;
}

export interface ZoneDashboardData extends BranchDashboardData {
  zone: string | null;
  branches: { rows: BranchRow[]; total: BranchRow };
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Zone Manager dashboard: the loan book, today's operations, approvals and pipeline of every branch in the zone, with a
 * performance row per branch; View narrows the whole dashboard to that branch. Every figure comes from GET /dashboard/zone.
 */
export function ZoneDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(thisMonth);
  const [branchId, setBranchId] = useState("");
  const { data, isLoading } = useApi<ZoneDashboardData>("dashboard/zone", { month, branch_id: branchId || undefined });

  return (
    <div className="cd bd zd">
      <div className="cd-head">
        <div className="cd-heading">
          <h1 className="cd-title">{data?.zone ? `${data.zone} Zone` : "Zone Dashboard"}</h1>
          <p className="cd-subtitle">Welcome, {user?.full_name}</p>
        </div>
        <div className="cd-filters">
          <label className="cd-filter">
            <i className="icon-calendar" />
            <input type="month" value={month} max={thisMonth()} onChange={(event) => setMonth(event.target.value || thisMonth())} aria-label="Month" />
          </label>
          <div className="cd-filter cd-filter-branch">
            <SelectBox inputId="zd-branch" placeholder="All Branches in Zone" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => setBranchId(value ?? "")} />
          </div>
        </div>
      </div>

      {isLoading || !data ? <Loading /> : <Body data={data} onBranch={(id) => setBranchId(String(id))} />}
    </div>
  );
}

function Body({ data, onBranch }: { data: ZoneDashboardData; onBranch: (branchId: number) => void }) {
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

      <div className="cd-card cd-panel zd-section">
        <div className="cd-panel-head"><h3>Today&apos;s Operations</h3></div>
        <div className="bd-today">
          <TodayCard title="Petty Cash" amount={data.petty_cash.amount} change={data.petty_cash.change} href="/expenses/requests" />
          <TodayCard title="Today's Collection" amount={t.collection.amount} loans={t.collection.loans} change={t.collection.change} href="/reports/received" />
          <TodayCard title="Today's Disbursement" amount={t.disbursement.amount} loans={t.disbursement.loans} change={t.disbursement.change} href="/loans/withdrawal" />
        </div>
      </div>

      <div className="zd-main">
        <Panel title={data.zone ? `Branch Performance (Branches in ${data.zone} Zone)` : "Branch Performance"}>
          <BranchTable data={data.branches} monthLabel={data.month_label} onBranch={onBranch} />
        </Panel>
        <Panel title="Pending Approvals / Applications" action={<Link href="/loans/pending" className="cd-view-all">View All</Link>}>
          <Approvals rows={data.approvals} />
        </Panel>
      </div>

      <Panel title={`Loan Applications Pipeline (${data.month_label})`}>
        <Pipeline stages={data.pipeline} />
      </Panel>
    </>
  );
}

function Rate({ value, good }: { value: number; good?: boolean }) {
  return <span className={good ? "zd-rate-good" : value > 0 ? "cd-rate is-bad" : "cd-rate"}>{value.toFixed(1)}%</span>;
}

function BranchTable({ data, monthLabel, onBranch }: { data: ZoneDashboardData["branches"]; monthLabel: string; onBranch: (branchId: number) => void }) {
  const cells = (row: BranchRow) => [
    money(row.active_loans),
    money(row.portfolio),
    money(row.expected),
    money(row.collected),
    <Rate key="c" value={row.collection_percent} good />,
    <Rate key="a" value={row.arrears_percent} />,
    <Rate key="d" value={row.default_percent} />,
  ];

  return (
    <div className="table-responsive">
      <table className="table cd-table zd-table mb-0">
        <thead>
          <tr>
            {["Branch", "Active Loans", "Portfolio (TZS)", "Expected Collection", "Actual Collection", "Collection %", "Arrears %", "Default %", "Action"].map((heading) => <th key={heading}>{heading}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.rows.length === 0 && <tr><td colSpan={9} className="cd-empty">No branches in this zone.</td></tr>}
          {data.rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              {cells(row).map((cell, index) => <td key={index}>{cell}</td>)}
              <td>{row.branch_id !== null && <button type="button" className="zd-view" onClick={() => onBranch(row.branch_id as number)}>View</button>}</td>
            </tr>
          ))}
        </tbody>
        {data.rows.length > 1 && (
          <tfoot>
            <tr>
              <td>TOTAL</td>
              {cells(data.total).map((cell, index) => <td key={index}>{cell}</td>)}
              <td>-</td>
            </tr>
          </tfoot>
        )}
      </table>
      <small className="cd-note">Expected and actual collection cover {monthLabel}. Arrears % is PAR 1; Default % is loans in default or written off out of all disbursed loans.</small>
    </div>
  );
}
