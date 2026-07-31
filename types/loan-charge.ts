import { z } from "zod";

/**
 * Settings → Loan Fee / Penalty / Reserve Setting.
 *
 * Mirrors the API's LoanFeeResource, PenaltySettingResource and
 * ReserveSettingResource. Money and rates arrive as decimal strings, the same
 * as everywhere else in this contract, and are coerced at the API boundary.
 */

/** `ChargeValueType` on the wire: how a configured charge should be read. */
export const CHARGE_VALUE_TYPES = ["money_value", "percentage_value"] as const;
export type ChargeValueType = (typeof CHARGE_VALUE_TYPES)[number];

/** The wording the legacy screens use, kept so the two systems read alike. */
export const CHARGE_VALUE_TYPE_LABELS: Record<ChargeValueType, string> = {
  money_value: "MONEY VALUE",
  percentage_value: "PERCENTAGE VALUE",
};

export const LoanFeeSchema = z.object({
  id: z.string(),
  loanProductId: z.string(),
  feeType: z.enum(CHARGE_VALUE_TYPES),
  feeTypeLabel: z.string(),
  feeAmount: z.number(),
  insuranceAmount: z.number(),
});
export type LoanFee = z.infer<typeof LoanFeeSchema>;

/**
 * One row of the Loan Fee screen: a loan category and its fee, if priced.
 * `fee` is null for a category no one has priced yet — the list shows every
 * category either way, as the legacy screen does.
 */
export const LoanFeeRowSchema = z.object({
  loanProductId: z.string(),
  productName: z.string(),
  productCode: z.string(),
  minAmount: z.number(),
  maxAmount: z.number(),
  interestRate: z.number(),
  fee: LoanFeeSchema.nullable(),
});
export type LoanFeeRow = z.infer<typeof LoanFeeRowSchema>;

/**
 * Mirrors the API's UpdateLoanFeeRequest.
 *
 * Plain numbers rather than `z.coerce`: the number inputs register with
 * `valueAsNumber`, so the form already hands over numbers, and coercing here
 * would widen the resolver's input type to `unknown`.
 */
export const LoanFeeInputSchema = z.object({
  feeType: z.enum(CHARGE_VALUE_TYPES),
  feeAmount: z
    .number({ message: "Enter a fee amount." })
    .min(0, "A fee cannot be negative."),
  insuranceAmount: z
    .number({ message: "Enter an insurance amount." })
    .min(0, "Insurance cannot be negative."),
});
export type LoanFeeInput = z.infer<typeof LoanFeeInputSchema>;

/**
 * A percentage cannot exceed 100; a flat amount can be any positive figure.
 * The ceiling depends on the sibling field, which is why it is refined here
 * rather than expressed as a plain `max` — the API applies the same rule.
 */
export const LoanFeeFormSchema = LoanFeeInputSchema.refine(
  (v) => v.feeType !== "percentage_value" || v.feeAmount <= 100,
  { path: ["feeAmount"], message: "A percentage fee cannot exceed 100." }
);

// ---------------------------------------------------------------------------
// Penalty
// ---------------------------------------------------------------------------

export const PenaltySettingSchema = z.object({
  id: z.string(),
  calculationType: z.enum(CHARGE_VALUE_TYPES),
  calculationTypeLabel: z.string(),
  amount: z.number(),
  createdAt: z.string().nullable(),
});
export type PenaltySetting = z.infer<typeof PenaltySettingSchema>;

/** Mirrors the API's StorePenaltySettingRequest. */
export const PenaltySettingInputSchema = z.object({
  calculationType: z.enum(CHARGE_VALUE_TYPES),
  amount: z
    .number({ message: "Enter a penalty amount." })
    .min(0, "A penalty cannot be negative."),
});
export type PenaltySettingInput = z.infer<typeof PenaltySettingInputSchema>;

/** Same conditional ceiling as the loan fee, and enforced by the API too. */
export const PenaltySettingFormSchema = PenaltySettingInputSchema.refine(
  (v) => v.calculationType !== "percentage_value" || v.amount <= 100,
  { path: ["amount"], message: "A percentage penalty cannot exceed 100." }
);

// ---------------------------------------------------------------------------
// Reserve
// ---------------------------------------------------------------------------

export const ReserveSettingSchema = z.object({
  id: z.string(),
  percentage: z.number(),
  updatedAt: z.string().nullable(),
});
export type ReserveSetting = z.infer<typeof ReserveSettingSchema>;

/**
 * Mirrors the API's UpdateReserveSettingRequest. A reserve is a share of the
 * portfolio, so it is bounded at both ends — no conditional ceiling here,
 * because there is only ever one unit.
 */
export const ReserveSettingInputSchema = z.object({
  percentage: z
    .number({ message: "Enter a reserve percentage." })
    .min(0, "A reserve cannot be negative.")
    .max(100, "A reserve cannot exceed 100%."),
});
export type ReserveSettingInput = z.infer<typeof ReserveSettingInputSchema>;
