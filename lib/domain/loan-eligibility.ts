import type { CategoryProductEligibility, LoanProduct } from "@/types/loan-product";

/**
 * What is left of the frontend's §6 eligibility code.
 *
 * The rule engine itself is gone. `checkLoanApplication` re-implemented every
 * gate — KYC, freeze, category eligibility, amount and tenure bounds, the
 * one-open-loan rule and the post-closure cooldown — against arrays the browser
 * happened to be holding. `POST /loans/check-eligibility` applies exactly the
 * gates `POST /loans` will apply, against the customer's whole loan history and
 * the live category rules, so a local copy could only ever drift from what
 * submission actually does. `checkTopupEligibility` went the same way, to
 * `GET /loans/{loan}/topup-eligibility`.
 *
 * This one function stays because it is presentation, not adjudication: the
 * amount field shows a "min – max" hint as the officer types, and the ceiling
 * it prints is already in hand from the product and the category rule.
 */

/** The category→product cap, which overrides the product's own max when present. */
export function effectiveMaxAmount(
  product: Pick<LoanProduct, "maxAmount">,
  rule: Pick<CategoryProductEligibility, "maxAmountOverride"> | undefined
): number {
  return rule?.maxAmountOverride != null ? Math.min(product.maxAmount, rule.maxAmountOverride) : product.maxAmount;
}
