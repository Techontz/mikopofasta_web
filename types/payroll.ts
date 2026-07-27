import { z } from "zod";
import { ALLOWANCE_TYPES, DEDUCTION_TYPES, PAYROLL_RUN_STATUSES } from "@/types/enums";

export const PayrollRunSchema = z.object({
  id: z.string(),
  period: z.string(),
  status: z.enum(PAYROLL_RUN_STATUSES),
  generatedBy: z.string(),
  finalizedAt: z.string().nullable(),
});
export type PayrollRun = z.infer<typeof PayrollRunSchema>;

export const AllowanceSchema = z.object({
  id: z.string(),
  payrollLineId: z.string(),
  type: z.enum(ALLOWANCE_TYPES),
  amount: z.number().nonnegative(),
});
export type Allowance = z.infer<typeof AllowanceSchema>;

export const DeductionSchema = z.object({
  id: z.string(),
  payrollLineId: z.string(),
  type: z.enum(DEDUCTION_TYPES),
  amount: z.number().nonnegative(),
  referenceId: z.string().nullable(),
});
export type Deduction = z.infer<typeof DeductionSchema>;

export const PayrollLineSchema = z.object({
  id: z.string(),
  payrollRunId: z.string(),
  staffProfileId: z.string(),
  baseSalary: z.number().nonnegative(),
  commissionAmount: z.number().nonnegative(),
  allowancesTotal: z.number().nonnegative(),
  deductionsTotal: z.number().nonnegative(),
  netSalary: z.number(),
  journalEntryId: z.string().nullable(),
});
export type PayrollLine = z.infer<typeof PayrollLineSchema>;

/** POST /payroll/generate */
export const GeneratePayrollInputSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
});
export type GeneratePayrollInput = z.infer<typeof GeneratePayrollInputSchema>;
