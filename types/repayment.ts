import { z } from "zod";
import { CASH_DEPOSIT_STATUSES, PAYMENT_CHANNELS, PAYMENT_STATUSES, SUSPENSE_STATUSES, TRIGGERED_BY } from "@/types/enums";

export const PaymentSchema = z.object({
  id: z.string(),
  paymentReference: z.string(),
  loanId: z.string().nullable(),
  customerId: z.string().nullable(),
  amount: z.number().positive(),
  channel: z.enum(PAYMENT_CHANNELS),
  transactionId: z.string().nullable(),
  status: z.enum(PAYMENT_STATUSES),
  branchId: z.string().nullable(),
  tellerId: z.string().nullable(),
  receivedAt: z.string(),
  confirmedAt: z.string().nullable(),
  createdBy: z.string().nullable(),
});
export type Payment = z.infer<typeof PaymentSchema>;

/** One row per installment touched by a payment, in Penalty -> Interest -> Principal order. */
export const PaymentAllocationSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  loanScheduleId: z.string(),
  penaltyAllocated: z.number().nonnegative(),
  interestAllocated: z.number().nonnegative(),
  principalAllocated: z.number().nonnegative(),
  createdAt: z.string(),
});
export type PaymentAllocation = z.infer<typeof PaymentAllocationSchema>;

export const SuspenseItemSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  reason: z.string(),
  amount: z.number().positive(),
  status: z.enum(SUSPENSE_STATUSES),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
});
export type SuspenseItem = z.infer<typeof SuspenseItemSchema>;

export const CashDepositSchema = z.object({
  id: z.string(),
  tellerId: z.string(),
  branchId: z.string(),
  amount: z.number().positive(),
  bankAccountId: z.string(),
  depositSlipPath: z.string().nullable(),
  status: z.enum(CASH_DEPOSIT_STATUSES),
  matchedPaymentIds: z.array(z.string()).nullable(),
  reconciledBy: z.string().nullable(),
  reconciledAt: z.string().nullable(),
});
export type CashDeposit = z.infer<typeof CashDepositSchema>;

export const PenaltyRunSchema = z.object({
  id: z.string(),
  runDate: z.string(),
  loansProcessed: z.number().int().nonnegative(),
  totalPenaltyApplied: z.number().nonnegative(),
  triggeredBy: z.enum(TRIGGERED_BY),
  createdAt: z.string(),
});
export type PenaltyRun = z.infer<typeof PenaltyRunSchema>;

// ---------------------------------------------------------------------------
// Request-shape schemas (backend §15.3)
// ---------------------------------------------------------------------------

/** POST /webhooks/payments — inbound provider-signed payment. */
export const InboundPaymentWebhookSchema = z.object({
  reference: z.string(),
  amount: z.number().positive(),
  phone: z.string(),
  channel: z.enum(PAYMENT_CHANNELS),
  transactionId: z.string(),
});
export type InboundPaymentWebhook = z.infer<typeof InboundPaymentWebhookSchema>;

/** POST /payments/cash — teller entry. */
export const CashPaymentInputSchema = z.object({
  customerId: z.string(),
  loanId: z.string(),
  amount: z.number().positive(),
  branchId: z.string(),
  tellerId: z.string(),
});
export type CashPaymentInput = z.infer<typeof CashPaymentInputSchema>;

/** POST /payments/allocate — Finance resolving a suspense item. */
export const AllocateSuspenseInputSchema = z.object({
  suspenseItemId: z.string(),
  loanId: z.string(),
});
export type AllocateSuspenseInput = z.infer<typeof AllocateSuspenseInputSchema>;
