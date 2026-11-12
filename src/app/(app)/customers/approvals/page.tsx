"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { CustomerAvatar, CustomerStatusBadges, Pager, formatDateTime, usePaged } from "@/components/customers/common";
import { toastError, toastSuccess } from "@/components/customers/toast";
import type { Customer } from "@/components/customers/types";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { SelectBox } from "@/components/ui/SelectBox";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const TABS = [
  { value: "pending", label: "All Pending", tone: "warning" },
  { value: "awaiting", label: "Ready (KYC Complete)", tone: "success" },
  { value: "kyc_incomplete", label: "KYC Incomplete", tone: "danger" },
  { value: "returned", label: "Returned", tone: "secondary" },
  { value: "approved", label: "Approved", tone: "info" },
  { value: "all", label: "All", tone: "dark" },
] as const;

type Tab = (typeof TABS)[number]["value"];

/**
 * KYC Approval (customers.approve): registrations by status tab - awaiting a decision (KYC complete or not), returned to
 * the officer, approved, or all - each tab with its count. Only a registration awaiting a decision can be approved or
 * rejected.
 */
export default function CustomerApprovalsPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const allowed = can("customers.approve");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("pending");
  const [branchId, setBranchId] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading } = usePaged<Customer>(allowed ? "customers/pending-approval" : null, { page, per_page: 20, status: tab, branch_id: branchId || undefined });
  const counts = (data as { counts?: Partial<Record<Tab, number>> } | undefined)?.counts;

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["Customer", "KYC Approval"]} />
        <AccessDenied />
      </>
    );
  }

  const decide = async (customer: Customer, decision: "approve" | "reject") => {
    let body: { reason?: string } = {};
    if (decision === "approve") {
      if (!(await confirmAction(`Approve the registration of ${customer.fullName}?`))) {
        return;
      }
    } else {
      const reason = await promptReason(`Reason for rejecting ${customer.fullName}`);
      if (!reason) {
        return;
      }
      body = { reason };
    }
    setBusyId(customer.id);
    try {
      await api.post(`customers/${customer.id}/${decision}`, body);
      await client.invalidateQueries();
      toastSuccess(decision === "approve" ? `${customer.fullName} approved.` : `${customer.fullName} returned to the officer.`);
    } catch (error) {
      toastError(error instanceof ApiError ? error.firstError : "The decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  };

  const rows = data?.data ?? [];

  return (
    <>
      <PageHeader crumbs={["Customer", "KYC Approval"]} right={<Link href="/customers" className="btn btn-sm btn-outline-primary"><i className="icon-arrow-left" /> All Customer</Link>} />
      <Card title="KYC Approval">
        <ul className="nav nav-tabs mb-3 flex-wrap">
          {TABS.map((item) => (
            <li className="nav-item" key={item.value}>
              <button type="button" className={`nav-link btn btn-link ${tab === item.value ? "active" : ""}`} onClick={() => { setTab(item.value); setPage(1); }}>
                {item.label} <span className={`badge badge-${item.tone} ml-1`}>{counts?.[item.value] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mf-filters">
          <SelectBox inputId="approvals-branch" placeholder="Branch: all" optionsUrl="options/branches" value={branchId} isClearable onChange={(value) => { setBranchId(value ?? ""); setPage(1); }} />
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-custom mf-table">
            <thead className="thead-info">
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Branch</th>
                <th>Customer Type</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="mf-loading"><Loading inline /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center">{tab === "pending" ? "No registrations are waiting for approval." : "No registrations in this tab."}</td></tr>
              ) : (
                rows.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="mf-customer-cell">
                        <CustomerAvatar customer={customer} />
                        <div>
                          <Link href={`/customers/${customer.id}`}>{customer.fullName}</Link>
                          <small>{customer.customerNumber}</small>
                        </div>
                      </div>
                    </td>
                    <td className="text-nowrap">{customer.phone}</td>
                    <td>{customer.branchName}</td>
                    <td>{customer.categoryName}</td>
                    <td className="text-nowrap">{formatDateTime(customer.createdAt)}</td>
                    <td><CustomerStatusBadges customer={customer} showAccount={false} /></td>
                    <td className="text-nowrap">
                      {customer.approvalStatus === "pending" ? (
                        <>
                          <button type="button" className="btn btn-sm btn-success mr-1" disabled={busyId === customer.id} onClick={() => void decide(customer, "approve")}>
                            <i className="icon-check" /> Approve
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyId === customer.id} onClick={() => void decide(customer, "reject")}>
                            <i className="icon-close" /> Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href={`/customers/${customer.id}`} className="btn btn-sm btn-outline-primary"><i className="icon-eye" /> View</Link>
                          {customer.approvalStatus === "rejected" && customer.rejectionReason && <small className="d-block text-muted text-wrap" style={{ maxWidth: 260 }}>Reason: {customer.rejectionReason}</small>}
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
