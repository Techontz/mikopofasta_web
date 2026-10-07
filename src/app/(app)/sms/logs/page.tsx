"use client";

import { useState } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApi } from "@/lib/hooks";

interface SmsLogRow {
  id: number;
  date: string;
  phone: string;
  customer: string | null;
  message: string;
  category: string;
  status: "pending" | "sent" | "failed";
  error: string | null;
  sent_by: string;
}

const CATEGORIES: Array<[string, string]> = [
  ["all", "All"],
  ["payment", "Payment received"],
  ["reminder", "Repayment reminder"],
  ["overdue", "Overdue reminder"],
  ["announcement", "Announcement"],
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES);
const STATUS_TONE: Record<SmsLogRow["status"], BadgeTone> = { pending: "warning", sent: "success", failed: "danger" };

const today = () => new Date().toISOString().slice(0, 10);

/** SMS Centre → SMS Log: every SMS the system sent (automatic and announcements) with its delivery status. */
export default function SmsLogsPage() {
  const [filters, setFilters] = useState({ category: "all", status: "all", from: today(), to: today() });
  const { data: rows, isLoading } = useApi<SmsLogRow[]>("sms/logs", filters);

  return (
    <>
      <PageHeader crumbs={["SMS Centre", "SMS Log"]} />

      <Card title="SMS Log">
        <div className="row">
          <Field label="Type:" className="col-lg-3 col-md-6">
            <select className="form-control" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Status:" className="col-lg-3 col-md-6">
            <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </Field>
          <Field label="From:" className="col-lg-3 col-md-6">
            <input type="date" className="form-control" value={filters.from} max={filters.to} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </Field>
          <Field label="To:" className="col-lg-3 col-md-6">
            <input type="date" className="form-control" value={filters.to} min={filters.from} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </Field>
        </div>

        <DataTable
          rows={rows}
          loading={isLoading}
          rowKey={(row) => row.id}
          pageSize={25}
          emptyMessage="No SMS in this period."
          columns={[
            { key: "date", header: "Date", className: "text-nowrap" },
            { key: "phone", header: "Phone" },
            { key: "customer", header: "Customer", render: (row) => row.customer ?? "-" },
            { key: "category", header: "Type", value: (row) => CATEGORY_LABEL[row.category] ?? row.category, render: (row) => <Badge tone="info">{CATEGORY_LABEL[row.category] ?? row.category}</Badge> },
            { key: "message", header: "Message", render: (row) => <span style={{ whiteSpace: "pre-wrap" }}>{row.message}</span> },
            { key: "status", header: "Status", render: (row) => <span title={row.error ?? undefined}><Badge tone={STATUS_TONE[row.status] ?? "default"}>{row.status.toUpperCase()}</Badge></span> },
            { key: "sent_by", header: "Sent by" },
          ]}
        />
      </Card>
    </>
  );
}
