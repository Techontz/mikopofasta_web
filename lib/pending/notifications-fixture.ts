import type { AppNotification } from "@/types/notification";

export const PENDING_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    title: "Loan pending approval",
    description: "LN-2026-000991 is awaiting manager approval.",
    tone: "info",
    createdAt: "2026-07-27T07:12:00Z",
    read: false,
  },
  {
    id: "n-2",
    title: "Disbursement failed",
    description: "Batch VODA124 failed — retry attempt 2 of 3.",
    tone: "danger",
    createdAt: "2026-07-27T06:40:00Z",
    read: false,
  },
  {
    id: "n-3",
    title: "Payment received",
    description: "TZS 50,000 allocated to LN-2026-000842.",
    tone: "success",
    createdAt: "2026-07-26T18:05:00Z",
    read: true,
  },
];
