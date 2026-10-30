"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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

interface Device {
  id: number;
  imei: string;
  brand: string | null;
  model: string | null;
  customer: string | null;
  branch: string | null;
  loan_id: number | null;
  loan_number: string | null;
  loan_status: string | null;
  enrollment_status: string;
  sim_protection: boolean | null;
  last_seen_at: string | null;
  status: "active" | "done" | "closed";
  lock_state: string;
}

interface LockRequest {
  id: number;
  imei: string | null;
  customer: string | null;
  action: string;
  trigger: string;
  reason: string;
  status: string;
  provider_reference: string | null;
  provider_message: string | null;
  requested_by: string | null;
  requested_at: string | null;
  confirmed_at: string | null;
}

interface Report {
  cards: Record<string, number>;
  history: LockRequest[];
}

const TABS = [
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All Devices" },
];

const EMPTY = { loan_id: "", imei: "", serial_number: "", brand: "", model: "", phone_number: "", linda_device_id: "" };

/**
 * Phone Bond — Linda (enhancement §5): devices, lock / unlock (only shown as done once Linda confirms), history, reports.
 */
export default function PhoneBondPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const [tab, setTab] = useState("active");
  const [filter, setFilter] = useState(monthPeriod());
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: devices, isLoading } = useApi<Device[]>("phone-bond/devices", { status: tab, branch_id: filter.branch_id });
  const { data: report } = useApi<Report>("phone-bond/report", periodQuery(filter));
  const k = report?.cards;

  const run = async (call: () => Promise<{ message?: string }>) => {
    setBusy(true);
    try {
      const result = await call();
      await client.invalidateQueries();
      notifySuccess(result.message ?? "Saved");
    } catch (error) {
      await client.invalidateQueries();
      notifyError(error);
    } finally {
      setBusy(false);
    }
  };

  const lock = async (device: Device, action: "lock" | "unlock") => {
    const reason = await promptReason(`Reason to ${action} ${device.imei}`);
    if (reason) {
      await run(() => api.post(`phone-bond/devices/${device.id}/${action}`, { reason }));
    }
  };

  const confirm = async (request: LockRequest) => {
    const reference = await promptReason(`Linda reference confirming the ${request.action} of ${request.imei}`);
    if (reference) {
      await run(() => api.post(`phone-bond/requests/${request.id}/confirm`, { reference }));
    }
  };

  const close = async (device: Device) => {
    const reason = await promptReason(`Why is ${device.imei} removed from Linda's service?`);
    if (reason) {
      await run(() => api.post(`phone-bond/devices/${device.id}/close`, { reason }));
    }
  };

  const card = (label: string, value: string) => (
    <div className="col-lg-3 col-md-4 col-6 mb-2" key={label}>
      <div className="card mb-0"><div className="body"><small className="text-muted">{label}</small><h5 className="mb-0">{value}</h5></div></div>
    </div>
  );

  return (
    <>
      <PageHeader crumbs={["Loan", "Phone Bond"]} printDetails={<span>Period: <b>{periodLabel(filter)}</b></span>} />
      <Card title="Phone Bond — Linda" actions={can("phone_bond.manage") && <button type="button" className="btn btn-sm btn-primary" onClick={() => setForm(EMPTY)}><i className="icon-plus" /> Register device</button>}>
        <PeriodFilter value={filter} onChange={setFilter} idPrefix="phone-bond" />
        <div className="row">
          {k && [
            card("Total Devices", String(k.total_devices)),
            card("Active Devices", String(k.active_devices)),
            card("Done Devices", String(k.done_devices)),
            card("Closed Devices", String(k.closed_devices)),
            card("Locked Devices", String(k.locked_devices)),
            card("Unlocked Devices", String(k.unlocked_devices)),
            card(`Expected Collection (${periodLabel(filter)})`, `TZS ${money(k.expected_collection)}`),
            card(`Paid (${periodLabel(filter)})`, `TZS ${money(k.paid)}`),
            card("Outstanding Phone-Bond Loans", `${k.outstanding_loans} · TZS ${money(k.outstanding_amount)}`),
          ]}
        </div>
      </Card>

      <Card title="Devices">
        <ul className="nav nav-tabs mb-3">
          {TABS.map((item) => (
            <li className="nav-item" key={item.value}>
              <button type="button" className={`nav-link btn btn-link ${tab === item.value ? "active" : ""}`} onClick={() => setTab(item.value)}>{item.label}</button>
            </li>
          ))}
        </ul>
        <DataTable
          rows={devices}
          loading={isLoading}
          rowKey={(row) => row.id}
          emptyMessage="No devices in this list."
          columns={[
            { key: "customer", header: "Customer" },
            { key: "imei", header: "IMEI", render: (row) => <>{row.imei}<small className="d-block text-muted">{[row.brand, row.model].filter(Boolean).join(" ")}</small></> },
            { key: "branch", header: "Branch" },
            { key: "loan_number", header: "Loan", render: (row) => (row.loan_id ? <Link href={`/loans/${row.loan_id}`}>{row.loan_number}</Link> : "—") },
            { key: "enrollment_status", header: "Enrollment", render: (row) => row.enrollment_status.toUpperCase() },
            { key: "sim_protection", header: "SIM Protection", render: (row) => (row.sim_protection === null ? "—" : row.sim_protection ? "On" : "Off") },
            { key: "last_seen_at", header: "Last Seen", render: (row) => row.last_seen_at ?? "—" },
            { key: "lock_state", header: "Lock", render: (row) => <span className={`badge badge-${row.lock_state === "locked" ? "danger" : row.lock_state.endsWith("pending") ? "warning" : "success"}`}>{row.lock_state.replace("_", " ").toUpperCase()}</span> },
            { key: "status", header: "Status", render: (row) => row.status.toUpperCase() },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => (
                <>
                  {row.loan_id && <Link href={`/loans/${row.loan_id}`} className="btn btn-sm btn-outline-primary mr-1">View Loan</Link>}
                  {can("phone_bond.lock") && row.status !== "closed" && (row.lock_state === "locked"
                    ? <button type="button" className="btn btn-sm btn-success mr-1" disabled={busy} onClick={() => void lock(row, "unlock")}>Unlock</button>
                    : <button type="button" className="btn btn-sm btn-danger mr-1" disabled={busy || row.lock_state.endsWith("pending")} onClick={() => void lock(row, "lock")}>Lock</button>)}
                  {can("phone_bond.manage") && row.status === "done" && <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => void close(row)}>Close</button>}
                </>
              ),
            },
          ]}
        />
      </Card>

      <Card title={`Lock / Unlock History — ${periodLabel(filter)}`}>
        <DataTable
          rows={report?.history}
          rowKey={(row) => row.id}
          emptyMessage="No lock or unlock requests in the selected period."
          columns={[
            { key: "requested_at", header: "Date" },
            { key: "customer", header: "Customer" },
            { key: "imei", header: "IMEI" },
            { key: "action", header: "Action", render: (row) => row.action.replace("_", " ").toUpperCase() },
            { key: "trigger", header: "Trigger" },
            { key: "reason", header: "Reason" },
            { key: "requested_by", header: "By" },
            { key: "status", header: "Linda", render: (row) => <>{row.status.toUpperCase()}{row.provider_reference && <small className="d-block">{row.provider_reference}</small>}{row.provider_message && <small className="d-block text-muted">{row.provider_message}</small>}</> },
            { key: "action_confirm", header: "Action", sortable: false, render: (row) => row.status !== "confirmed" && can("phone_bond.lock") && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => void confirm(row)}>Record Linda confirmation</button> },
          ]}
        />
      </Card>

      <Modal open={form !== null} onClose={() => setForm(null)} title="Register Phone Bond device" submitLabel="Register" submitting={busy} onSubmit={() => form && void run(async () => { const result = await api.post<{ message: string }>("phone-bond/devices", { ...form, loan_id: Number(form.loan_id) }); setForm(null); return result; })}>
        {form && (
          <div className="row">
            <Field label="Loan ID (number):" required className="col-md-6"><input className="form-control" value={form.loan_id} onChange={(e) => setForm({ ...form, loan_id: e.target.value })} required /></Field>
            <Field label="IMEI:" required className="col-md-6"><input className="form-control" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} required /></Field>
            <Field label="Brand:" className="col-md-6"><input className="form-control" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
            <Field label="Model:" className="col-md-6"><input className="form-control" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
            <Field label="Serial number:" className="col-md-6"><input className="form-control" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></Field>
            <Field label="Phone number:" className="col-md-6"><input className="form-control" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} /></Field>
            <Field label="Linda device ID (once enrolled):" className="col-md-12"><input className="form-control" value={form.linda_device_id} onChange={(e) => setForm({ ...form, linda_device_id: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
