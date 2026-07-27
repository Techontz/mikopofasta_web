"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NotificationTemplateSchema } from "@/types/notification-template";
import { MOCK_NOTIFICATION_TEMPLATES } from "@/lib/mock-data/notification-templates";
import { nextId, upsert, removeById } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

const TemplateInputSchema = NotificationTemplateSchema.pick({
  name: true,
  triggerEvent: true,
  channel: true,
  subject: true,
  body: true,
  active: true,
});

async function requirePermission(): Promise<ActionResult | null> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.ADMIN_ORG_SETTINGS)) {
    return { ok: false, message: "You don't have permission to do that." };
  }
  return null;
}

export async function createNotificationTemplate(input: z.infer<typeof TemplateInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = TemplateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const actor = await getCurrentUser();
  upsert(MOCK_NOTIFICATION_TEMPLATES, { id: nextId("tmpl"), ...parsed.data, updatedBy: actor?.id ?? null, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template created." };
}

export async function updateNotificationTemplate(id: string, input: z.infer<typeof TemplateInputSchema>): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const parsed = TemplateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const existing = MOCK_NOTIFICATION_TEMPLATES.find((t) => t.id === id);
  if (!existing) return { ok: false, message: "Template not found." };
  const actor = await getCurrentUser();
  upsert(MOCK_NOTIFICATION_TEMPLATES, { ...existing, ...parsed.data, updatedBy: actor?.id ?? null, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template updated." };
}

export async function deleteNotificationTemplate(id: string): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  removeById(MOCK_NOTIFICATION_TEMPLATES, id);
  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template deleted." };
}

export async function toggleTemplateActive(id: string, active: boolean): Promise<ActionResult> {
  const denied = await requirePermission();
  if (denied) return denied;
  const existing = MOCK_NOTIFICATION_TEMPLATES.find((t) => t.id === id);
  if (!existing) return { ok: false, message: "Template not found." };
  existing.active = active;
  revalidatePath("/admin/notification-templates");
  return { ok: true, message: active ? "Template activated." : "Template deactivated." };
}
