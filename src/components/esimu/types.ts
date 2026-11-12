/** eSIMU (loan method "phone_bond"): a smartphone enrolled with Linda Device Lock secures the loan. */

export type DeviceStatus = "pending" | "active" | "done" | "closed";
export type EnrollmentStatus = "not_registered" | "pending" | "enrolled";
export type LockState = "locked" | "unlocked" | "lock_pending" | "unlock_pending";

export interface EsimuDevice {
  id: number;
  imei: string;
  serial_number: string | null;
  make: string | null;
  model: string | null;
  customer_id: number;
  customer: string | null;
  customer_phone: string | null;
  branch_id: number;
  branch: string | null;
  loan_id: number | null;
  loan_number: string | null;
  loan_status: string | null;
  linda_device_id: string | null;
  linda_status: string | null;
  enrollment_status: EnrollmentStatus;
  enrolled_at: string | null;
  registration_error: string | null;
  sim_protection: boolean | null;
  last_seen_at: string | null;
  status: DeviceStatus;
  condition: "good" | "damaged" | "lost" | "stolen";
  inspected_at: string | null;
  lock_state: LockState;
  closed_reason: string | null;
  closed_at: string | null;
  registered_at: string | null;
  /** Only on registration / enrollment answers. */
  qr_svg?: string | null;
  enrollment_expires_at?: string | null;
  application?: Record<string, unknown> | null;
}

export interface LockRequest {
  id: number;
  device_id: number;
  imei: string | null;
  customer: string | null;
  action: string;
  trigger: string;
  reason: string;
  status: "pending" | "confirmed" | "failed";
  command_id: string | null;
  command_status: string | null;
  provider_reference: string | null;
  provider_message: string | null;
  requested_by: string | null;
  requested_at: string | null;
  confirmed_at: string | null;
}

export interface Replacement {
  id: number;
  loan_id: number;
  loan_number: string | null;
  customer: string | null;
  old_device_id: number;
  old_imei: string | null;
  new_device_id: number;
  new_imei: string | null;
  new_model: string;
  reason_type: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requested_by_id: number;
  requested_by: string | null;
  requested_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
}

export interface DeviceDetail extends EsimuDevice {
  history: LockRequest[];
  loans: { loan_id: number; loan_number: string | null; loan_status: string | null; disbursed_amount: number | null; linked_by_reason: string; linked_at: string | null; unlinked_at: string | null; unlinked_reason: string | null }[];
  replacements: Replacement[];
  incidents: { id: number; type: string; details: string; occurred_on: string | null; reported_by: string | null; reported_at: string | null }[];
  audit: { action: string; by: string; at: string | null; details: Record<string, unknown> | null }[];
}

export interface CustomerDevices {
  reusable: EsimuDevice[];
  pending: EsimuDevice[];
  unavailable: EsimuDevice[];
}

export const LOCK_LABEL: Record<LockState, string> = {
  locked: "Locked",
  unlocked: "Active/Unlocked",
  lock_pending: "Lock Pending",
  unlock_pending: "Unlock Pending",
};

export const LOCK_BADGE: Record<LockState, string> = {
  locked: "danger",
  unlocked: "success",
  lock_pending: "warning",
  unlock_pending: "warning",
};

export const ENROLLMENT_LABEL: Record<EnrollmentStatus, string> = {
  not_registered: "Pending Registration",
  pending: "Awaiting QR scan",
  enrolled: "Enrolled",
};

export function deviceName(device: Pick<EsimuDevice, "make" | "model" | "imei">): string {
  return `${[device.make, device.model].filter(Boolean).join(" ") || "Phone"} · IMEI ${device.imei}`;
}
