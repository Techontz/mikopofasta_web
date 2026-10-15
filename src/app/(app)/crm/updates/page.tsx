"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import type { CustomerUpdate } from "@/components/crm/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { useAuth } from "@/lib/auth";
import { useAction, useApi } from "@/lib/hooks";

const TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;

/**
 * CRM → Customer Updates: changes branch staff made to registered customers, waiting for CRM approval (approve applies them,
 * reject leaves the customer as it is), and every change already applied or rejected.
 */
export default function CustomerUpdatesPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState(useSearchParams().get("status") ?? "pending");
  const { data, isLoading } = useApi<CustomerUpdate[]>(can("customers.approve_updates") ? "crm/customer-updates" : null, { status });
  const approve = useAction<{ id: number }>("post", (body) => `crm/customer-updates/${body.id}/approve`);
  const reject = useAction<{ id: number; reason: string }>("post", (body) => `crm/customer-updates/${body.id}/reject`);

  return (
    <>
      <PageHeader crumbs={["Customer Care", "Customer Updates"]} />
      <Card title="Customer Updates">
        <p className="text-muted small">Changes branch staff make to a registered customer&apos;s details wait here for CRM approval; the customer keeps the current details until then. Changes made by CRM or Admin apply at once and are listed as approved.</p>
        <div className="mb-2">
          <select className="form-control" style={{ width: 200 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="pending">Waiting for approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
        <DataTable
          rows={data}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "customer", header: "Customer", value: (row) => row.customer?.name, render: (row) => row.customer && <Link href={`/customers/${row.customer.id}`}>{row.customer.name}<br /><small className="text-muted">{row.customer.code}</small></Link> },
            { key: "branch", header: "Branch" },
            {
              key: "changes",
              header: "Changes (Old → New)",
              sortable: false,
              value: (row) => row.changes.map((change) => change.field).join(", "),
              render: (row) => (
                <ul className="list-unstyled mb-0">
                  {row.changes.map((change) => (
                    <li key={change.field}><b>{change.field}:</b> <span className="text-muted">{change.old || "—"}</span> → <span>{change.new || "—"}</span></li>
                  ))}
                </ul>
              ),
            },
            { key: "requested_by", header: "Requested By", render: (row) => <>{row.requested_by}<br /><small className="text-muted">{row.requested_at}</small></> },
            { key: "status", header: "Status", render: (row) => <><Badge tone={TONE[row.status]}>{row.status.toUpperCase()}</Badge>{row.decided_by && row.status !== "pending" && <><br /><small className="text-muted">{row.decided_by} · {row.decided_at}</small></>}{row.rejection_reason && <><br /><small className="text-danger">{row.rejection_reason}</small></>}</> },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => row.status === "pending" && (
                <>
                  <button type="button" className="btn btn-sm btn-success mr-1" disabled={approve.isPending} onClick={async () => (await confirmAction("Approve this change?", "The customer's details are updated at once.")) && approve.mutate({ id: row.id })}>Approve</button>
                  <button type="button" className="btn btn-sm btn-danger" disabled={reject.isPending} onClick={async () => { const reason = await promptReason("Reject this change?"); if (reason) { reject.mutate({ id: row.id, reason }); } }}>Reject</button>
                </>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
