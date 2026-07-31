import { z } from "zod";
import { EMPLOYMENT_STATUSES, PERFORMANCE_RATINGS, STAFF_ADVANCE_STATUSES, STAFF_LOAN_STATUSES, STAFF_PAYMENT_METHODS } from "@/types/enums";

export const StaffProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  employeeNumber: z.string(),
  branchId: z.string().nullable(),
  zoneId: z.string().nullable(),
  baseSalary: z.number().nonnegative(),
  commissionEligible: z.boolean(),
  paymentMethod: z.enum(STAFF_PAYMENT_METHODS),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES),
  hiredAt: z.string(),
  deletedAt: z.string().nullable(),
});
export type StaffProfile = z.infer<typeof StaffProfileSchema>;

export const StaffBankDetailsSchema = z.object({
  id: z.string(),
  staffProfileId: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
});
export type StaffBankDetails = z.infer<typeof StaffBankDetailsSchema>;

/** Internal mirror of the customer loan engine — backend §11. */
export const StaffLoanSchema = z.object({
  id: z.string(),
  staffProfileId: z.string(),
  amount: z.number().positive(),
  status: z.enum(STAFF_LOAN_STATUSES),
  // Both null until Finance disburses — a requested loan has moved no money.
  disbursedAt: z.string().nullable(),
  journalEntryId: z.string().nullable(),
});
export type StaffLoan = z.infer<typeof StaffLoanSchema>;

export const StaffAdvanceSchema = z.object({
  id: z.string(),
  staffProfileId: z.string(),
  amount: z.number().positive(),
  status: z.enum(STAFF_ADVANCE_STATUSES),
  requestedAt: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  disbursedAt: z.string().nullable(),
  journalEntryId: z.string().nullable(),
});
export type StaffAdvance = z.infer<typeof StaffAdvanceSchema>;

export const StaffPerformanceRecordSchema = z.object({
  id: z.string(),
  staffProfileId: z.string(),
  period: z.string(),
  targets: z.record(z.string(), z.number()),
  achieved: z.record(z.string(), z.number()),
  rating: z.enum(PERFORMANCE_RATINGS).nullable(),
  recordedBy: z.string(),
});
export type StaffPerformanceRecord = z.infer<typeof StaffPerformanceRecordSchema>;

/** POST /staff/advance/request */
export const StaffAdvanceRequestInputSchema = z.object({
  staffProfileId: z.string(),
  amount: z.number().positive(),
});
export type StaffAdvanceRequestInput = z.infer<typeof StaffAdvanceRequestInputSchema>;
