import { z } from "zod";

/**
 * Capital module — Share Holders, Add Capitals, and the three float screens.
 * Mirrors the API's Treasury resources. Money arrives as decimal strings and is
 * coerced once, at the API boundary.
 */

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const ShareholderSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  gender: z.enum(GENDERS),
  dateOfBirth: z.string(),
  /** Drives whether delete is offered — the API refuses once capital exists. */
  contributionCount: z.number(),
});
export type Shareholder = z.infer<typeof ShareholderSchema>;

/** Mirrors the API's StoreShareholderRequest, field for field. */
export const ShareholderInputSchema = z.object({
  fullName: z.string().min(3, "Enter the full name.").max(150),
  phone: z.string().min(7, "Enter a phone number.").max(20),
  email: z.string().email("Enter a valid email address."),
  gender: z.enum(GENDERS, { message: "Select a gender." }),
  dateOfBirth: z
    .string()
    .min(1, "Enter a date of birth.")
    .refine((v) => new Date(v) < new Date(), "Date of birth must be in the past."),
});
export type ShareholderInput = z.infer<typeof ShareholderInputSchema>;

// ---------------------------------------------------------------------------
// Add Capitals
// ---------------------------------------------------------------------------

export const PAY_METHODS = ["cash", "cheque", "bank_transfer"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export const PAY_METHOD_LABELS: Record<PayMethod, string> = {
  cash: "CASH",
  cheque: "CHEQUE",
  bank_transfer: "BANK TRANSFER",
};

export const CapitalContributionSchema = z.object({
  id: z.string(),
  shareholderId: z.string(),
  shareholderName: z.string(),
  amount: z.number(),
  payMethod: z.enum(PAY_METHODS),
  payMethodLabel: z.string(),
  receiptNo: z.string().nullable(),
  chequeNo: z.string().nullable(),
  createdAt: z.string().nullable(),
});
export type CapitalContribution = z.infer<typeof CapitalContributionSchema>;

/** Mirrors the API's StoreCapitalContributionRequest, in the legacy field order. */
export const CapitalContributionInputSchema = z
  .object({
    shareholderId: z.string().min(1, "Select a share holder."),
    amount: z.number({ message: "Enter an amount." }).gt(0, "Enter an amount greater than zero."),
    payMethod: z.enum(PAY_METHODS),
    receiptNo: z.string(),
    chequeNo: z.string(),
  })
  // The API applies the same rule: a cheque number only matters for a cheque.
  .refine((v) => v.payMethod !== "cheque" || v.chequeNo.trim().length > 0, {
    path: ["chequeNo"],
    message: "A cheque number is required when the pay method is cheque.",
  });
export type CapitalContributionInput = z.infer<typeof CapitalContributionInputSchema>;

/** The two totals the legacy screen prints beneath the table. */
export interface CapitalTotals {
  shareholderCapital: number;
  companyCapital: number;
}

// ---------------------------------------------------------------------------
// Float
// ---------------------------------------------------------------------------

export const FLOAT_KINDS = ["company_to_branch", "branch_to_branch", "account_to_account"] as const;
export type FloatKind = (typeof FLOAT_KINDS)[number];

export const FLOAT_STATUSES = ["pending", "approved", "rejected"] as const;
export type FloatStatus = (typeof FLOAT_STATUSES)[number];

export const FloatTransferSchema = z.object({
  id: z.string(),
  kind: z.enum(FLOAT_KINDS),
  amount: z.number(),
  status: z.enum(FLOAT_STATUSES),
  statusLabel: z.string(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string().nullable(),
  fromBranchName: z.string().nullable(),
  toBranchName: z.string().nullable(),
  fromAccountName: z.string().nullable(),
  toAccountName: z.string().nullable(),
  requestedBy: z.string(),
  requesterName: z.string().nullable(),
  approverName: z.string().nullable(),
});
export type FloatTransfer = z.infer<typeof FloatTransferSchema>;

/**
 * Mirrors the API's StoreFloatTransferRequest. Which ids are required depends
 * on `kind`; each screen refines this with only the rule it needs, exactly as
 * the API does.
 */
export const FloatTransferInputSchema = z.object({
  kind: z.enum(FLOAT_KINDS),
  amount: z.number({ message: "Enter an amount." }).gt(0, "Enter an amount greater than zero."),
  fromBranchId: z.string().nullable(),
  toBranchId: z.string().nullable(),
  fromAccountId: z.string().nullable(),
  toAccountId: z.string().nullable(),
});
export type FloatTransferInput = z.infer<typeof FloatTransferInputSchema>;
