"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { IMPORT_STATUS, ROW_STATUS, type LegacyImportDetail, type LegacyImportRow, type RowStatus } from "@/components/imports/types";
import { Stat } from "@/components/reports/ReportKit";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { backendUrl } from "@/lib/api";
import { money } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

const FILTERS: { value: "all" | RowStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "valid", label: "Valid" },
  { value: "warning", label: "Warnings" },
  { value: "error", label: "Errors" },
  { value: "duplicate", label: "Duplicates" },
  { value: "unmatched", label: "Unmatched" },
  { value: "imported", label: "Imported" },
];

/**
 * Preview and approval of one old-system file: counts, the balances it brings in, every row with its status and exact
 * reasons, the exception file, and the workflow — Submit for Approval (uploader), Approve / Reject (another authorised
 * user), map unmatched customers, roll back an approved import.
 */
export default function LegacyImportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | RowStatus>("all");
  const [mapping, setMapping] = useState<LegacyImportRow | null>(null);
  const { data: detail, isLoading } = useApi<LegacyImportDetail>(`legacy-imports/${id}`);
  const { data: rows, isLoading: rowsLoading } = useApi<LegacyImportRow[]>(`legacy-imports/${id}/rows`);

  const submit = useAction("post", `legacy-imports/${id}/submit`);
  const approve = useAction("post", `legacy-imports/${id}/approve`);
  const reject = useAction<{ reason: string }>("post", `legacy-imports/${id}/reject`);
  const rollback = useAction<{ reason: string }>("post", `legacy-imports/${id}/rollback`);
  const remove = useAction("delete", `legacy-imports/${id}`);

  if (isLoading || !detail) {
    return <PageHeader crumbs={["Approvals", "Old System Imports", `#${id}`]} />;
  }

  const count = (value: "all" | RowStatus) => (rows ?? []).filter((row) => value === "all" || row.status === value).length;
  const visible = (rows ?? []).filter((row) => filter === "all" || row.status === filter);
  const t = detail.totals;

  return (
    <>
      <PageHeader crumbs={["Approvals", "Old System Imports", `#${detail.id}`]} />

      <Card
        title={
          <>
            {detail.module_label} — {detail.branch} {detail.year ? `(${detail.year})` : ""} <Badge tone={IMPORT_STATUS[detail.status].tone}>{IMPORT_STATUS[detail.status].label}</Badge>
          </>
        }
        actions={
          <>
            <a className="btn btn-sm btn-outline-secondary ml-1" href={backendUrl(`legacy-imports/${detail.id}/exceptions`)}>
              <i className="fa fa-download" /> Exception File
            </a>
            {detail.can_submit && (
              <button type="button" className="btn btn-sm btn-primary ml-1" disabled={submit.isPending} onClick={async () => (await confirmAction("Send this import for approval?", `${t.importable_rows ?? 0} rows will be imported when approved.`)) && submit.mutate(undefined)}>
                Submit for Approval
              </button>
            )}
            {detail.can_approve && (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-success ml-1"
                  disabled={approve.isPending}
                  onClick={async () =>
                    (await confirmAction("Approve this import?", `${t.importable_rows ?? 0} records go live now. ${detail.error_rows + detail.duplicate_rows + detail.unmatched_rows} rows with errors, duplicates or no customer are left out.`)) && approve.mutate(undefined)
                  }
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger ml-1"
                  disabled={reject.isPending}
                  onClick={async () => {
                    const reason = await promptReason("Reason for rejection");
                    if (reason) {
                      reject.mutate({ reason });
                    }
                  }}
                >
                  Reject
                </button>
              </>
            )}
            {detail.can_rollback && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger ml-1"
                disabled={rollback.isPending}
                onClick={async () => {
                  if (!(await confirmAction("Roll back this import?", "Its loans, penalties or salary advances are removed and its opening journal reversed. Only possible while none of them has been used."))) {
                    return;
                  }
                  const reason = await promptReason("Reason for the rollback");
                  if (reason) {
                    rollback.mutate({ reason });
                  }
                }}
              >
                Roll Back
              </button>
            )}
            {detail.can_delete && (
              <button type="button" className="btn btn-sm btn-outline-secondary ml-1" disabled={remove.isPending} onClick={async () => (await confirmAction("Delete this draft?")) && remove.mutate(undefined, { onSuccess: () => router.push("/imports") })}>
                Delete Draft
              </button>
            )}
          </>
        }
      >
        {detail.approve_blocked_reason && <div className="alert alert-info">{detail.approve_blocked_reason}</div>}
        {detail.status === "rejected" && <div className="alert alert-danger">Rejected by {detail.rejected_by} on {detail.rejected_at}: {detail.rejection_reason}. Correct the file and upload it again.</div>}
        {detail.status === "rolled_back" && <div className="alert alert-dark">Rolled back by {detail.rolled_back_by} on {detail.rolled_back_at}: {detail.rollback_reason}.</div>}

        <div className="row clearfix">
          <Stat tone="primary" label="Total Records" value={detail.total_rows} className="col-lg-2 col-md-4 col-6" />
          <Stat tone="success" label="Valid Records" value={detail.valid_rows} className="col-lg-2 col-md-4 col-6" />
          <Stat tone="warning" label="Warnings" value={detail.warning_rows} className="col-lg-2 col-md-4 col-6" />
          <Stat tone="danger" label="Errors" value={detail.error_rows} className="col-lg-2 col-md-4 col-6" />
          <Stat tone="info" label="Duplicates" value={detail.duplicate_rows} className="col-lg-2 col-md-4 col-6" />
          <Stat tone="info" label="Unmatched Customers" value={detail.unmatched_rows} className="col-lg-2 col-md-4 col-6" />
        </div>

        <div className="row clearfix">
          {detail.module === "loan" && (
            <>
              <Stat tone="primary" label={`Total Loan Outstanding (${t.importable_rows ?? 0} loans)`} value={money(t.loan_outstanding)} />
              <Stat tone="success" label={`Active Loans Outstanding (${t.active_loans ?? 0})`} value={money(t.active_outstanding)} />
              <Stat tone="danger" label={`Default Loans Outstanding (${t.default_loans ?? 0})`} value={money(t.default_outstanding)} />
              <Stat tone="info" label="Total Loans Issued (Loan Amount)" value={money(t.total_issued)} />
            </>
          )}
          {detail.module === "penalty" && <Stat tone="warning" label={`Total Penalty Outstanding (${t.importable_rows ?? 0} penalties)`} value={money(t.penalty_outstanding)} />}
          {detail.module === "salary_advance" && <Stat tone="info" label={`Total Salary Advance Outstanding (${t.importable_rows ?? 0} advances)`} value={money(t.salary_advance_outstanding)} />}
        </div>

        <table className="table table-sm table-bordered mb-0">
          <tbody>
            <tr><th style={{ width: 200 }}>File</th><td>{detail.file_name}</td><th style={{ width: 200 }}>Module / Branch</th><td>{detail.module_label} / {detail.branch}</td></tr>
            <tr><th>Uploaded by</th><td>{detail.uploaded_by} — {detail.uploaded_at}</td><th>Submitted by</th><td>{detail.submitted_by ? `${detail.submitted_by} — ${detail.submitted_at}` : "—"}</td></tr>
            <tr><th>Approved by</th><td>{detail.approved_by ? `${detail.approved_by} — ${detail.approved_at}` : "—"}</td><th>Opening journal</th><td>{detail.journal_reference ?? (detail.module === "penalty" && detail.status === "approved" ? "None (penalties are cash basis)" : "—")}</td></tr>
          </tbody>
        </table>
      </Card>

      <Card
        title="Records"
        actions={
          <div className="btn-group btn-group-sm">
            {FILTERS.map((option) => (
              <button key={option.value} type="button" className={`btn ${filter === option.value ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setFilter(option.value)}>
                {option.label} ({count(option.value)})
              </button>
            ))}
          </div>
        }
      >
        <DataTable rows={visible} loading={rowsLoading} rowKey={(row) => row.id} columns={columnsFor(detail, setMapping)} />
      </Card>

      {mapping && <MapRowModal importId={detail.id} row={mapping} onClose={() => setMapping(null)} />}
    </>
  );
}

function columnsFor(detail: LegacyImportDetail, onMap: (row: LegacyImportRow) => void): Column<LegacyImportRow>[] {
  const figures: Column<LegacyImportRow>[] =
    detail.module === "loan"
      ? [
          { key: "phone", header: "Phone" },
          { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
          { key: "duration", header: "Duration", render: (row) => (row.duration_type ? `${row.duration_type} / ${row.sessions}` : row.raw["Duration Type / Number"]) },
          { key: "collection", header: "Collection", render: (row) => money(row.collection) },
          { key: "paid_amount", header: "Paid", render: (row) => money(row.paid_amount) },
          { key: "remain_amount", header: "Remain (opening)", render: (row) => <b>{money(row.remain_amount)}</b> },
          { key: "withdrawal_date", header: "Withdrawal" },
          { key: "loan_status", header: "Loan Status", render: (row) => row.loan_status ?? row.raw["Loan Status"] },
          { key: "monthly", header: "Jan–Sep", sortable: false, render: (row) => <small>{MONTHS.map((month, index) => row.monthly[index + 1] ? `${month} ${money(row.monthly[index + 1])}` : null).filter(Boolean).join(", ") || "—"}</small> },
        ]
      : detail.module === "penalty"
        ? [
            { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
            { key: "penalty_amount", header: "Penalty Amount", render: (row) => <b>{money(row.penalty_amount)}</b> },
            { key: "penalty_date", header: "Date" },
            { key: "accounting", header: "Accounting", render: (row) => row.raw.Accounting },
          ]
        : [
            { key: "loan_amount", header: "Loan Amount", render: (row) => money(row.loan_amount) },
            { key: "interest", header: "Interest", render: (row) => money(row.interest) },
            { key: "total_payable", header: "Principal + Interest", render: (row) => money(row.total_payable) },
            { key: "paid_amount", header: "Paid", render: (row) => money(row.paid_amount) },
            { key: "remain_amount", header: "Remain (opening)", render: (row) => <b>{money(row.remain_amount)}</b> },
            { key: "fee", header: "Carger", render: (row) => money(row.fee) },
            { key: "alert_date", header: "Date Alert", render: (row) => row.alert_date ?? row.raw["Date Alert"] },
          ];

  return [
    { key: "row_number", header: "Row" },
    { key: "status", header: "Status", render: (row) => <Badge tone={ROW_STATUS[row.status].tone}>{ROW_STATUS[row.status].label}</Badge> },
    { key: "customer_name", header: "Customer Name (file)", render: (row) => row.customer_name ?? <span className="text-danger">missing</span> },
    {
      key: "customer",
      header: "Matched Customer",
      value: (row) => row.customer?.full_name,
      render: (row) =>
        row.customer ? (
          <>
            <Link href={`/customers/${row.customer.id}`}>{row.customer.full_name}</Link>
            <br />
            <small className="text-muted">{row.customer.customer_number} · {row.match_method === "manual" ? `mapped by ${row.mapped_by}` : `by ${row.match_method?.replace("_", " + ")}`}</small>
          </>
        ) : "—",
    },
    ...figures,
    { key: "messages", header: "Reason", sortable: false, value: (row) => row.messages.join(" "), render: (row) => <small>{row.messages.map((message) => <div key={message}>{message}</div>)}</small> },
    {
      key: "action",
      header: "Action",
      sortable: false,
      className: "text-nowrap",
      render: (row) =>
        row.imported ? (
          row.imported.link ? <Link href={row.imported.link}>{row.imported.label}</Link> : row.imported.label
        ) : detail.can_map && row.status !== "imported" && row.customer_name ? (
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => onMap(row)}>
            {row.status === "unmatched" ? "Map Customer" : "Change Customer"}
          </button>
        ) : null,
    },
  ];
}

interface CustomerOption {
  value: string;
  label: string;
}

/** Map a row by hand: search an existing customer (any branch), or deliberately create a new customer from the row. */
function MapRowModal({ importId, row, onClose }: { importId: number; row: LegacyImportRow; onClose: () => void }) {
  const [term, setTerm] = useState(row.customer_name ?? "");
  const { data: options, isLoading } = useApi<CustomerOption[]>(term.trim().length >= 2 ? `legacy-imports/${importId}/customers` : null, { q: term.trim() });
  const map = useAction<{ customer_id?: number; create?: boolean }>("post", `legacy-imports/${importId}/rows/${row.id}/map`);
  const done = { onSuccess: onClose };

  return (
    <Modal open onClose={onClose} title={`Row ${row.row_number}: ${row.customer_name}`} size="lg">
      {row.messages.length > 0 && <div className="alert alert-info small">{row.messages.map((message) => <div key={message}>{message}</div>)}</div>}
      <label className="mf-label">Find the customer (name, phone or customer number)</label>
      <input className="form-control mb-2" value={term} onChange={(event) => setTerm(event.target.value)} autoFocus />
      <div className="list-group mb-3" style={{ maxHeight: 280, overflowY: "auto" }}>
        {isLoading && <div className="list-group-item text-muted">Searching…</div>}
        {(options ?? []).map((option) => (
          <button key={option.value} type="button" className="list-group-item list-group-item-action" disabled={map.isPending} onClick={async () => (await confirmAction("Map this row to", option.label)) && map.mutate({ customer_id: Number(option.value) }, done)}>
            {option.label}
          </button>
        ))}
        {!isLoading && options?.length === 0 && <div className="list-group-item text-muted">No customer found.</div>}
      </div>
      <div className="border-top pt-3">
        <p className="small text-muted mb-2">
          Only if this person is not a customer yet: create a new customer from the row (name{row.phone ? " and phone" : ""} as printed, in this import&apos;s branch). Gender, date of birth and ID are not in the file, so registration must be completed before any new loan.
        </p>
        <button type="button" className="btn btn-sm btn-warning" disabled={map.isPending} onClick={async () => (await confirmAction("Create a new customer?", `${row.customer_name} will be registered as a new customer.`)) && map.mutate({ create: true }, done)}>
          Create New Customer
        </button>
      </div>
    </Modal>
  );
}
