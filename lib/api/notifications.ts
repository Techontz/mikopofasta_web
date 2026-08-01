import "server-only";
import { mockRequest } from "@/lib/api/client";
import { PENDING_NOTIFICATIONS } from "@/lib/pending/notifications-fixture";
import type { AppNotification } from "@/types/notification";

/**
 * The notification bell.
 *
 * THE ONLY FIXTURE LEFT IN THE APPLICATION, and it is here because there is no
 * endpoint to call: `/api/v1/notifications` does not exist. Module 6 built the
 * template management — trigger events, channels, placeholders, one active
 * template per event — but nothing sends a notification and nothing lists one,
 * so there is no read to wire this to.
 *
 * It lives under `lib/pending/` rather than a `mock-data/` directory to say
 * exactly that: this is not a design placeholder to be swapped out at leisure,
 * it is a screen waiting on a backend feature that has been specified and not
 * built. Delete this file and point the function at the endpoint the day it
 * ships.
 *
 * The layout already calls this with `.catch(() => [])`, so the bell degrades
 * to empty rather than taking the shell down.
 */
export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await mockRequest<AppNotification[]>(() => PENDING_NOTIFICATIONS);
  return data;
}
