"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { Pager } from "@/components/customers/common";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, monthPeriod, periodLabel, periodQuery } from "@/components/ui/PeriodFilter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";

const VIEW_PERMISSIONS = ["phone_bond.manage", "phone_bond.lock", "phone_bond.release", "phone_bond.replace_request", "phone_bond.replace_approve", "loans.view"];

interface PaymentRow {
  id: number;
  customer: string | null;
  customer_id: number | null;
  loan_number: string | null;
  method: string;
  status: string;
  status_label: string;
  reference: string | null;
  paid_on: string | null;
  amount: number;
}

interface PaymentsResponse {
  cards: {
    collected_this_month: number;
    collected_all_time: number;
    confirmed_payments: number;
    awaiting_customer: number;
    awaiting_instalments: number;
    expected_collection: number;
    outstanding_loans: number;
    outstanding_amount: number;
  };
  data: PaymentRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

const STATUSES = [
  ["all", "Status: all"],
  ["allocated", "Allocated"],
  ["confirmed", "Confirmed"],
  ["pending_approval", "Pending approval"],
  ["pending_verification", "Pending verification"],
  ["deposited", "Deposited"],
  ["rejected", "Rejected"],
  ["refunded", "Refunded"],
];

/**
 * eSIMU → Payments: the existing payment records of eSIMU loans only (no separate collection). eSIMU loans also stay in
 * every general loan report.
 */
export default function EsimuPaymentsPage() {
  const { can } = useAuth();
  const [filter, setFilter] = useState(monthPeriod());
  const [status, setStatus] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowed = can(VIEW_PERMISSIONS);

  const query = { ...periodQuery(filter), status, search: search || undefined, page, per_page: perPage };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["phone-bond/payments", query],
    queryFn: () => api.get<PaymentsResponse>("phone-bond/payments", query),
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["eSIMU", "Payments"]} />
        <AccessDenied />
      </>
    );
  }

  const onSearch = (value: string) => {
    setSearchText(value);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => { setSearch(value.trim()); setPage(1); }, 350);
  };

  const k = data?.cards;
  const card = (label: string, value: string, tone: string, icon: string, note?: string) => (
    <div className="col-lg-4 col-md-6 mb-3" key={label}>
      <div className={`body dashboard-stat bg-${tone} text-light`} style={{ borderRadius: 4 }}>
        <h4 className="mb-0"><i className={icon} /> {value}</h4>
        <span>{label}</span>
        {note && <small className="d-block" style={{ opacity: 0.85 }}>{note}</small>}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader crumbs={["eSIMU", "Payments"]} printDetails={<span>Period: <b>{periodLabel(filter)}</b></span>} />

      <div className="row clearfix">
        {card("Collected This Month", `TZS ${money(k?.collected_this_month ?? 0)}`, "success", "icon-wallet")}
        {card("Collected All Time", `TZS ${money(k?.collected_all_time ?? 0)}`, "info", "icon-graph")}
        {card("Confirmed Payments", String(k?.confirmed_payments ?? 0), "primary", "icon-check", periodLabel(filter))}
        {card("Awaiting Customer", `TZS ${money(k?.awaiting_customer ?? 0)}`, "warning", "icon-clock", `${k?.awaiting_instalments ?? 0} instalment(s) due and not fully paid`)}
        {card("Expected Collection", `TZS ${money(k?.expected_collection ?? 0)}`, "secondary", "icon-calendar", periodLabel(filter))}
        {card("Outstanding eSIMU Loans", `${k?.outstanding_loans ?? 0} · TZS ${money(k?.outstanding_amount ?? 0)}`, "danger", "icon-screen-smartphone")}
      </div>

      <Card title="Payment History">
        <PeriodFilter value={filter} onChange={(next) => { setFilter(next); setPage(1); }} idPrefix="esimu-payments" />
        <div className="mf-filters">
          <input type="search" className="form-control" placeholder="Search customer, phone or payment reference…" value={searchText} onChange={(event) => onSearch(event.target.value)} aria-label="Search payments" />
          <select className="form-control" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Payment status">
            {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-custom mf-table">
            <thead className="thead-info">
              <tr>
                <th>Customer</th>
                <th>Loan</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Payment Reference</th>
                <th>Payment Date</th>
                <th className="text-right">Amount (TZS)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="mf-loading"><Loading inline /></td></tr>
              ) : (data?.data ?? []).length === 0 ? (
                <tr><td colSpan={7} className="text-center">No eSIMU payments match these filters.</td></tr>
              ) : (
                data?.data.map((row) => (
                  <tr key={row.id} style={{ opacity: isFetching ? 0.7 : 1 }}>
                    <td>{row.customer ?? "-"}</td>
                    <td>{row.loan_number ?? "-"}</td>
                    <td>{row.method}</td>
                    <td><span className={`badge badge-${["allocated", "confirmed"].includes(row.status) ? "success" : ["rejected", "refunded", "flagged"].includes(row.status) ? "danger" : "warning"}`}>{row.status_label.toUpperCase()}</span></td>
                    <td>{row.reference ?? "-"}</td>
                    <td className="text-nowrap">{row.paid_on}</td>
                    <td className="text-right">{money(row.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          meta={data ? { currentPage: data.meta.current_page, lastPage: data.meta.last_page, perPage: data.meta.per_page, total: data.meta.total } : undefined}
          onPage={setPage}
          perPage={perPage}
          onPerPage={(size) => { setPerPage(size); setPage(1); }}
        />
      </Card>
    </>
  );
}
