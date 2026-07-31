"use server";

import { revalidatePath } from "next/cache";
import {
  createNotificationTemplateRequest,
  deleteNotificationTemplateRequest,
  updateNotificationTemplateRequest,
} from "@/lib/api/system-configuration";
import { ApiError } from "@/lib/api/errors";
import type { ActionResult } from "@/lib/domain/action-result";
import {
  SaveNotificationTemplateInputSchema,
  type NotificationTemplate,
  type SaveNotificationTemplateInput,
} from "@/types/notification-template";

/**
 * Settings → Notification Templates.
 *
 * Three rules are the API's, and each needs something this side cannot see:
 *
 *   - **Placeholders must be ones the event can supply.** The set depends on
 *     the trigger event, and the server is what decides it. An unknown one
 *     would otherwise reach a customer as the literal text `{{amount}}`.
 *   - **One active template per event and channel.** Two live SMS templates for
 *     `payment_received` would leave the sender picking arbitrarily.
 *   - **SMS carries no subject.** Supplying one is refused rather than dropped.
 *
 * Authorization is SystemConfigurationPolicy's — `admin.org_settings` for every
 * write. None of it is re-decided here.
 */

function fail(error: unknown): ActionResult {
  if (error instanceof ApiError) {
    // A 422 names what it rejected: the unknown placeholder, or which template
    // is already live for this event. Both are worth showing verbatim.
    const field = error.fieldErrors && Object.values(error.fieldErrors)[0]?.[0];
    return { ok: false, message: field ?? error.message };
  }
  return { ok: false, message: "Something went wrong. Please try again." };
}

export async function createNotificationTemplate(
  input: SaveNotificationTemplateInput
): Promise<ActionResult> {
  const parsed = SaveNotificationTemplateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await createNotificationTemplateRequest(parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template created." };
}

export async function updateNotificationTemplate(
  id: string,
  input: SaveNotificationTemplateInput
): Promise<ActionResult> {
  const parsed = SaveNotificationTemplateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    await updateNotificationTemplateRequest(id, parsed.data);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template updated." };
}

export async function deleteNotificationTemplate(id: string): Promise<ActionResult> {
  try {
    /*
     * Soft-deleted on the API side. What was being sent to customers last
     * quarter is part of the record of what the company told them, and a
     * support question about a message someone received is unanswerable once
     * the template is really gone.
     */
    await deleteNotificationTemplateRequest(id);
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/admin/notification-templates");
  return { ok: true, message: "Notification template deleted." };
}

/**
 * The row's Active switch.
 *
 * Takes the whole template rather than an id, because there is no partial
 * update: the API's save endpoint validates the message as a whole — the
 * placeholders against the event, the subject against the channel — and a patch
 * carrying only `active` would ask it to re-approve a body it could not see.
 *
 * Turning the last live template for an event off is allowed. An event with
 * nothing configured sends nothing, which is a state the business may
 * legitimately want for a month — and is the reason inactive rows are kept
 * rather than deleted.
 */
export async function toggleTemplateActive(
  template: NotificationTemplate,
  active: boolean
): Promise<ActionResult> {
  const result = await updateNotificationTemplate(template.id, {
    name: template.name,
    triggerEvent: template.triggerEvent,
    channel: template.channel,
    subject: template.subject,
    body: template.body,
    active,
  });

  if (!result.ok) return result;

  return { ok: true, message: active ? "Template activated." : "Template deactivated." };
}
