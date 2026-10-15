import type { Option } from "@/components/ui/SelectBox";

export interface CrmCustomerRef {
  id: number;
  name: string;
  code: string | null;
  phone: string;
}

export interface Interaction {
  id: number;
  type: "call" | "sms" | "visit" | "note";
  type_label: string;
  direction: "incoming" | "outgoing";
  direction_label: string;
  phone: string | null;
  outcome: string | null;
  outcome_label: string | null;
  notes: string | null;
  follow_up_date: string | null;
  follow_up_done_at: string | null;
  follow_up_notes: string | null;
  follow_up_status: "done" | "overdue" | "due" | "upcoming" | null;
  customer?: CrmCustomerRef;
  branch?: string | null;
  employee?: string | null;
  employee_id: number | null;
  created_at: string;
}

export type CaseType = "complaint" | "request";

export interface Ticket {
  id: number;
  ticket_number: string;
  type: CaseType;
  type_label: string;
  category: string;
  category_label: string;
  channel: string;
  channel_label: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  status_label: string;
  subject: string;
  description: string;
  resolution: string | null;
  resolved_at: string | null;
  customer?: CrmCustomerRef;
  branch?: string | null;
  employee?: string | null;
  assigned_to: number | null;
  assignee?: string | null;
  resolver?: string | null;
  created_at: string;
}

export interface CrmOptions {
  types: Option[];
  directions: Option[];
  outcomes: Option[];
  case_types: Option[];
  categories: Option[];
  channels: Option[];
  priorities: Option[];
  statuses: Option[];
  customer_statuses: Option[];
}

export interface CrmSummary {
  calls_today: number;
  incoming_today: number;
  sms_today: number;
  my_follow_ups_due: number;
  follow_ups_due: number;
  follow_ups_overdue: number;
  open_tickets: number;
}

export interface StaffActivity {
  employee_id: number;
  employee: string;
  branch: string | null;
  calls: number;
  incoming: number;
  outgoing: number;
  promised: number;
  unreached: number;
  sms: number;
  follow_ups_done: number;
  follow_ups_overdue: number;
  tickets_opened: number;
  tickets_resolved: number;
}

export const TICKET_STATUS_TONE = { open: "warning", in_progress: "info", waiting: "warning", resolved: "success", closed: "default" } as const;

/** Sidebar counts of what waits for CRM (GET /crm/badges). */
export interface CrmBadges {
  kyc: number;
  complaints: number;
  requests: number;
  follow_ups: number;
  updates: number;
}

/** A change to a registered customer's details: waiting for CRM approval, or already applied / rejected. */
export interface CustomerUpdate {
  id: number;
  status: "pending" | "approved" | "rejected";
  customer: CrmCustomerRef | null;
  branch: string | null;
  changes: Array<{ field: string; old: string; new: string }>;
  requested_by: string | null;
  requested_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
}
export const PRIORITY_TONE = { low: "default", normal: "info", high: "danger" } as const;
export const FOLLOW_UP_TONE = { done: "success", overdue: "danger", due: "warning", upcoming: "info" } as const;
