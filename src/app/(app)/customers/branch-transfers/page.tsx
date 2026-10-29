"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { Pager, formatDateTime, usePaged } from "@/components/customers/common";
import { toastError, toastSuccess } from "@/components/customers/toast";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectBox } from "@/components/ui/SelectBox";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";

interface Transfer {
  id: number;
  status: "pending" | "approved" | "rejected";
  customerId: number;
  customerNumber: string | null;
  customerName: string | null;
  fromBranch: string | null;
  toBranch: string | null;
  reason: string;
  requestedBy: string | null;
  requestedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  moved: { loan_ids: number[]; principal: number; accrued_penalties: number; savings: number } | null;
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/** Customer branch transfers: requested from the customer profile, approved here by customers.approve_transfer. */
export default function BranchTransfersPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const allowed = can(["customers.transfer", "customers.approve_transfer"]);
  const canDecide = can("customers.approve_transfer");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading } = usePaged<Transfer>(allowed ? "customers/branch-transfers" : null, { page, per_page: 20, status });

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["Customer", "Branch transfers"]} />
        <AccessDenied />
      </>
    );
  }

  const decide = async (transfer: Transfer, decision: "approve" | "reject") => {
    let body: { reason?: string } = {};
    if (decision === "approve") {
      if (!(await confirmAction(`Move ${transfer.customerName} from ${transfer.fromBranch} to ${transfer.toBranch}?`, "Open loans, unpaid penalties and savings move with the customer."))) {
        return;
      }
    } else {
      const reason = await promptReason(`Reason for rejecting the transfer of ${transfer.customerName}`);
      if (!reason) {
        return;
      }
      body = { reason };
    }
    setBusyId(transfer.id);
    try {
      await api.post(`customers/branch-transfers/${transfer.id}/${decision}`, body);
      await client.invalidateQueries();
      toastSuccess(decision === "approve" ? `${transfer.customerName} moved to ${transfer.toBranch}.` : "Transfer rejected.");
    } catch (error) {
      toastError(error instanceof ApiError ? error.firstError : "The decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  };

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader crumbs={["Customer", "Branch transfers"]} />
      <Card title="Customer branch transfers">
        <div className="mf-filters">
          <SelectBox inputId="transfers-status" options={STATUSES} value={status} onChange={(value) => { setStatus(value ?? "pending"); setPage(1); }} />
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-custom mf-table">
            <thead className="thead-info">
              <tr>
                <th>Customer</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Requested by</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Moved</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} className="mf-loading"><Loading inline /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="text-center">No branch transfers match these filters.</td></tr>
              ) : (
                rows.map((transfer) => (
                  <tr key={transfer.id}>
                    <td><Link href={`/customers/${transfer.customerId}`}>{transfer.customerName}</Link><small className="d-block">{transfer.customerNumber}</small></td>
                    <td>{transfer.fromBranch}</td>
                    <td>{transfer.toBranch}</td>
                    <td>{transfer.reason}</td>
                    <td>{transfer.requestedBy}</td>
                    <td className="text-nowrap">{formatDateTime(transfer.requestedAt)}</td>
                    <td>
                      {STATUSES.find((option) => option.value === transfer.status)?.label}
                      {transfer.decidedBy && <small className="d-block">{transfer.decidedBy}, {formatDateTime(transfer.decidedAt)}</small>}
                      {transfer.decisionReason && <small className="d-block">{transfer.decisionReason}</small>}
                    </td>
                    <td className="text-nowrap">
                      {transfer.moved && (
                        <small>
                          {transfer.moved.loan_ids.length} loan(s) · Principal {money(transfer.moved.principal)}
                          {transfer.moved.savings > 0 && <> · Savings {money(transfer.moved.savings)}</>}
                        </small>
                      )}
                    </td>
                    <td className="text-nowrap">
                      {canDecide && transfer.status === "pending" && (
                        <>
                          <button type="button" className="btn btn-sm btn-success mr-1" disabled={busyId === transfer.id} onClick={() => void decide(transfer, "approve")}><i className="icon-check" /> Approve</button>
                          <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyId === transfer.id} onClick={() => void decide(transfer, "reject")}><i className="icon-close" /> Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
