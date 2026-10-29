"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { Pager, formatDateTime, usePaged } from "@/components/customers/common";
import { toastError, toastSuccess } from "@/components/customers/toast";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectBox } from "@/components/ui/SelectBox";
import { promptReason } from "@/components/ui/notify";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";

interface Review {
  id: number;
  status: "pending" | "released" | "rejected";
  name: string;
  phone: string | null;
  nidaNumber: string | null;
  branch: string | null;
  reasons: string[];
  matchCount: number;
  requestedBy: string | null;
  requestedAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  customerId: number | null;
}

interface Match {
  customerId: number;
  customerNumber: string;
  name: string;
  phone: string | null;
  nidaNumber: string | null;
  checkNumber: string | null;
  accountNumber: string | null;
  dob: string | null;
  branch: string | null;
  approvalStatus: string;
  deleted: boolean;
  reasons: string[];
}

const REASONS: Record<string, string> = {
  bank_account: "Bank account",
  check_number: "Check number",
  full_name: "Three names",
  nida: "NIDA",
  phone: "Phone",
};

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "released", label: "Registered" },
  { value: "rejected", label: "Rejected (duplicate)" },
  { value: "all", label: "All" },
];

/** Registrations held as possible duplicates of an existing customer of any branch (customers.approve). */
export default function DuplicateReviewsPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const allowed = can("customers.approve");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("pending");
  const [branchId, setBranchId] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = usePaged<Review>(allowed ? "customers/duplicate-reviews" : null, { page, per_page: 20, status, branch_id: branchId || undefined });
  const { data: detail } = useApi<Review & { matches: Match[] }>(openId ? `customers/duplicate-reviews/${openId}` : null);

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["Customer", "Duplicate verification"]} />
        <AccessDenied />
      </>
    );
  }

  const decide = async (review: Review, decision: "release" | "reject") => {
    const reason = await promptReason(decision === "release" ? `Why is ${review.name} a different person? The customer will be registered.` : `Why is ${review.name} the same person? The registration will be refused.`);
    if (!reason) {
      return;
    }
    setBusy(true);
    try {
      await api.post(`customers/duplicate-reviews/${review.id}/${decision}`, { reason });
      await client.invalidateQueries();
      setOpenId(null);
      toastSuccess(decision === "release" ? `${review.name} registered.` : `${review.name} rejected as a duplicate.`);
    } catch (error) {
      toastError(error instanceof ApiError ? error.firstError : "The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader crumbs={["Customer", "Duplicate verification"]} />
      <Card title="Registrations held as possible duplicates">
        <div className="mf-filters">
          <SelectBox inputId="duplicates-status" options={STATUSES} value={status} onChange={(value) => { setStatus(value ?? "pending"); setPage(1); }} />
          <SelectBox inputId="duplicates-branch" placeholder="Branch: all" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => { setBranchId(value ?? ""); setPage(1); }} />
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-custom mf-table">
            <thead className="thead-info">
              <tr>
                <th>Applicant</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Matched on</th>
                <th>Submitted by</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="mf-loading"><Loading inline /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="text-center">No registrations match these filters.</td></tr>
              ) : (
                rows.map((review) => (
                  <tr key={review.id}>
                    <td>{review.name}</td>
                    <td className="text-nowrap">{review.phone}</td>
                    <td>{review.branch}</td>
                    <td>{review.reasons.map((reason) => REASONS[reason] ?? reason).join(", ")}</td>
                    <td>{review.requestedBy}</td>
                    <td className="text-nowrap">{formatDateTime(review.requestedAt)}</td>
                    <td>{STATUSES.find((option) => option.value === review.status)?.label ?? review.status}</td>
                    <td className="text-nowrap">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpenId(review.id)}><i className="icon-eye" /> View</button>
                      {review.customerId && <Link href={`/customers/${review.customerId}`} className="btn btn-sm btn-link">Customer</Link>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager meta={data?.meta} onPage={setPage} />
      </Card>

      <Modal open={openId !== null} onClose={() => setOpenId(null)} title="Possible duplicate" size="xl">
        {!detail ? (
          <Loading inline />
        ) : (
          <>
            <p><b>Applicant:</b> {detail.name} · {detail.phone} · NIDA {detail.nidaNumber ?? "—"} · {detail.branch}</p>
            {detail.decisionReason && <p><b>Decision:</b> {detail.decisionReason} ({detail.decidedBy}, {formatDateTime(detail.decidedAt)})</p>}
            <div className="table-responsive">
              <table className="table table-sm mf-table">
                <thead>
                  <tr>
                    <th>Existing customer</th>
                    <th>Branch</th>
                    <th>Phone</th>
                    <th>NIDA</th>
                    <th>Check No.</th>
                    <th>Account No.</th>
                    <th>Date of birth</th>
                    <th>Matched on</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.matches.map((match) => (
                    <tr key={match.customerId}>
                      <td><Link href={`/customers/${match.customerId}`} target="_blank">{match.name}</Link><small className="d-block">{match.customerNumber}{match.deleted ? " · deleted" : ""}</small></td>
                      <td>{match.branch}</td>
                      <td>{match.phone}</td>
                      <td>{match.nidaNumber}</td>
                      <td>{match.checkNumber}</td>
                      <td>{match.accountNumber}</td>
                      <td>{match.dob}</td>
                      <td>{match.reasons.map((reason) => REASONS[reason] ?? reason).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.status === "pending" && (
              <div className="text-right">
                <button type="button" className="btn btn-sm btn-outline-danger mr-2" disabled={busy} onClick={() => void decide(detail, "reject")}><i className="icon-close" /> Same person: reject</button>
                <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => void decide(detail, "release")}><i className="icon-check" /> Different person: register</button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
