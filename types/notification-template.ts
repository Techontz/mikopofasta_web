import { z } from "zod";
import { NOTIFICATION_CHANNELS } from "@/types/enums";

/**
 * Not in the original 54-table backend schema — the docs describe SMS/email
 * being sent on specific events (payment received, disbursement failed,
 * etc.) but not a template management table. A small, clearly-scoped
 * addition so "Notification Templates" is a real, editable entity rather
 * than hardcoded message strings.
 */
export const NOTIFICATION_TRIGGER_EVENTS = [
  "loan_applied",
  "loan_approved",
  "loan_rejected",
  "disbursement_success",
  "disbursement_failed",
  "payment_received",
  "payment_overdue",
  "loan_closed",
] as const;
export type NotificationTriggerEvent = (typeof NOTIFICATION_TRIGGER_EVENTS)[number];

export const NotificationTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  triggerEvent: z.enum(NOTIFICATION_TRIGGER_EVENTS),
  channel: z.enum(NOTIFICATION_CHANNELS),
  subject: z.string().nullable(),
  body: z.string(),
  active: z.boolean(),
  updatedBy: z.string().nullable(),
  updatedAt: z.string(),
});
export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

export const SaveNotificationTemplateInputSchema = NotificationTemplateSchema.pick({
  name: true,
  triggerEvent: true,
  channel: true,
  subject: true,
  body: true,
  active: true,
});
export type SaveNotificationTemplateInput = z.infer<typeof SaveNotificationTemplateInputSchema>;
