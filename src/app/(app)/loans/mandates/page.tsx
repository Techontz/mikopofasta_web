"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, monthPeriod, periodLabel, periodQuery } from "@/components/ui/PeriodFilter";
import { notifyError, notifySuccess, promptReason } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

interface MandateReport {
  cards: { total_mandates: number; approved_mandates: number; pending_mandates: number; failed_mandates: number; expected_this_period: number; paid_this_period: number; total_outstanding: number };
  channel_performance: { channel: string; count: number; expected: number; paid: number }[];
  branch_performance: { branch: string; count: number; expected: number; paid: number }[];
  paid_rows: { id: number; provider: string; channel: string | null; mandate_type: string | null; mandate_reference: string | null; payment_reference: string; raw_status: string; payment_status: string; expected_amount: number; paid_amount: number; allocated_amount: number; collection_date: string; remarks: string | null; loan_number: string | null; branch: string | null }[];
  batches: { id: number; reference: string; provider: string; channel: string | null; source: string; collection_date: string; records: number; expected: number; paid: number }[];
}

interface Mandate {
  id: number;
  loan_number: string | null;
  customer: string | null;
  branch: string | null;
  bank_name: string | null;
  provider: string | null;
  channel: string | null;
  mandate_type: string | null;
  mandate_reference: string | null;
  status: string;
  cancellation_status: string | null;
  cancellation_reference: string | null;
}

const STATUS_TONE: Record<string, string> = { full: "success", partial: "warning", failed: "danger", unmatched: "dark" };

/** Loan → E-Mandate (enhancement §4): mandates, bank collections and reports; totals follow the branch and period. */
export default function MandatesPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const [filter, setFilter] = useState(monthPeriod());
  const query = periodQuery(filter);
  const { data } = useApi<MandateReport>("loans/mandates/report", query);
  const { data: mandates } = useApi<Mandate[]>("loans/mandates", { branch_id: filter.branch_id });
  const [upload, setUpload] = useState<{ provider: string; channel: string; collection_date: string; file: File | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const c = data?.cards;

  const submitUpload = async () => {
    if (!upload?.file) {
      return;
    }
    const body = new FormData();
    body.append("provider", upload.provider);
    body.append("channel", upload.channel);
    body.append("collection_date", upload.collection_date);
    body.append("file", upload.file);
    setBusy(true);
    try {
      const result = await api.post<{ message: string }>("loans/mandates/collections", body);
      await client.invalidateQueries();
      notifySuccess(result.message);
      setUpload(null);
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(false);
    }
  };

  const confirmCancellation = async (mandate: Mandate) => {
    const reference = await promptReason(`Bank reference confirming the cancellation of ${mandate.mandate_reference}`);
    if (!reference) {
      return;
    }
    try {
      await api.post(`loans/mandates/${mandate.id}/confirm-cancellation`, { reference });
      await client.invalidateQueries();
      notifySuccess("Mandate cancellation confirmed");
    } catch (error) {
      notifyError(error);
    }
  };

  const card = (label: string, value: string) => (
    <div className="col-lg-3 col-md-4 col-6 mb-2" key={label}>
      <div className="card mb-0"><div className="body"><small className="text-muted">{label}</small><h5 className="mb-0">{value}</h5></div></div>
    </div>
  );

  return (
    <>
      <PageHeader crumbs={["Loan", "E-Mandate"]} printDetails={<span>Period: <b>{periodLabel(filter)}</b></span>} />
      <Card title="E-Mandate / Direct Debit" actions={can("payments.verify") && <button type="button" className="btn btn-sm btn-primary" onClick={() => setUpload({ provider: "", channel: "BANK", collection_date: new Date().toISOString().slice(0, 10), file: null })}><i className="icon-cloud-upload" /> Upload collection file</button>}>
        <PeriodFilter value={filter} onChange={setFilter} idPrefix="mandates" />
        <div className="row">
          {c && [
            card("Total Mandates", String(c.total_mandates)),
            card("Approved Mandates", String(c.approved_mandates)),
            card("Pending Mandates", String(c.pending_mandates)),
            card("Failed Mandates", String(c.failed_mandates)),
            card(`Expected Mandate (${periodLabel(filter)})`, `TZS ${money(c.expected_this_period)}`),
            card(`Paid (${periodLabel(filter)})`, `TZS ${money(c.paid_this_period)}`),
            card("Total Outstanding Mandate", `TZS ${money(c.total_outstanding)}`),
          ]}
        </div>
      </Card>

      <Card title={`Paid — ${periodLabel(filter)}`}>
        <DataTable
          rows={data?.paid_rows}
          rowKey={(row) => row.id}
          emptyMessage="No collections in the selected period."
          columns={[
            { key: "provider", header: "Service Provider" },
            { key: "channel", header: "Channel" },
            { key: "mandate_type", header: "Mandate Type" },
            { key: "mandate_reference", header: "Mandate Reference" },
            { key: "payment_reference", header: "Payment Reference" },
            { key: "raw_status", header: "Raw Status" },
            { key: "payment_status", header: "Payment Status", render: (row) => <span className={`badge badge-${STATUS_TONE[row.payment_status] ?? "info"}`}>{row.payment_status.toUpperCase()}</span> },
            { key: "expected_amount", header: "Expected Amount", render: (row) => money(row.expected_amount) },
            { key: "allocated_amount", header: "Paid Amount", render: (row) => money(row.allocated_amount) },
            { key: "collection_date", header: "Collection Date" },
            { key: "remarks", header: "Remarks" },
          ]}
          footer={data && <tr><th colSpan={7}>TOTAL</th><th>{money(data.paid_rows.reduce((sum, row) => sum + row.expected_amount, 0))}</th><th>{money(data.paid_rows.reduce((sum, row) => sum + row.allocated_amount, 0))}</th><th colSpan={2} /></tr>}
        />
      </Card>

      <div className="row">
        <div className="col-lg-6">
          <Card title="Payment Channel Performance">
            <DataTable rows={data?.channel_performance} searchable={false} rowKey={(row) => row.channel} columns={[{ key: "channel", header: "Channel" }, { key: "count", header: "Collections" }, { key: "expected", header: "Expected", render: (row) => money(row.expected) }, { key: "paid", header: "Paid", render: (row) => money(row.paid) }]} />
          </Card>
        </div>
        <div className="col-lg-6">
          <Card title="Branch Mandate Performance">
            <DataTable rows={data?.branch_performance} searchable={false} rowKey={(row) => row.branch} columns={[{ key: "branch", header: "Branch" }, { key: "count", header: "Collections" }, { key: "expected", header: "Expected", render: (row) => money(row.expected) }, { key: "paid", header: "Paid", render: (row) => money(row.paid) }]} />
          </Card>
        </div>
      </div>

      <Card title="Collection Batches">
        <DataTable rows={data?.batches} rowKey={(row) => row.id} emptyMessage="No collection batches in the selected period." columns={[{ key: "reference", header: "Batch" }, { key: "provider", header: "Provider" }, { key: "channel", header: "Channel" }, { key: "source", header: "Source" }, { key: "collection_date", header: "Collection Date" }, { key: "records", header: "Records" }, { key: "expected", header: "Expected", render: (row) => money(row.expected) }, { key: "paid", header: "Paid", render: (row) => money(row.paid) }]} />
      </Card>

      <Card title="Mandates">
        <DataTable
          rows={mandates}
          rowKey={(row) => row.id}
          columns={[
            { key: "customer", header: "Customer" },
            { key: "loan_number", header: "Loan" },
            { key: "branch", header: "Branch" },
            { key: "bank_name", header: "Bank" },
            { key: "mandate_reference", header: "Mandate Reference" },
            { key: "status", header: "Status", render: (row) => row.status.toUpperCase() },
            { key: "cancellation_status", header: "Cancellation", render: (row) => (row.cancellation_status ? `${row.cancellation_status.toUpperCase()}${row.cancellation_reference ? ` · ${row.cancellation_reference}` : ""}` : "—") },
            {
              key: "action",
              header: "Action",
              sortable: false,
              render: (row) => row.cancellation_status === "requested" && can(["payments.verify", "loans.disburse"]) && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void confirmCancellation(row)}>Confirm cancelled</button>,
            },
          ]}
        />
      </Card>

      <Modal open={upload !== null} onClose={() => setUpload(null)} title="Upload bank collection file" submitLabel="Upload" submitting={busy} onSubmit={() => void submitUpload()}>
        {upload && (
          <div className="row">
            <Field label="Service provider:" required className="col-md-6"><input className="form-control" value={upload.provider} onChange={(e) => setUpload({ ...upload, provider: e.target.value })} required /></Field>
            <Field label="Channel:" className="col-md-6"><input className="form-control" value={upload.channel} onChange={(e) => setUpload({ ...upload, channel: e.target.value })} /></Field>
            <Field label="Collection date:" required className="col-md-6"><input type="date" className="form-control" value={upload.collection_date} onChange={(e) => setUpload({ ...upload, collection_date: e.target.value })} required /></Field>
            <Field label="CSV file:" required className="col-md-6"><input type="file" className="form-control" accept=".csv,text/csv" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] ?? null })} required /></Field>
            <small className="col-12 text-muted">Columns: mandate_reference, payment_reference, amount, status (and optionally collection_date, remarks). A payment reference already recorded is skipped, so a file can be uploaded twice safely.</small>
          </div>
        )}
      </Modal>
    </>
  );
}
