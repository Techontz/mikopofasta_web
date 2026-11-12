"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Field } from "@/components/ui/Field";
import { notifyError, notifySuccess } from "@/components/ui/notify";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";

import { ENROLLMENT_LABEL, deviceName, type CustomerDevices, type EsimuDevice } from "./types";

export interface DeviceSelection {
  device_id?: string;
  device_inspected?: boolean;
}

interface Props {
  customerId: string;
  selection: DeviceSelection;
  onSelect: (selection: DeviceSelection) => void;
  /** Saved with a new registration so a Pending Registration can be resumed (the loan application form). */
  application?: Record<string, unknown>;
  /** A device that cannot be chosen (the phone being replaced). */
  excludeDeviceId?: number;
  error?: string;
}

const EMPTY_PHONE = { imei: "", make: "", model: "", serial_number: "" };

/**
 * eSIMU on the loan application form: Continue With Existing Device (after a physical inspection, no new QR) or Register
 * New Device (Linda registration, enrollment QR, then Check enrollment). The form can only be submitted once Linda confirms
 * the phone is enrolled. If Linda cannot be reached the registration and the form are kept as Pending Registration.
 */
export function EsimuDeviceStep({ customerId, selection, onSelect, application, excludeDeviceId, error }: Props) {
  const client = useQueryClient();
  const { data, isLoading } = useApi<CustomerDevices>(`phone-bond/customers/${customerId}/devices`);
  const [mode, setMode] = useState<"existing" | "new" | null>(null);
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [current, setCurrent] = useState<EsimuDevice | null>(null);
  const [busy, setBusy] = useState(false);

  const all = [...(data?.reusable ?? []), ...(data?.pending ?? []), ...(current ? [current] : [])];
  const selected = all.find((device) => String(device.id) === selection.device_id) ?? null;
  const reusable = (data?.reusable ?? []).filter((device) => device.id !== excludeDeviceId);
  const chosenMode = mode ?? (reusable.length > 0 ? "existing" : "new");

  const call = async (run: () => Promise<{ message?: string; data: EsimuDevice }>) => {
    setBusy(true);
    try {
      const result = await run();
      setCurrent(result.data);
      await client.invalidateQueries({ queryKey: [`phone-bond/customers/${customerId}/devices`] });
      if (result.message) {
        notifySuccess(result.message);
      }
      return result.data;
    } catch (failure) {
      notifyError(failure);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const choose = (device: EsimuDevice, inspected: boolean) => onSelect({ device_id: String(device.id), device_inspected: inspected });

  const inspect = async (device: EsimuDevice, condition: "good" | "damaged") => {
    const result = await call(() => api.post(`phone-bond/devices/${device.id}/inspection`, { condition }));
    if (result && condition === "good") {
      choose(result, true);
    } else if (result) {
      setMode("new");
    }
  };

  const register = async () => {
    const draft = application ? Object.fromEntries(Object.entries(application).filter(([key]) => key !== "device_id" && key !== "device_inspected")) : undefined;
    const result = await call(() => api.post("phone-bond/registrations", { customer_id: Number(customerId), ...phone, application: draft }));
    if (result?.enrollment_status === "enrolled") {
      choose(result, false);
    }
  };

  const checkEnrollment = async (device: EsimuDevice) => {
    const result = await call(() => api.post(`phone-bond/devices/${device.id}/enrollment`));
    if (result?.enrollment_status === "enrolled") {
      choose(result, false);
    }
  };

  const retry = (device: EsimuDevice) => call(() => api.post(`phone-bond/devices/${device.id}/register`));

  if (selected && selected.enrollment_status === "enrolled") {
    return (
      <div className="col-12">
        <div className="alert alert-success d-flex justify-content-between align-items-center flex-wrap" style={{ gap: 8 }}>
          <span><i className="icon-screen-smartphone" /> <b>eSIMU collateral:</b> {deviceName(selected)} · <span className="badge badge-success">ENROLLED</span>{selection.device_inspected && " · inspected, good condition"}</span>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onSelect({ device_id: "", device_inspected: false })}>Change device</button>
        </div>
      </div>
    );
  }

  const progress = current && current.enrollment_status !== "enrolled" ? current : null;

  return (
    <div className="col-12">
      <div className="card border mb-3">
        <div className="body">
          <h6 className="mb-2"><i className="icon-screen-smartphone" /> eSIMU device (Linda Device Lock)</h6>
          {error && <div className="alert alert-danger py-1">{error}</div>}
          {isLoading && <p className="mb-0">Loading the customer&apos;s devices...</p>}

          {!isLoading && (
            <>
              <div className="btn-group mb-3" role="group" aria-label="eSIMU device">
                <button type="button" className={`btn btn-sm ${chosenMode === "existing" ? "btn-primary" : "btn-outline-primary"}`} disabled={reusable.length === 0} onClick={() => setMode("existing")}>Continue With Existing Device</button>
                <button type="button" className={`btn btn-sm ${chosenMode === "new" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setMode("new")}>Register New Device</button>
              </div>

              {chosenMode === "existing" && (
                <>
                  <p className="text-muted small mb-2">Inspect the phone physically. A phone in good working condition secures the new loan without a new QR enrollment; a damaged phone cannot be used.</p>
                  {reusable.map((device) => (
                    <div key={device.id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2 flex-wrap" style={{ gap: 8 }}>
                      <span>{deviceName(device)}{device.loan_number && <small className="d-block text-muted">Last loan {device.loan_number} ({device.loan_status})</small>}</span>
                      <span>
                        <button type="button" className="btn btn-sm btn-success mr-1" disabled={busy} onClick={() => void inspect(device, "good")}>Good condition - use it</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => void inspect(device, "damaged")}>Damaged</button>
                      </span>
                    </div>
                  ))}
                  {(data?.unavailable ?? []).filter((device) => device.id !== excludeDeviceId).map((device) => (
                    <div key={device.id} className="text-muted small">{deviceName(device)}: {device.condition !== "good" ? `found ${device.condition}` : `secures loan ${device.loan_number}`}, cannot be used.</div>
                  ))}
                </>
              )}

              {chosenMode === "new" && !progress && (
                <>
                  {(data?.pending ?? []).length > 0 && (
                    <div className="alert alert-warning py-2">
                      <b>Pending registrations:</b>
                      {data?.pending.map((device) => (
                        <div key={device.id} className="d-flex justify-content-between align-items-center mt-1">
                          <span>{deviceName(device)} · {ENROLLMENT_LABEL[device.enrollment_status]}</span>
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setCurrent(device)}>Resume</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="row">
                    <Field label="IMEI:" required className="col-lg-3 col-md-6">
                      <input className="form-control" inputMode="numeric" maxLength={15} placeholder="15 digits" value={phone.imei} onChange={(e) => setPhone({ ...phone, imei: e.target.value.replace(/\D/g, "") })} />
                    </Field>
                    <Field label="Make:" required className="col-lg-3 col-md-6">
                      <input className="form-control" placeholder="e.g. Tecno" value={phone.make} onChange={(e) => setPhone({ ...phone, make: e.target.value })} />
                    </Field>
                    <Field label="Model:" required className="col-lg-3 col-md-6">
                      <input className="form-control" placeholder="e.g. Tecno M3" value={phone.model} onChange={(e) => setPhone({ ...phone, model: e.target.value })} />
                    </Field>
                    <Field label="Serial number:" className="col-lg-3 col-md-6">
                      <input className="form-control" value={phone.serial_number} onChange={(e) => setPhone({ ...phone, serial_number: e.target.value })} />
                    </Field>
                  </div>
                  {phone.imei.length > 0 && phone.imei.length !== 15 && <div className="text-danger small mb-2">The IMEI must be exactly 15 digits.</div>}
                  <button type="button" className="btn btn-sm btn-primary" disabled={busy || phone.imei.length !== 15 || !phone.make.trim() || !phone.model.trim()} onClick={() => void register()}>
                    Register with Linda
                  </button>
                  <small className="text-muted ml-2">The customer&apos;s name, phone and ID come from their profile.</small>
                </>
              )}

              {chosenMode === "new" && progress && (
                <div className="border rounded p-3">
                  <div className="d-flex justify-content-between flex-wrap mb-2" style={{ gap: 8 }}>
                    <b>{deviceName(progress)}</b>
                    <span className={`badge badge-${progress.enrollment_status === "not_registered" ? "danger" : "warning"}`}>{ENROLLMENT_LABEL[progress.enrollment_status].toUpperCase()}</span>
                  </div>
                  {progress.enrollment_status === "not_registered" ? (
                    <>
                      <div className="alert alert-warning py-2">Linda could not register the device{progress.registration_error ? `: ${progress.registration_error}` : "."} The details and this application are saved. Retry when Linda is available.</div>
                      <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={() => void retry(progress)}>Retry registration</button>
                    </>
                  ) : (
                    <div className="row align-items-center">
                      <div className="col-md-5 text-center">
                        {progress.qr_svg ? (
                          // Server-rendered SVG of Linda's enrollment payload (bacon/bacon-qr-code): no user content.
                          <div style={{ maxWidth: 280, margin: "0 auto", background: "#fff", padding: 8 }} dangerouslySetInnerHTML={{ __html: progress.qr_svg }} />
                        ) : <p className="text-muted">Press Check enrollment to load the QR code.</p>}
                      </div>
                      <div className="col-md-7">
                        <ol className="pl-3 small">
                          <li>Factory-reset the customer&apos;s phone.</li>
                          <li>On the welcome screen tap six times, then scan this QR code with the phone.</li>
                          <li>Let the setup finish, then press <b>Check enrollment</b>.</li>
                        </ol>
                        {progress.enrollment_expires_at && <p className="small text-muted">QR valid until {progress.enrollment_expires_at}.</p>}
                        <button type="button" className="btn btn-sm btn-success mr-1" disabled={busy} onClick={() => void checkEnrollment(progress)}>Check enrollment</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setCurrent(null)}>Back</button>
                        <p className="small text-muted mt-2 mb-0">Showing the QR does not enroll the phone: Submit unlocks only after Linda confirms enrollment.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
