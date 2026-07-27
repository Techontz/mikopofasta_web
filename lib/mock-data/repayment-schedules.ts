import type { RepaymentSchedule } from "@/types/loan-product";

export const MOCK_REPAYMENT_SCHEDULES: RepaymentSchedule[] = [
  { id: "rs-daily", name: "Daily", code: "DAILY", frequencyDays: 1, deletedAt: null },
  { id: "rs-weekly", name: "Weekly", code: "WEEKLY", frequencyDays: 7, deletedAt: null },
  { id: "rs-monthly", name: "Monthly", code: "MONTHLY", frequencyDays: 30, deletedAt: null },
  { id: "rs-group", name: "Group", code: "GROUP", frequencyDays: 7, deletedAt: null },
];
