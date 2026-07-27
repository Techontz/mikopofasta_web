import "server-only";
import { mockRequest } from "@/lib/api/client";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/notifications";
import type { AppNotification } from "@/types/notification";

/** Future: GET /api/v1/notifications */
export async function getNotifications(): Promise<AppNotification[]> {
  const { data } = await mockRequest<AppNotification[]>(() => MOCK_NOTIFICATIONS);
  return data;
}
