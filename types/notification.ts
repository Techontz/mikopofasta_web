import { z } from "zod";
import { NOTIFICATION_CHANNELS } from "@/types/enums";

export type NotificationTone = "info" | "success" | "warning" | "danger";

/** UI bell feed — a presentation-layer concept, not a backend table. */
export interface AppNotification {
  id: string;
  title: string;
  description: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
}

/**
 * Mirrors the backend's `notifications` table (Laravel default shape,
 * backend §2.10) — the actual dispatched SMS/email record, distinct from
 * the UI bell feed above.
 */
export const SystemNotificationSchema = z.object({
  id: z.string(),
  notifiableType: z.string(),
  notifiableId: z.string(),
  channel: z.enum(NOTIFICATION_CHANNELS),
  template: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "sent", "failed"]),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
export type SystemNotification = z.infer<typeof SystemNotificationSchema>;
