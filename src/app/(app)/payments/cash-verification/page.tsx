"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { total } from "@/components/payments/PaymentFilterModal";
import type { Payment } from "@/components/payments/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, periodLabel, periodQuery, todayPeriod } from "@/components/ui/PeriodFilter";
import { SelectBox } from "@/components/ui/SelectBox";
import { promptReason } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useAction } from "@/lib/hooks";

/** Pending and Deposited are open queues (every unresolved receipt); Confirmed and Rejected follow the period (§8.1). */
const TABS = [
  { value: "pending_verification", label: "Pending", unresolved: true },
  { value: "deposited", label: "Deposited", unresolved: true },
  { value: "confirmed", label: "Confirmed", unresolved: false },
  { value: "rejected", label: "Rejected", unresolved: false },
] as const;

type Summary = Record<string, { count: number; amount: number }>;

/** Payments → Cash Verification: Finance view of teller cash receipts (Documents: cash flow, fraud control). */
export default function CashVerificationPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("pending_verification");
  const [filter, setFilter] = useState(todayPeriod());
  const [zoneId, setZoneId] = useState("");
  const query = { status: tab, zone_id: zoneId || undefined, ...periodQuery(filter) };
  const { data, isLoading } = useQuery({
    queryKey: ["payments/cash", query],
    queryFn: () => api.get<{ data: Payment[]; summary: Summary }>("payments/cash", query),
  });
  const reject = useAction<{ id: number; reason: string }>("post", (body) => `payments/cash/${body.id}/reject`);
  const rows = data?.data;
  const current = TABS.find((item) => item.value === tab);

  return (
    <>
      <PageHeader crumbs={["Payments", "Cash Verification"]} />

      <Card title="Teller Cash Receipts">
        <div className="d-flex flex-wrap align-items-start">
          <PeriodFilter value={filter} onChange={setFilter} idPrefix="cash-verification" />
          <div style={{ minWidth: 180 }} className="ml-2">
            <SelectBox inputId="cash-verification-zone" placeholder="All zones" optionsUrl="payments/zone-options" value={zoneId} isClearable onChange={(value) => setZoneId(value ?? "")} />
          </div>
        </div>
        <ul className="nav nav-tabs mb-3">
          {TABS.map((item) => (
            <li className="nav-item" key={item.value}>
              <button type="button" className={`nav-link btn btn-link ${tab === item.value ? "active" : ""}`} onClick={() => setTab(item.value)}>
                {item.label} <span className="badge badge-info">{data?.summary?.[item.value]?.count ?? 0}</span>
                <small className="d-block">{money(data?.summary?.[item.value]?.amount ?? 0)}</small>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-muted small mb-2">
          {current?.unresolved ? "Every receipt still waiting is listed, whatever day it was taken; the branch filter applies." : `Decided ${periodLabel(filter)}.`}
        </p>
        <DataTable
          rows={rows}
          loading={isLoading}
          rowKey={(row) => row.id}
          emptyMessage="No receipts match the selected tab, branch and period."
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "receipt_number", header: "Receipt" },
            { key: "customer", header: "Customer Name" },
            { key: "branch", header: "Branch Name" },
            { key: "employee", header: "Teller" },
            { key: "channel", header: "Method", render: (row) => (row.provider ? `${row.channel} · ${row.provider}` : row.channel) },
            { key: "amount", header: "Amount", render: (row) => money(row.amount) },
            { key: "slip_number", header: "Deposit Slip" },
            { key: "paid_on", header: "Date" },
            { key: "status", header: "Status", render: (row) => <Badge tone={row.status_badge}>{row.status_label}</Badge> },
            { key: "rejection_reason", header: "Comment" },
            {
              key: "action",
              header: "Action",
              sortable: false,
              render: (row) =>
                row.status === "pending_verification" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-danger"
                    title="Reject"
                    disabled={reject.isPending}
                    onClick={async () => {
                      const reason = await promptReason("Reject cash payment");
                      if (reason) {
                        reject.mutate({ id: row.id, reason });
                      }
                    }}
                  >
                    <i className={reject.isPending && reject.variables?.id === row.id ? "fa fa-spinner fa-spin" : "icon-close"} />
                  </button>
                ),
            },
          ]}
          footer={
            <tr>
              <td><b>TOTAL</b></td>
              <td /><td /><td /><td />
              <td><b>{money(total(rows, (row) => row.amount))}</b></td>
              <td /><td /><td /><td /><td />
            </tr>
          }
        />
      </Card>
    </>
  );
}
