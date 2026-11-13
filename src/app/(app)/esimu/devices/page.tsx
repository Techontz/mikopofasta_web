"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessDenied } from "@/components/customers/AccessDenied";
import { EsimuDeviceStep, type DeviceSelection } from "@/components/esimu/EsimuDeviceStep";
import { RepaymentHistoryButton } from "@/components/loans/RepaymentHistory";
import { ENROLLMENT_LABEL, LOCK_BADGE, LOCK_LABEL, deviceName, type DeviceDetail, type EsimuDevice, type LockRequest, type Replacement } from "@/components/esimu/types";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PeriodFilter, monthPeriod } from "@/components/ui/PeriodFilter";
import { notifyError, notifySuccess, promptReason } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useApi } from "@/lib/hooks";

const VIEW_PERMISSIONS = ["phone_bond.manage", "phone_bond.lock", "phone_bond.release", "phone_bond.replace_request", "phone_bond.replace_approve", "loans.view"];

const TABS = [
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "closed", label: "Closed" },
  { value: "pending", label: "Pending Registration" },
  { value: "all", label: "All" },
];

interface Report {
  cards: Record<string, number>;
}

type Dialog =
  | { kind: "release"; device: EsimuDevice; reason: string; confirmed: boolean }
  | { kind: "incident"; device: EsimuDevice; type: string; details: string; occurred_on: string }
  | { kind: "replace"; device: EsimuDevice; selection: DeviceSelection; reason_type: string; reason: string }
  | null;

/**
 * eSIMU → Devices: every smartphone under Linda Device Lock in the employee's branch scope - Active (managed, locked or
 * not), Done (loan settled, still enrolled and reusable), Closed (released), and registrations still pending. Lock state is
 * shown as Linda confirms it; Lock / Unlock Pending while the phone has not confirmed.
 */
export default function EsimuDevicesPage() {
  const { can } = useAuth();
  const client = useQueryClient();
  const deepLink = useSearchParams().get("device");
  const [tab, setTab] = useState("active");
  const [branch, setBranch] = useState(monthPeriod());
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(deepLink ? Number(deepLink) : null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowed = can(VIEW_PERMISSIONS);

  const { data: devices, isLoading } = useApi<EsimuDevice[]>(allowed ? "phone-bond/devices" : null, { status: tab, branch_id: branch.branch_id, search: search || undefined });
  const { data: report } = useApi<Report>(allowed ? "phone-bond/report" : null, { branch_id: branch.branch_id });
  const { data: replacements } = useApi<Replacement[]>(allowed ? "phone-bond/replacements" : null, { status: "pending" });
  const { data: detail } = useApi<DeviceDetail>(openId ? `phone-bond/devices/${openId}` : null);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  if (!allowed) {
    return (
      <>
        <PageHeader crumbs={["eSIMU", "Devices"]} />
        <AccessDenied />
      </>
    );
  }

  const onSearch = (value: string) => {
    setSearchText(value);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setSearch(value.trim()), 350);
  };

  const run = async (call: () => Promise<{ message?: string }>, after?: () => void) => {
    setBusy(true);
    try {
      const result = await call();
      after?.();
      notifySuccess(result.message ?? "Saved");
    } catch (error) {
      notifyError(error);
    } finally {
      await client.invalidateQueries();
      setBusy(false);
    }
  };

  const lock = async (device: EsimuDevice, action: "lock" | "unlock") => {
    const reason = await promptReason(`Reason to ${action} ${deviceName(device)}`);
    if (reason) {
      await run(() => api.post(`phone-bond/devices/${device.id}/${action}`, { reason }));
    }
  };

  const confirmPortal = async (request: LockRequest) => {
    const reference = await promptReason(`Linda portal reference confirming the ${request.action} of ${request.imei}`);
    if (reference) {
      await run(() => api.post(`phone-bond/requests/${request.id}/confirm`, { reference }));
    }
  };

  const decide = async (replacement: Replacement, decision: "approve" | "reject") => {
    const note = decision === "reject" ? await promptReason("Reason for rejecting the replacement") : "";
    if (note !== null) {
      await run(() => api.post(`phone-bond/replacements/${replacement.id}/${decision}`, { note: note || undefined }));
    }
  };

  const submitDialog = () => {
    if (!dialog) {
      return;
    }
    if (dialog.kind === "release") {
      void run(() => api.post(`phone-bond/devices/${dialog.device.id}/release`, { reason: dialog.reason, released_in_linda: dialog.confirmed }), () => setDialog(null));
    } else if (dialog.kind === "incident") {
      void run(() => api.post(`phone-bond/devices/${dialog.device.id}/incidents`, { type: dialog.type, details: dialog.details, occurred_on: dialog.occurred_on || undefined }), () => setDialog(null));
    } else {
      void run(() => api.post(`phone-bond/devices/${dialog.device.id}/replacements`, { new_device_id: Number(dialog.selection.device_id), reason_type: dialog.reason_type, reason: dialog.reason }), () => setDialog(null));
    }
  };

  const k = report?.cards;
  const stat = (label: string, value: number | undefined, tone: string) => (
    <div className="col-lg-2 col-md-4 col-6 mb-2" key={label}>
      <div className={`body dashboard-stat bg-${tone} text-light`} style={{ borderRadius: 4 }}>
        <h4 className="mb-0">{value ?? 0}</h4>
        <span>{label}</span>
      </div>
    </div>
  );

  const actions = (row: EsimuDevice) => {
    const managed = row.status === "active" || row.status === "done";
    const pendingLock = row.lock_state.endsWith("pending");
    return (
      <span className="d-inline-flex flex-wrap" style={{ gap: 4 }}>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpenId(row.id)}>View</button>
        {row.loan_id && <RepaymentHistoryButton loanId={row.loan_id} label={`Repayment history of loan ${row.loan_number}`} />}
        {can("phone_bond.lock") && managed && row.enrollment_status === "enrolled" && (row.lock_state === "locked"
          ? <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => void lock(row, "unlock")}>Unlock</button>
          : <button type="button" className="btn btn-sm btn-danger" disabled={busy || pendingLock} onClick={() => void lock(row, "lock")}>Lock</button>)}
        {can("phone_bond.replace_request") && row.status === "active" && row.loan_id && (
          <button type="button" className="btn btn-sm btn-outline-warning" disabled={busy} onClick={() => setDialog({ kind: "replace", device: row, selection: {}, reason_type: row.condition === "good" ? "damaged" : row.condition, reason: "" })}>Replace</button>
        )}
        {(can("phone_bond.manage") || can("phone_bond.replace_request")) && managed && (
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setDialog({ kind: "incident", device: row, type: "lost", details: "", occurred_on: "" })}>Lost / Stolen</button>
        )}
        {can("phone_bond.release") && managed && (
          <button type="button" className="btn btn-sm btn-outline-dark" disabled={busy} onClick={() => setDialog({ kind: "release", device: row, reason: "", confirmed: false })}>Release</button>
        )}
      </span>
    );
  };

  return (
    <>
      <PageHeader crumbs={["eSIMU", "Devices"]} />

      <div className="row clearfix">
        {stat("Active", k?.active_devices, "info")}
        {stat("Locked", k?.locked_devices, "danger")}
        {stat("Lock / Unlock Pending", k?.pending_commands, "warning")}
        {stat("Done", k?.done_devices, "success")}
        {stat("Closed", k?.closed_devices, "secondary")}
        {stat("Pending Registration", k?.pending_devices, "primary")}
      </div>

      {(replacements?.length ?? 0) > 0 && (
        <Card title="Device Replacement Requests">
          <DataTable
            rows={replacements}
            searchable={false}
            rowKey={(row) => row.id}
            columns={[
              { key: "requested_at", header: "Requested" },
              { key: "customer", header: "Customer" },
              { key: "loan_number", header: "Loan", render: (row) => <Link href={`/loans/${row.loan_id}`}>{row.loan_number}</Link> },
              { key: "old_imei", header: "Current phone (IMEI)" },
              { key: "new_imei", header: "New phone", render: (row) => <>{row.new_imei}<small className="d-block text-muted">{row.new_model}</small></> },
              { key: "reason", header: "Reason", render: (row) => <><b className="text-uppercase">{row.reason_type}</b>: {row.reason}</> },
              { key: "requested_by", header: "By" },
              {
                key: "decision",
                header: "Action",
                sortable: false,
                render: (row) => (can("phone_bond.replace_approve") ? (
                  <span className="text-nowrap">
                    <button type="button" className="btn btn-sm btn-success mr-1" disabled={busy} onClick={() => void decide(row, "approve")}>Approve</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => void decide(row, "reject")}>Reject</button>
                  </span>
                ) : <span className="badge badge-warning">AWAITING APPROVAL</span>),
              },
            ]}
          />
        </Card>
      )}

      <Card title="Device Management">
        <ul className="nav nav-tabs mb-3">
          {TABS.map((item) => (
            <li className="nav-item" key={item.value}>
              <button type="button" className={`nav-link btn btn-link ${tab === item.value ? "active" : ""}`} onClick={() => setTab(item.value)}>{item.label}</button>
            </li>
          ))}
        </ul>
        <div className="d-flex flex-wrap align-items-start" style={{ gap: 8 }}>
          <div style={{ flex: "1 1 260px" }}>
            <input type="search" className="form-control" placeholder="Search customer name, phone, IMEI or loan ID…" value={searchText} onChange={(event) => onSearch(event.target.value)} aria-label="Search devices" />
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <PeriodFilter value={branch} onChange={setBranch} branchOnly idPrefix="esimu-devices" />
          </div>
        </div>
        <DataTable
          rows={devices}
          loading={isLoading}
          searchable={false}
          rowKey={(row) => row.id}
          emptyMessage="No devices in this list."
          columns={[
            { key: "customer", header: "Customer", render: (row) => <>{row.customer}<small className="d-block text-muted">{row.customer_phone}</small></> },
            { key: "imei", header: "IMEI", render: (row) => <>{row.imei}<small className="d-block text-muted">{[row.make, row.model].filter(Boolean).join(" ")}</small></> },
            { key: "branch", header: "Branch" },
            { key: "loan_number", header: "Loan", render: (row) => (row.loan_id ? <><Link href={`/loans/${row.loan_id}`}>{row.loan_number}</Link><small className="d-block text-muted">{row.loan_status}</small></> : "-") },
            { key: "enrollment_status", header: "Enrollment", render: (row) => <span className={`badge badge-${row.enrollment_status === "enrolled" ? "success" : row.enrollment_status === "pending" ? "warning" : "danger"}`}>{ENROLLMENT_LABEL[row.enrollment_status].toUpperCase()}</span> },
            { key: "sim_protection", header: "SIM Protection", render: (row) => (row.sim_protection === null ? "-" : row.sim_protection ? "On" : "Off") },
            { key: "last_seen_at", header: "Last Seen", render: (row) => row.last_seen_at ?? "-" },
            { key: "lock_state", header: "Lock Status", render: (row) => (row.status === "closed" || row.enrollment_status !== "enrolled" ? "-" : <span className={`badge badge-${LOCK_BADGE[row.lock_state]}`}>{LOCK_LABEL[row.lock_state].toUpperCase()}</span>) },
            { key: "status", header: "Device Status", render: (row) => <>{row.status.toUpperCase()}{row.condition !== "good" && <small className="d-block text-danger text-uppercase">{row.condition}</small>}{row.linda_status && <small className="d-block text-muted">Linda: {row.linda_status}</small>}</> },
            { key: "action", header: "Action", sortable: false, className: "text-nowrap", render: actions },
          ]}
        />
      </Card>

      <Modal open={openId !== null} onClose={() => setOpenId(null)} title={detail ? deviceName(detail) : "Device"} size="xl">
        {!detail ? <p>Loading...</p> : (
          <>
            <div className="row">
              {[
                ["Customer", detail.customer], ["Branch", detail.branch], ["IMEI", detail.imei], ["Make / Model", [detail.make, detail.model].filter(Boolean).join(" ")],
                ["Serial number", detail.serial_number], ["Linda device ID", detail.linda_device_id], ["Linda status", detail.linda_status],
                ["Enrollment", `${ENROLLMENT_LABEL[detail.enrollment_status]}${detail.enrolled_at ? ` (${detail.enrolled_at})` : ""}`],
                ["Lock status", LOCK_LABEL[detail.lock_state]], ["Device status", `${detail.status.toUpperCase()} · ${detail.condition}`], ["Last seen", detail.last_seen_at],
                ["Released", detail.closed_at ? `${detail.closed_at}: ${detail.closed_reason}` : null],
              ].map(([label, value]) => (
                <div className="col-md-3 col-6 mb-2" key={label}><small className="text-muted d-block">{label}</small>{value || "-"}</div>
              ))}
            </div>
            {detail.status === "pending" && <p className="text-warning">Registration pending: resume it from the customer&apos;s loan application.</p>}

            <h6 className="mt-3">Loans secured</h6>
            <DataTable rows={detail.loans} searchable={false} rowKey={(row) => `${row.loan_id}-${row.linked_at}`} columns={[
              { key: "loan_number", header: "Loan", render: (row) => <Link href={`/loans/${row.loan_id}`}>{row.loan_number}</Link> },
              { key: "loan_status", header: "Status" },
              { key: "disbursed_amount", header: "Disbursed", render: (row) => (row.disbursed_amount === null ? "-" : `TZS ${money(row.disbursed_amount)}`) },
              { key: "linked_by_reason", header: "Linked by", render: (row) => row.linked_by_reason.replace("_", " ") },
              { key: "linked_at", header: "From" },
              { key: "unlinked_at", header: "Until", render: (row) => (row.unlinked_at ? <>{row.unlinked_at}<small className="d-block text-muted">{row.unlinked_reason}</small></> : "Current") },
            ]} />

            <h6 className="mt-3">Lock / Unlock history</h6>
            <DataTable rows={detail.history} searchable={false} rowKey={(row) => row.id} emptyMessage="No lock or unlock yet." columns={[
              { key: "requested_at", header: "Date" },
              { key: "action", header: "Action", render: (row) => row.action.replace("_", " ").toUpperCase() },
              { key: "trigger", header: "Trigger" },
              { key: "reason", header: "Reason" },
              { key: "requested_by", header: "By" },
              { key: "status", header: "Result", render: (row) => <>{row.status.toUpperCase()}{row.command_status && <small className="d-block">Linda: {row.command_status}</small>}{row.provider_message && <small className="d-block text-muted">{row.provider_message}</small>}</> },
              { key: "confirm", header: "", sortable: false, render: (row) => row.status !== "confirmed" && can("phone_bond.lock") && <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => void confirmPortal(row)}>Record Linda portal confirmation</button> },
            ]} />

            {detail.replacements.length > 0 && (
              <>
                <h6 className="mt-3">Replacement history</h6>
                <DataTable rows={detail.replacements} searchable={false} rowKey={(row) => row.id} columns={[
                  { key: "requested_at", header: "Requested" },
                  { key: "old_imei", header: "Old IMEI" },
                  { key: "new_imei", header: "New IMEI" },
                  { key: "reason", header: "Reason", render: (row) => `${row.reason_type}: ${row.reason}` },
                  { key: "status", header: "Status", render: (row) => <>{row.status.toUpperCase()}{row.decided_by && <small className="d-block text-muted">{row.decided_by} · {row.decided_at}</small>}</> },
                ]} />
              </>
            )}

            {detail.incidents.length > 0 && (
              <>
                <h6 className="mt-3">Lost / stolen / damaged reports</h6>
                <DataTable rows={detail.incidents} searchable={false} rowKey={(row) => row.id} columns={[
                  { key: "reported_at", header: "Reported" },
                  { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
                  { key: "occurred_on", header: "Occurred" },
                  { key: "details", header: "Details" },
                  { key: "reported_by", header: "By" },
                ]} />
              </>
            )}

            <h6 className="mt-3">Audit log</h6>
            <DataTable rows={detail.audit} rowKey={(row, index) => index} columns={[
              { key: "at", header: "Date" },
              { key: "action", header: "Action", render: (row) => row.action.replace("PhoneBond.", "").replace(/_/g, " ") },
              { key: "by", header: "By" },
              { key: "details", header: "Details", sortable: false, value: (row) => JSON.stringify(row.details ?? {}), render: (row) => Object.entries(row.details ?? {}).filter(([, value]) => value !== null && value !== "").map(([key, value]) => <div key={key}><small><b>{key.replace(/_/g, " ")}:</b> {String(value)}</small></div>) },
            ]} />
          </>
        )}
      </Modal>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        size={dialog?.kind === "replace" ? "xl" : undefined}
        title={dialog?.kind === "release" ? "Release device" : dialog?.kind === "incident" ? "Report lost / stolen / damaged" : "Device replacement"}
        submitLabel={dialog?.kind === "release" ? "Release" : dialog?.kind === "incident" ? "Record" : "Submit for approval"}
        submitting={busy}
        onSubmit={submitDialog}
      >
        {dialog?.kind === "release" && (
          <>
            <p>{deviceName(dialog.device)} - {dialog.device.customer}</p>
            <div className="alert alert-info py-2">Linda&apos;s API cannot release a phone: release it in the Linda portal first, then record it here. The device becomes Closed and its history is kept. It is refused while a loan still uses the phone.</div>
            <Field label="Reason:" required><textarea className="form-control" value={dialog.reason} onChange={(e) => setDialog({ ...dialog, reason: e.target.value })} required placeholder="Customer no longer wants eSIMU / device damaged" /></Field>
            <label className="d-flex align-items-center" style={{ gap: 6 }}><input type="checkbox" checked={dialog.confirmed} onChange={(e) => setDialog({ ...dialog, confirmed: e.target.checked })} /> The device was released in the Linda portal</label>
          </>
        )}
        {dialog?.kind === "incident" && (
          <div className="row">
            <p className="col-12">{deviceName(dialog.device)} - {dialog.device.customer}. The loan and its outstanding debt stay unchanged.</p>
            <Field label="Type:" required className="col-md-6">
              <select className="form-control" value={dialog.type} onChange={(e) => setDialog({ ...dialog, type: e.target.value })}>
                <option value="lost">Lost</option>
                <option value="stolen">Stolen</option>
                <option value="damaged">Damaged</option>
              </select>
            </Field>
            <Field label="Date it happened:" className="col-md-6"><input type="date" className="form-control" value={dialog.occurred_on} onChange={(e) => setDialog({ ...dialog, occurred_on: e.target.value })} /></Field>
            <Field label="Details:" required className="col-12"><textarea className="form-control" value={dialog.details} onChange={(e) => setDialog({ ...dialog, details: e.target.value })} required /></Field>
          </div>
        )}
        {dialog?.kind === "replace" && (
          <div className="row">
            <p className="col-12">Replacing <b>{deviceName(dialog.device)}</b> on loan <b>{dialog.device.loan_number}</b> ({dialog.device.customer}). Nothing changes until a Credit Officer, Admin or Super Admin approves; the loan balance and schedule are never changed.</p>
            <Field label="Reason type:" required className="col-md-4">
              <select className="form-control" value={dialog.reason_type} onChange={(e) => setDialog({ ...dialog, reason_type: e.target.value })}>
                <option value="lost">Lost</option>
                <option value="stolen">Stolen</option>
                <option value="damaged">Damaged</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Reason:" required className="col-md-8"><input className="form-control" value={dialog.reason} onChange={(e) => setDialog({ ...dialog, reason: e.target.value })} required /></Field>
            <EsimuDeviceStep customerId={String(dialog.device.customer_id)} selection={dialog.selection} onSelect={(selection) => setDialog({ ...dialog, selection })} excludeDeviceId={dialog.device.id} />
            {!dialog.selection.device_id && <p className="col-12 text-warning small">Register the new phone and confirm its enrollment before submitting.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
