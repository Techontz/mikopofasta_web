import "server-only";
import { apiData, apiRequest } from "@/lib/api/client";
import { getApiToken } from "@/lib/auth/session";
import type { ApiPagination } from "@/lib/api/types";
import type { AuditLog } from "@/types/audit";
import type { InterestFormula, RepaymentSchedule } from "@/types/loan-product";
import type {
  NotificationTemplate,
  NotificationTriggerEvent,
  SaveNotificationTemplateInput,
} from "@/types/notification-template";

/**
 * Settings → Interest Formulas, Repayment Schedules, Notification Templates,
 * Audit Logs.
 *
 * Reads are open; every write needs `admin.org_settings`, and the audit trail
 * needs `audit.view` or `admin.org_settings`. All of that is decided by
 * SystemConfigurationPolicy on the API side — nothing here re-decides it.
 *
 * The two list endpoints for formulas and schedules live in lib/api/loans.ts,
 * because the loan application form is their main caller. This module adds the
 * writes and the two screens that have no other home.
 *
 * See the API's docs/modules/administration.md.
 */

async function token(): Promise<string | undefined> {
  return getApiToken();
}

// ---------------------------------------------------------------------------
// Interest formulas
// ---------------------------------------------------------------------------

/**
 * `InterestFormula` plus how much is riding on it.
 *
 * The count is why the settings screen is worth visiting: renaming REDUCING to
 * something a new officer can read is only meaningful next to the number of
 * products computing interest that way.
 */
export interface InterestFormulaRecord extends InterestFormula {
  productCount: number;
}

/**
 * Name and description only.
 *
 * There is no create and no delete, on either side. `code` is a branch in the
 * interest engine — SIMPLE, FLAT, REDUCING are the three the schedule generator
 * implements — so a fourth row would be a formula nothing knows how to compute
 * and every loan priced from it would fail at origination.
 */
export async function updateInterestFormulaRequest(
  id: string,
  input: { name: string; description: string | null }
): Promise<InterestFormulaRecord> {
  return apiData<InterestFormulaRecord>(`/api/v1/interest-formulas/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Repayment schedules
// ---------------------------------------------------------------------------

/**
 * `RepaymentSchedule` plus what is using it.
 *
 * Both counts are the guards made visible: the frequency is locked once loans
 * are running on it — it generated their instalment dates — and the row cannot
 * be retired while a product still offers it.
 */
export interface RepaymentScheduleRecord extends RepaymentSchedule {
  loanCount: number;
  productCount: number;
}

export interface RepaymentScheduleInput {
  name: string;
  code: string;
  frequencyDays: number;
}

export async function createRepaymentScheduleRequest(
  input: RepaymentScheduleInput
): Promise<RepaymentScheduleRecord> {
  return apiData<RepaymentScheduleRecord>("/api/v1/repayment-schedules", {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateRepaymentScheduleRequest(
  id: string,
  input: RepaymentScheduleInput
): Promise<RepaymentScheduleRecord> {
  return apiData<RepaymentScheduleRecord>(`/api/v1/repayment-schedules/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

export async function deleteRepaymentScheduleRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/repayment-schedules/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Notification templates
// ---------------------------------------------------------------------------

/**
 * `NotificationTemplate` plus what the editor needs to be useful.
 *
 * `availablePlaceholders` is what this event can fill; `placeholdersUsed` is
 * what the body currently references. The form shows the first as a palette and
 * the second so a reader can see at a glance what will be interpolated.
 */
export interface NotificationTemplateRecord extends NotificationTemplate {
  triggerEventLabel: string;
  channelLabel: string;
  availablePlaceholders: string[];
  placeholdersUsed: string[];
  updatedByName?: string | null;
}

/**
 * The vocabulary the editor offers, from the server rather than a second copy
 * on this side.
 *
 * Which placeholders an event can supply is a server decision — it is what the
 * save endpoint validates against — so keeping a parallel list here would mean
 * a template that looks valid in the form and is rejected on submit.
 */
export interface NotificationTemplateVocabulary {
  triggerEvents: { value: NotificationTriggerEvent; label: string; placeholders: string[] }[];
  channels: { value: string; label: string; hasSubject: boolean }[];
}

export interface NotificationTemplateList {
  templates: NotificationTemplateRecord[];
  vocabulary: NotificationTemplateVocabulary;
}

export async function getNotificationTemplates(filters?: {
  triggerEvent?: string;
  channel?: string;
  active?: boolean;
}): Promise<NotificationTemplateList> {
  const { data, meta } = await apiRequest<NotificationTemplateRecord[]>("/api/v1/notification-templates", {
    token: await token(),
    query: {
      trigger_event: filters?.triggerEvent,
      channel: filters?.channel,
      active: filters?.active === undefined ? undefined : filters.active ? 1 : 0,
    },
  });

  return {
    templates: data,
    vocabulary: {
      triggerEvents: (meta?.triggerEvents ?? []) as NotificationTemplateVocabulary["triggerEvents"],
      channels: (meta?.channels ?? []) as NotificationTemplateVocabulary["channels"],
    },
  };
}

export async function createNotificationTemplateRequest(
  input: SaveNotificationTemplateInput
): Promise<NotificationTemplateRecord> {
  return apiData<NotificationTemplateRecord>("/api/v1/notification-templates", {
    method: "POST",
    token: await token(),
    body: input,
  });
}

export async function updateNotificationTemplateRequest(
  id: string,
  input: SaveNotificationTemplateInput
): Promise<NotificationTemplateRecord> {
  return apiData<NotificationTemplateRecord>(`/api/v1/notification-templates/${id}`, {
    method: "PUT",
    token: await token(),
    body: input,
  });
}

export async function deleteNotificationTemplateRequest(id: string): Promise<void> {
  await apiData<{ message: string }>(`/api/v1/notification-templates/${id}`, {
    method: "DELETE",
    token: await token(),
  });
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

/**
 * `AuditLog` plus two resolved labels.
 *
 * `auditableType` stays the fully-qualified class the row stores, because that
 * is what makes an entry traceable back to the record. `auditableLabel` is the
 * short form the table shows, and `userName` saves the page fetching every user
 * to render one column.
 */
export interface AuditLogRecord extends AuditLog {
  auditableLabel: string;
  userName?: string | null;
}

export interface AuditLogList {
  logs: AuditLogRecord[];
  /** The actions actually present, for the filter — not the enum, which drifts. */
  actions: string[];
  pagination?: ApiPagination;
}

/**
 * Read-only, and there is no companion write function anywhere in this file:
 * §2 makes the trail append-only, and the API routes no verb but GET.
 */
export async function getAuditLogs(filters?: {
  search?: string;
  action?: string;
  userId?: string;
  auditableType?: string;
  auditableId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}): Promise<AuditLogList> {
  const { data, meta } = await apiRequest<AuditLogRecord[]>("/api/v1/audit-logs", {
    token: await token(),
    query: {
      search: filters?.search,
      action: filters?.action,
      user_id: filters?.userId,
      auditable_type: filters?.auditableType,
      auditable_id: filters?.auditableId,
      from: filters?.from,
      to: filters?.to,
      page: filters?.page,
      per_page: filters?.perPage,
    },
  });

  return {
    logs: data,
    actions: (meta?.actions ?? []) as string[],
    pagination: meta?.pagination,
  };
}
