"use client";

import Link from "next/link";
import { useState } from "react";

import { CrmFilterModal, TicketModal, UpdateTicketModal } from "@/components/crm/CrmModals";
import { PRIORITY_TONE, TICKET_STATUS_TONE, type CaseType, type Ticket } from "@/components/crm/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApi } from "@/lib/hooks";

const TITLES: Record<CaseType, string> = { complaint: "Complaints", request: "Customer Requests" };

/**
 * CRM → Complaints / Customer Requests: the cases of one type (GET /crm/tickets?type=…), still being handled by default, with
 * New and Update (status, assignee, resolution).
 */
export function CasesPage({ type }: { type: CaseType }) {
  const [status, setStatus] = useState("pending");
  const [mine, setMine] = useState(false);
  const [filters, setFilters] = useState({ branch_id: "", from: "", to: "" });
  const [modal, setModal] = useState<"new" | "filter" | null>(null);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const { data, isLoading } = useApi<Ticket[]>("crm/tickets", { ...filters, type, status, mine: mine ? 1 : undefined });

  return (
    <>
      <PageHeader crumbs={["Customer Care", TITLES[type]]} />
      <Card
        title={TITLES[type]}
        actions={
          <>
            <button type="button" className="btn btn-sm btn-danger mr-1" onClick={() => setModal("new")}><i className="icon-plus" /> New {type === "complaint" ? "Complaint" : "Request"}</button>
            <button type="button" className="btn btn-sm btn-primary" title="Filter" onClick={() => setModal("filter")}><i className="icon-magnifier" /></button>
          </>
        }
      >
        <div className="mb-2 d-flex align-items-center">
          <select className="form-control" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="pending">Open (all)</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <label className="mb-0 ml-3">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Mine only
          </label>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "ticket_number", header: "Case No." },
            { key: "created_at", header: "Date" },
            { key: "customer", header: "Customer", value: (row) => row.customer?.name, render: (row) => row.customer && <Link href={`/crm/customers/${row.customer.id}`}>{row.customer.name}<br /><small className="text-muted">{row.customer.code} · {row.customer.phone}</small></Link> },
            { key: "category_label", header: "Category" },
            { key: "subject", header: "Subject" },
            { key: "channel_label", header: "Received Through" },
            { key: "priority", header: "Priority", render: (row) => <Badge tone={PRIORITY_TONE[row.priority]}>{row.priority}</Badge> },
            { key: "status", header: "Status", value: (row) => row.status_label, render: (row) => <Badge tone={TICKET_STATUS_TONE[row.status]}>{row.status_label}</Badge> },
            { key: "assignee", header: "Assigned To" },
            { key: "branch", header: "Branch" },
            { key: "action", header: "Action", sortable: false, render: (row) => <button type="button" className="btn btn-sm btn-icon btn-primary" title="Update" onClick={() => setEditing(row)}><i className="icon-pencil" /></button> },
          ]}
        />
      </Card>

      <TicketModal open={modal === "new"} onClose={() => setModal(null)} type={type} />
      <CrmFilterModal open={modal === "filter"} onClose={() => setModal(null)} onApply={setFilters} />
      <UpdateTicketModal ticket={editing} onClose={() => setEditing(null)} />
    </>
  );
}
