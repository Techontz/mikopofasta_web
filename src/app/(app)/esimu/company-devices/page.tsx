"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { ENROLLMENT_LABEL, LOCK_BADGE, LOCK_LABEL, type EnrollmentStatus, type LockRequest, type LockState } from "@/components/esimu/types";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, monthPeriod } from "@/components/ui/PeriodFilter";
import { SelectBox } from "@/components/ui/SelectBox";
import { notifyError, notifySuccess, promptReason } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";

interface CompanyDevice {
  id: number;
  imei: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  department: string | null;
  branch_id: number;
  branch: string | null;
  registered_at: string | null;
  registered_by: string | null;
  linda_device_id: string | null;
  linda_status: string | null;
  enrollment_status: EnrollmentStatus;
  enrolled_at: string | null;
  registration_error: string | null;
  last_seen_at: string | null;
  lock_state: LockState;
  status: "pending" | "active" | "done" | "closed";
  condition: string;
  qr_svg?: string | null;
  enrollment_expires_at?: string | null;
}

interface CompanyDeviceDetail extends CompanyDevice {
  history: LockRequest[];
  incidents: { id: number; type: string; details: string; occurred_on: string | null; reported_by: string | null; reported_at: string | null }[];
  audit: { action: string; by: string; at: string | null; details: Record<string, unknown> | null }[];
}

const EMPTY = { imei: "", make: "", model: "", serial_number: "", department: "", branch_id: "" };

const TABS = [
  { value: "active", label: "Registered" },
  { value: "pending", label: "Pending Enrollment" },
  { value: "all", label: "All" },
];

/**
 * eSIMU → Company Devices: company-owned smartphones under Linda Device Lock (no customer, no loan). Registered with
 * register_company_device; locked / unlocked with manage_company_device_lock_unlock. Lock state changes only on the
 * phone's confirmation through Linda.
 */
export default function CompanyDevicesPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const deepLink = useSearchParams().get("device");
  const canRegister = can("register_company_device");
  const canLock = can("manage_company_device_lock_unlock");
  const allowed = canRegister || canLock;
  const [tab, setTab] = useState("active");
  const [branch, setBranch] = useState(monthPeriod());
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [current, setCurrent] = useState<CompanyDevice | null>(null);
  const [openId, setOpenId] = useState<number | null>(deepLink ? Number(deepLink) : null);
  const [incident, setIncident] = useState<{ device: CompanyDevice; type: string; details: string; occurred_on: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: devices, isLoading } = useApi<CompanyDevice[]>(allowed ? "company-devices" : null, { status: tab, branch_id: branch.branch_id, search: search.trim() || undefined });
  const { data: detail } = useApi<CompanyDeviceDetail>(openId ? `company-devices/${openId}` : null);

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["eSIMU", "Company Devices"]} />
        <AccessDenied />
      </>
    );
  }

  const run = async <T,>(call: () => Promise<{ message?: string; data?: T }>, after?: (data: T | undefined) => void) => {
    setBusy(true);
    try {
      const result = await call();
      after?.(result.data);
      notifySuccess(result.message ?? "Saved");
    } catch (error) {
      notifyError(error);
    } finally {
      await client.invalidateQueries();
      setBusy(false);
    }
  };

  const lock = async (device: CompanyDevice, action: "lock" | "unlock") => {
    const reason = await promptReason(`Reason to ${action} IMEI ${device.imei}`);
    if (reason) {
      await run(() => api.post(`company-devices/${device.id}/${action}`, { reason }));
    }
  };

  const register = () => form && void run<CompanyDevice>(
    () => api.post("company-devices", { ...form, branch_id: Number(form.branch_id) }),
    (device) => { if (device) { setCurrent(device); setForm(null); } },
  );

  const checkEnrollment = (device: CompanyDevice) => void run<CompanyDevice>(() => api.post(`company-devices/${device.id}/enrollment`), (fresh) => setCurrent(fresh && fresh.enrollment_status !== "enrolled" ? fresh : null));
  const retry = (device: CompanyDevice) => void run<CompanyDevice>(() => api.post(`company-devices/${device.id}/register`), (fresh) => setCurrent(fresh ?? null));

  const lockBadge = (row: CompanyDevice) => (row.enrollment_status !== "enrolled" || row.status === "closed"
    ? "-"
    : <span className={`badge badge-${LOCK_BADGE[row.lock_state]}`}>{LOCK_LABEL[row.lock_state].toUpperCase()}</span>);

  return (
    <>
      <PageHeader crumbs={["eSIMU", "Company Devices"]} />

      <Card
        title="Company Devices"
        actions={canRegister && <button type="button" className="btn btn-sm btn-primary" onClick={() => setForm({ ...EMPTY, branch_id: branch.branch_id !== "all" ? branch.branch_id : "" })}><i className="icon-plus" /> Register Company Device</button>}
      >
        <ul className="nav nav-tabs mb-3">
          {TABS.map((item) => (
            <li className="nav-item" key={item.value}>
              <button type="button" className={`nav-link btn btn-link ${tab === item.value ? "active" : ""}`} onClick={() => setTab(item.value)}>{item.label}</button>
            </li>
          ))}
        </ul>
        <div className="d-flex flex-wrap align-items-start" style={{ gap: 8 }}>
          <div style={{ flex: "1 1 260px" }}>
            <input type="search" className="form-control" placeholder="Search IMEI, department, model or serial…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search company devices" />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <PeriodFilter value={branch} onChange={setBranch} branchOnly idPrefix="company-devices" />
          </div>
        </div>
        <DataTable
          rows={devices}
          loading={isLoading}
          searchable={false}
          rowKey={(row) => row.id}
          emptyMessage="No company devices in this list."
          columns={[
            { key: "imei", header: "IMEI", render: (row) => <>{row.imei}<small className="d-block text-muted">{[row.make, row.model].filter(Boolean).join(" ")}{row.department ? ` · ${row.department}` : ""}</small></> },
            { key: "branch", header: "Branch" },
            { key: "enrollment_status", header: "Enrollment", render: (row) => <span className={`badge badge-${row.enrollment_status === "enrolled" ? "success" : row.enrollment_status === "pending" ? "warning" : "danger"}`}>{ENROLLMENT_LABEL[row.enrollment_status].toUpperCase()}</span> },
            { key: "last_seen_at", header: "Last Seen", render: (row) => row.last_seen_at ?? "-" },
            { key: "lock_state", header: "Lock Status", render: lockBadge },
            { key: "status", header: "Device Status", render: (row) => <>{row.linda_status ?? row.status.toUpperCase()}{row.condition !== "good" && <small className="d-block text-danger text-uppercase">{row.condition}</small>}</> },
            {
              key: "action",
              header: "Action",
              sortable: false,
              className: "text-nowrap",
              render: (row) => (
                <span className="d-inline-flex flex-wrap" style={{ gap: 4 }}>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpenId(row.id)}><i className="icon-eye" /> View</button>
                  {row.enrollment_status !== "enrolled" && canRegister && <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => setCurrent(row)}>Continue enrollment</button>}
                  {canLock && row.enrollment_status === "enrolled" && row.status !== "closed" && (row.lock_state === "locked"
                    ? <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => void lock(row, "unlock")}>Unlock</button>
                    : <button type="button" className="btn btn-sm btn-danger" disabled={busy || row.lock_state.endsWith("pending")} onClick={() => void lock(row, "lock")}>Lock</button>)}
                  {row.status !== "closed" && <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setIncident({ device: row, type: "lost", details: "", occurred_on: "" })}>Lost / Stolen</button>}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={form !== null} onClose={() => setForm(null)} title="Register Company Device" submitLabel="Register with Linda" submitting={busy} onSubmit={register}>
        {form && (
          <div className="row">
            <Field label="IMEI:" required className="col-md-6">
              <input className="form-control" inputMode="numeric" maxLength={15} placeholder="15 digits" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value.replace(/\D/g, "") })} required />
              {form.imei.length > 0 && form.imei.length !== 15 && <small className="text-danger">The IMEI must be exactly 15 digits.</small>}
            </Field>
            <Field label="Make:" required className="col-md-6"><input className="form-control" placeholder="e.g. Samsung" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} required /></Field>
            <Field label="Model:" required className="col-md-6"><input className="form-control" placeholder="e.g. Galaxy A15" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></Field>
            <Field label="Serial Number:" className="col-md-6"><input className="form-control" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></Field>
            <Field label="Department:" required className="col-md-6"><input className="form-control" placeholder="e.g. Finance" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required /></Field>
            <Field label="Branch Name:" required className="col-md-6">
              <SelectBox inputId="company-device-branch" placeholder="Select branch" optionsUrl="options/branches" value={form.branch_id} onChange={(value) => setForm({ ...form, branch_id: value ?? "" })} />
            </Field>
            <p className="col-12 small text-muted mb-0">The registration date is set by the system. Linda returns the device ID and the enrollment QR code.</p>
          </div>
        )}
      </Modal>

      <Modal open={current !== null} onClose={() => setCurrent(null)} title={current ? `Enroll IMEI ${current.imei}` : "Enrollment"}>
        {current && (current.enrollment_status === "not_registered" ? (
          <>
            <div className="alert alert-warning">Linda could not register the device{current.registration_error ? `: ${current.registration_error}` : "."} The details are saved; retry when Linda is available.</div>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => retry(current)}>Retry registration</button>
          </>
        ) : (
          <div className="row align-items-center">
            <div className="col-md-6 text-center">
              {current.qr_svg
                // Server-rendered SVG of Linda's enrollment payload: no user content.
                ? <div style={{ maxWidth: 280, margin: "0 auto", background: "#fff", padding: 8 }} dangerouslySetInnerHTML={{ __html: current.qr_svg }} />
                : <p className="text-muted">Press Check enrollment to load the QR code.</p>}
            </div>
            <div className="col-md-6">
              <ol className="pl-3 small">
                <li>Factory-reset the company phone.</li>
                <li>On the welcome screen tap six times and scan this QR code.</li>
                <li>When setup finishes, press <b>Check enrollment</b>.</li>
              </ol>
              {current.enrollment_expires_at && <p className="small text-muted">QR valid until {current.enrollment_expires_at}.</p>}
              <button type="button" className="btn btn-success" disabled={busy} onClick={() => checkEnrollment(current)}>Check enrollment</button>
              <p className="small text-muted mt-2 mb-0">The device is registered only once Linda confirms the enrollment.</p>
            </div>
          </div>
        ))}
      </Modal>

      <Modal open={incident !== null} onClose={() => setIncident(null)} title="Report Lost / Stolen" submitLabel="Record" submitting={busy}
        onSubmit={() => incident && void run(() => api.post(`company-devices/${incident.device.id}/incidents`, { type: incident.type, details: incident.details, occurred_on: incident.occurred_on || undefined }), () => setIncident(null))}>
        {incident && (
          <div className="row">
            <p className="col-12">IMEI {incident.device.imei}{incident.device.department ? ` · ${incident.device.department}` : ""}. The device and its history are kept; lock it if needed.</p>
            <Field label="Type:" required className="col-md-6">
              <select className="form-control" value={incident.type} onChange={(e) => setIncident({ ...incident, type: e.target.value })}>
                <option value="lost">Lost</option>
                <option value="stolen">Stolen</option>
              </select>
            </Field>
            <Field label="Date it happened:" className="col-md-6"><input type="date" className="form-control" value={incident.occurred_on} onChange={(e) => setIncident({ ...incident, occurred_on: e.target.value })} /></Field>
            <Field label="Description:" required className="col-12"><textarea className="form-control" value={incident.details} onChange={(e) => setIncident({ ...incident, details: e.target.value })} required /></Field>
          </div>
        )}
      </Modal>

      <Modal open={openId !== null} onClose={() => setOpenId(null)} size="xl" title={detail ? `Company Device · IMEI ${detail.imei}` : "Company Device"}>
        {!detail ? <p>Loading...</p> : (
          <>
            <div className="row">
              {[
                ["IMEI", detail.imei], ["Make", detail.make], ["Model", detail.model], ["Serial Number", detail.serial_number],
                ["Department", detail.department], ["Branch", detail.branch], ["Registration Date", detail.registered_at], ["Registered by", detail.registered_by],
                ["Linda Device ID", detail.linda_device_id], ["Enrollment Status", `${ENROLLMENT_LABEL[detail.enrollment_status]}${detail.enrolled_at ? ` (${detail.enrolled_at})` : ""}`],
                ["Last Seen", detail.last_seen_at], ["Lock Status", LOCK_LABEL[detail.lock_state]], ["Device Status", `${detail.linda_status ?? detail.status.toUpperCase()}${detail.condition !== "good" ? ` · ${detail.condition}` : ""}`],
              ].map(([label, value]) => (
                <div className="col-md-3 col-6 mb-2" key={label}><small className="text-muted d-block">{label}</small>{value || "-"}</div>
              ))}
            </div>

            <h6 className="mt-3">Lock / Unlock commands</h6>
            <DataTable rows={detail.history} searchable={false} rowKey={(row) => row.id} emptyMessage="No lock or unlock yet." columns={[
              { key: "requested_at", header: "Date" },
              { key: "action", header: "Action", render: (row) => row.action.toUpperCase() },
              { key: "reason", header: "Reason" },
              { key: "requested_by", header: "By" },
              { key: "status", header: "Result", render: (row) => <>{row.status === "pending" ? `${row.action.toUpperCase()} PENDING` : row.status === "failed" ? "COMMAND FAILED" : "CONFIRMED"}{row.command_id && <small className="d-block text-muted">Ref {row.command_id}</small>}{row.provider_message && <small className="d-block text-muted">{row.provider_message}</small>}</> },
            ]} />

            {detail.incidents.length > 0 && (
              <>
                <h6 className="mt-3">Lost / Stolen reports</h6>
                <DataTable rows={detail.incidents} searchable={false} rowKey={(row) => row.id} columns={[
                  { key: "reported_at", header: "Reported" },
                  { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
                  { key: "occurred_on", header: "Occurred" },
                  { key: "details", header: "Description" },
                  { key: "reported_by", header: "By" },
                ]} />
              </>
            )}

            <h6 className="mt-3">Device Audit</h6>
            <DataTable rows={detail.audit} rowKey={(row, index) => index} columns={[
              { key: "at", header: "Date & Time" },
              { key: "action", header: "Action", render: (row) => row.action.replace("PhoneBond.", "").replace(/_/g, " ") },
              { key: "by", header: "User" },
              { key: "details", header: "Details", sortable: false, value: (row) => JSON.stringify(row.details ?? {}), render: (row) => Object.entries(row.details ?? {}).filter(([, value]) => value !== null && value !== "").map(([key, value]) => <div key={key}><small><b>{key.replace(/_/g, " ")}:</b> {String(value)}</small></div>) },
            ]} />
          </>
        )}
      </Modal>
    </>
  );
}
