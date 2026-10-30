"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import type { Loan } from "@/components/loans/types";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, periodQuery, todayPeriod } from "@/components/ui/PeriodFilter";
import { SelectBox } from "@/components/ui/SelectBox";
import { confirmAction, promptReason } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useAction, useApi } from "@/lib/hooks";

interface Discount {
  id: number;
  status: "pending" | "approved" | "rejected";
  loan_id: number;
  loan_number: string | null;
  customer_name: string | null;
  branch: string | null;
  original_debt: number;
  actual_payment: number;
  requested_amount: number;
  approved_amount: number | null;
  principal: number;
  interest: number;
  insurance: number;
  reason: string;
  requested_by: string | null;
  requested_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const EMPTY = { customer_id: "", loan_id: "", amount: "", actual_payment: "", reason: "" };

/**
 * Loan Repayment → Discount / Waiver (enhancement §6): reduce an issued loan's outstanding debt. A request changes nothing;
 * another authorised user approves it, and only then the balance falls (never counted as cash received).
 */
export default function LoanDiscountsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState("pending");
  const [filter, setFilter] = useState(todayPeriod());
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const query = { status, ...periodQuery(filter) };
  const { data, isLoading } = useQuery({
    queryKey: ["loans/discounts", query],
    queryFn: () => api.get<{ data: Discount[]; totals: { count: number; requested: number; approved: number } }>("loans/discounts", query),
  });
  const { data: loans = [] } = useApi<Loan[]>(form?.customer_id ? "loans" : null, { stage: "disbursed", customer_id: form?.customer_id });
  const request = useAction<{ loan_id: string; amount: string; actual_payment: string; reason: string }>("post", (body) => `loans/${body.loan_id}/discounts`);
  const approve = useAction<{ id: number; approved_amount?: number }>("post", (body) => `loans/discounts/${body.id}/approve`);
  const reject = useAction<{ id: number; reason: string }>("post", (body) => `loans/discounts/${body.id}/reject`);
  const selected = loans.find((loan) => String(loan.id) === form?.loan_id);

  return (
    <>
      <PageHeader crumbs={["Teller", "Loan Discount / Waiver"]} />
      <Card
        title="Loan Discount / Waiver Requests"
        actions={can("loans.discount_request") && <button type="button" className="btn btn-sm btn-primary" onClick={() => { request.setErrors({}); setForm(EMPTY); }}><i className="icon-plus" /> New request</button>}
      >
        <div className="d-flex flex-wrap align-items-start">
          <PeriodFilter value={filter} onChange={setFilter} idPrefix="discounts" />
          <select className="form-control ml-2" style={{ width: 150 }} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <p className="text-muted small mb-2">
          {status === "pending" ? "Every request waiting for approval is listed; the branch filter applies." : "Decided requests in the selected period."}
          {" "}Records: <b>{data?.totals.count ?? 0}</b> · Requested <b>{money(data?.totals.requested ?? 0)}</b> · Approved <b>{money(data?.totals.approved ?? 0)}</b>
        </p>
        <DataTable
          rows={data?.data}
          loading={isLoading}
          rowKey={(row) => row.id}
          emptyMessage="No discount requests match these filters."
          columns={[
            { key: "sn", header: "S/No.", render: (_, index) => `${index + 1}.`, sortable: false },
            { key: "customer_name", header: "Customer" },
            { key: "loan_number", header: "Loan", render: (row) => <Link href={`/loans/${row.loan_id}`}>{row.loan_number}</Link> },
            { key: "branch", header: "Branch" },
            { key: "original_debt", header: "Original Debt", render: (row) => money(row.original_debt) },
            { key: "actual_payment", header: "Customer Pays", render: (row) => money(row.actual_payment) },
            { key: "requested_amount", header: "Requested Discount", render: (row) => money(row.requested_amount) },
            { key: "approved_amount", header: "Approved", render: (row) => (row.approved_amount === null ? "—" : money(row.approved_amount)) },
            { key: "reason", header: "Reason" },
            { key: "requested_by", header: "Requested By", render: (row) => <>{row.requested_by}<small className="d-block">{row.requested_at}</small></> },
            { key: "decided_by", header: "Decided By", render: (row) => row.decided_by ? <>{row.decided_by}<small className="d-block">{row.decided_at}</small>{row.decision_note && <small className="d-block">{row.decision_note}</small>}</> : "—" },
            { key: "status", header: "Status", render: (row) => <span className={`badge badge-${row.status === "approved" ? "success" : row.status === "rejected" ? "danger" : "warning"}`}>{row.status.toUpperCase()}</span> },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) =>
                row.status === "pending" && can("loans.discount_approve") && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-success mr-1"
                      disabled={approve.isPending}
                      onClick={async () => (await confirmAction(`Approve a discount of ${money(row.requested_amount)} on ${row.loan_number}?`, "The outstanding balance falls by this amount. It is not cash received.")) && approve.mutate({ id: row.id })}
                    >
                      <i className="icon-check" /> Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={reject.isPending}
                      onClick={async () => {
                        const reason = await promptReason("Reason for rejecting this discount");
                        if (reason) {
                          reject.mutate({ id: row.id, reason });
                        }
                      }}
                    >
                      <i className="icon-close" /> Reject
                    </button>
                  </>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title="Request a loan discount / waiver"
        submitLabel="Send for approval"
        submitting={request.isPending}
        onSubmit={() => form && request.mutate({ loan_id: form.loan_id, amount: form.amount, actual_payment: form.actual_payment, reason: form.reason }, { onSuccess: () => setForm(null) })}
      >
        {form && (
          <div className="row">
            <Field label="Customer:" required className="col-md-6">
              <SelectBox placeholder="Select customer" optionsUrl="options/customers" value={form.customer_id} onChange={(value) => setForm({ ...form, customer_id: value ?? "", loan_id: "" })} />
            </Field>
            <Field label="Active loan:" required className="col-md-6" error={request.fieldError("loan")}>
              <select className="form-control" value={form.loan_id} onChange={(event) => setForm({ ...form, loan_id: event.target.value })} required>
                <option value="">Select loan</option>
                {loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.loan_number} · {money(loan.amount_approved)}</option>)}
              </select>
              {selected && <small className="text-muted">Loan {selected.loan_number}, approved {money(selected.amount_approved)}.</small>}
            </Field>
            <Field label="Customer's actual payment:" className="col-md-6" error={request.fieldError("actual_payment")}>
              <input type="number" min={0} step="0.01" className="form-control" value={form.actual_payment} onChange={(event) => setForm({ ...form, actual_payment: event.target.value })} />
            </Field>
            <Field label="Discount / Waiver amount:" required className="col-md-6" error={request.fieldError("amount")}>
              <input type="number" min={1} step="0.01" className="form-control" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
            </Field>
            <Field label="Reason:" required className="col-md-12" error={request.fieldError("reason")}>
              <textarea className="form-control" rows={3} maxLength={1000} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required />
            </Field>
            <small className="col-md-12 text-muted">Covers outstanding interest, insurance and principal; penalties are waived from Penalty. Nothing changes until another user approves.</small>
          </div>
        )}
      </Modal>
    </>
  );
}
