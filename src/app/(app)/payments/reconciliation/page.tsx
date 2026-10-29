"use client";

import { Fragment, useState } from "react";

import { DEPOSIT_BADGE, type TellerDeposit } from "@/components/payments/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, periodQuery, todayPeriod } from "@/components/ui/PeriodFilter";
import { SelectBox } from "@/components/ui/SelectBox";
import { backendUrl } from "@/lib/api";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { money } from "@/lib/format";
import { useAction } from "@/lib/hooks";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const STATUSES = [
  { value: "pending", label: "PENDING" },
  { value: "mismatch", label: "MISMATCH" },
  { value: "verified", label: "VERIFIED" },
  { value: "confirmed", label: "CONFIRMED" },
  { value: "rejected", label: "REJECTED" },
  { value: "all", label: "ALL" },
];

/** Payments → Bank Reconciliation: teller deposit slips vs teller cash receipts vs bank statement. */
export default function ReconciliationPage() {
  // Opens on today's deposits of every status (§8.2); history through the branch and period filter.
  const [filter, setFilter] = useState(todayPeriod());
  const [status, setStatus] = useState("all");
  const [zoneId, setZoneId] = useState("");
  const [verifying, setVerifying] = useState<TellerDeposit | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({ statement_amount: "", statement_reference: "" });
  const query = { status, zone_id: zoneId || undefined, ...periodQuery(filter) };
  const { data, isLoading } = useQuery({
    queryKey: ["payments/reconciliation", query],
    queryFn: () => api.get<{ data: TellerDeposit[]; summary: Record<string, { count: number; amount: number }> }>("payments/reconciliation", query),
  });
  const rows = data?.data;
  const summary = data?.summary ?? {};

  const verify = useAction<{ id: number; statement_amount: string; statement_reference: string }>("post", (body) => `payments/reconciliation/${body.id}/verify`);
  const confirm = useAction<{ id: number }>("post", (body) => `payments/reconciliation/${body.id}/confirm`);
  const reject = useAction<{ id: number; reason: string }>("post", (body) => `payments/reconciliation/${body.id}/reject`);

  const detail = rows?.find((row) => row.id === expanded);

  return (
    <>
      <PageHeader crumbs={["Payments", "Bank Reconciliation"]} />

      <Card title="Teller Bank Deposits">
        <div className="d-flex flex-wrap align-items-start">
          <PeriodFilter value={filter} onChange={setFilter} idPrefix="reconciliation" />
          <select className="form-control ml-2" style={{ width: 150 }} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <div style={{ minWidth: 180 }} className="ml-2">
            <SelectBox inputId="reconciliation-zone" placeholder="All zones" optionsUrl="payments/zone-options" value={zoneId} isClearable onChange={(value) => setZoneId(value ?? "")} />
          </div>
        </div>
        <div className="mf-totals mb-2">
          {STATUSES.filter((item) => item.value !== "all").map((item) => (
            <span key={item.value} className="mr-3">{item.label}: <b>{summary[item.value]?.count ?? 0}</b> · {money(summary[item.value]?.amount ?? 0)}</span>
          ))}
        </div>
        <DataTable
          emptyMessage="No deposits match the selected branch, status and period."
          rows={rows}
          loading={isLoading}
          rowKey={(row) => row.id}
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "branch", header: "Branch Name" },
            { key: "teller", header: "Teller" },
            { key: "bank_account", header: "Bank" },
            { key: "slip_number", header: "Slip Number", render: (row) => row.slip_number ?? "—" },
            { key: "deposit_date", header: "Date" },
            { key: "amount", header: "Slip Amount", render: (row) => money(row.amount) },
            { key: "expected_amount", header: "Teller Cash", render: (row) => money(row.expected_amount) },
            { key: "statement_amount", header: "Bank Statement", render: (row) => (row.statement_amount === null ? "-" : `${money(row.statement_amount)} (${row.statement_reference})`) },
            { key: "difference", header: "Difference", render: (row) => <span className={row.difference !== 0 ? "text-danger" : ""}>{money(row.difference)}</span> },
            { key: "status", header: "Status", render: (row) => <Badge tone={DEPOSIT_BADGE[row.status]}>{row.status.toUpperCase()}</Badge> },
            { key: "rejection_reason", header: "Comment" },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => (
                <>
                  <button type="button" className="btn btn-sm btn-icon btn-info mr-1" title="Receipts" onClick={() => setExpanded(row.id)}><i className="icon-eye" /></button>
                  {row.has_receipt ? (
                    <a className="btn btn-sm btn-icon btn-outline-primary mr-1" title="View Receipt" href={backendUrl(`payments/reconciliation/${row.id}/receipt`)} target="_blank" rel="noopener noreferrer"><i className="icon-paper-clip" /></a>
                  ) : (
                    <span className="btn btn-sm btn-icon btn-outline-secondary mr-1 disabled" title="No receipt uploaded" aria-disabled="true"><i className="icon-paper-clip" /></span>
                  )}
                  {(row.status === "pending" || row.status === "mismatch") && (
                    <button type="button" className="btn btn-sm btn-icon btn-primary mr-1" title="Verify" onClick={() => { setVerifying(row); setForm({ statement_amount: String(row.amount), statement_reference: "" }); }}><i className="icon-pencil" /></button>
                  )}
                  {row.status === "verified" && (
                    <button type="button" className="btn btn-sm btn-icon btn-success mr-1" title="Confirm" disabled={confirm.isPending} onClick={async () => (await confirmAction("Confirm payment?", "Payments will be posted to the loans and customers notified.")) && confirm.mutate({ id: row.id })}><i className={confirm.isPending && confirm.variables?.id === row.id ? "fa fa-spinner fa-spin" : "icon-check"} /></button>
                  )}
                  {row.status !== "confirmed" && row.status !== "rejected" && (
                    <button
                      type="button"
                      className="btn btn-sm btn-icon btn-danger"
                      title="Reject"
                      disabled={reject.isPending}
                      onClick={async () => {
                        const reason = await promptReason("Reject bank deposit");
                        if (reason) {
                          reject.mutate({ id: row.id, reason });
                        }
                      }}
                    >
                      <i className={reject.isPending && reject.variables?.id === row.id ? "fa fa-spinner fa-spin" : "icon-close"} />
                    </button>
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={verifying !== null}
        onClose={() => setVerifying(null)}
        title={verifying && `Verify slip ${verifying.slip_number ?? `#${verifying.id}`} — ${money(verifying.amount)}`}
        submitLabel="Verify"
        submitting={verify.isPending}
        onSubmit={() => verifying && verify.mutate({ id: verifying.id, ...form }, { onSuccess: () => setVerifying(null) })}
      >
        <div className="row">
          <Field label="Bank Statement Amount:" required className="col-md-6" error={verify.fieldError("statement_amount")}>
            <input type="number" className="form-control" value={form.statement_amount} onChange={(e) => setForm({ ...form, statement_amount: e.target.value })} required />
          </Field>
          <Field label="Bank Statement Reference:" required className="col-md-6" error={verify.fieldError("statement_reference")}>
            <input className="form-control" placeholder="Enter reference" value={form.statement_reference} onChange={(e) => setForm({ ...form, statement_reference: e.target.value })} required />
          </Field>
        </div>
      </Modal>

      <Modal open={detail !== undefined} onClose={() => setExpanded(null)} title={detail && `Slip ${detail.slip_number ?? `#${detail.id}`}`} size="lg">
        {detail && (
          <table className="table table-custom mb-0">
            <thead className="thead-info"><tr><th>Receipt</th><th>Customer</th><th>Loan</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {detail.payments.map((payment) => (
                <Fragment key={payment.id}>
                  <tr>
                    <td>{payment.receipt_number}</td>
                    <td>{payment.customer}</td>
                    <td>{payment.loan_number}</td>
                    <td>{money(payment.amount)}</td>
                    <td>{payment.paid_on}</td>
                    <td><Badge tone={payment.status_badge}>{payment.status_label}</Badge></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

    </>
  );
}
