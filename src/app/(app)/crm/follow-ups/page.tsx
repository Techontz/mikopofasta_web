"use client";

import Link from "next/link";
import { useState } from "react";

import { CompleteFollowUpModal, RecordCallModal } from "@/components/crm/CrmModals";
import { FOLLOW_UP_TONE, type Interaction } from "@/components/crm/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApi } from "@/lib/hooks";

/** CRM → Follow-ups: reminders set on calls, due today and overdue by default; call the customer or mark it done. */
export default function FollowUpsPage() {
  const [status, setStatus] = useState("due");
  const [mine, setMine] = useState(false);
  const [calling, setCalling] = useState<number | null | undefined>(undefined);
  const [completing, setCompleting] = useState<number | null>(null);
  const { data, isLoading } = useApi<Interaction[]>("crm/follow-ups", { status, mine: mine ? 1 : undefined });

  return (
    <>
      <PageHeader crumbs={["Customer Care", "Follow-ups"]} />
      <Card title="Follow-ups" actions={<button type="button" className="btn btn-sm btn-primary" onClick={() => setCalling(null)}><i className="icon-call-out" /> Record Call</button>}>
        <div className="mb-2 d-flex align-items-center">
          <select className="form-control" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="done">Done</option>
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
            { key: "follow_up_date", header: "Follow-up Date", render: (row) => row.follow_up_status && <Badge tone={FOLLOW_UP_TONE[row.follow_up_status]}>{row.follow_up_date}</Badge> },
            { key: "customer", header: "Customer", value: (row) => row.customer?.name, render: (row) => row.customer && <Link href={`/crm/customers/${row.customer.id}`}>{row.customer.name}<br /><small className="text-muted">{row.customer.code}</small></Link> },
            { key: "phone", header: "Phone Number", value: (row) => row.customer?.phone },
            { key: "last", header: "Last Contact", value: (row) => `${row.type_label} ${row.outcome_label ?? ""}`, render: (row) => <>{row.created_at}<br /><small>{row.type_label} {row.outcome_label}</small></> },
            { key: "notes", header: "Notes", render: (row) => <span style={{ whiteSpace: "pre-wrap" }}>{row.follow_up_notes ?? row.notes}</span> },
            { key: "employee", header: "Staff" },
            { key: "branch", header: "Branch" },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => row.follow_up_status !== "done" && (
                <>
                  <button type="button" className="btn btn-sm btn-icon btn-primary mr-1" title="Record Call" onClick={() => setCalling(row.customer?.id ?? null)}><i className="icon-call-out" /></button>
                  <button type="button" className="btn btn-sm btn-icon btn-success" title="Complete" onClick={() => setCompleting(row.id)}><i className="icon-check" /></button>
                </>
              ),
            },
          ]}
        />
      </Card>

      <RecordCallModal open={calling !== undefined} onClose={() => setCalling(undefined)} customerId={calling ?? null} />
      <CompleteFollowUpModal interactionId={completing} onClose={() => setCompleting(null)} />
    </>
  );
}
