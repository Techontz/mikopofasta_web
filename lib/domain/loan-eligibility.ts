import type { Customer } from "@/types/customer";
import type { CategoryProductEligibility, LoanProduct, LoanProductRepaymentSchedule } from "@/types/loan-product";
import type { Loan, LoanSchedule } from "@/types/loan";
import { scheduleOutstanding } from "@/types/loan";
import { round2 } from "@/lib/domain/money";

/**
 * Pure eligibility rule engine — backend spec §6. Every gate the backend
 * enforces at application time is evaluated here so the UI can block (and
 * explain) before submitting, and the Server Action can re-run the exact
 * same check server-side. Nothing here is hardcoded: every threshold comes
 * from the LoanProduct row or the category eligibility pivot.
 */
export interface EligibilityViolation {
  code: string;
  message: string;
}

export interface ApplicationCheckInput {
  customer: Customer;
  product: LoanProduct;
  repaymentScheduleId: string;
  principalAmount: number;
  tenureDays: number;
  eligibility: CategoryProductEligibility[];
  productSchedules: LoanProductRepaymentSchedule[];
  /** Every non-terminal loan this customer already holds. */
  openLoans: Loan[];
}

const TERMINAL_STATUSES = new Set(["closed", "rejected", "cancelled", "written_off", "recovered"]);

export function isLoanOpen(loan: Loan): boolean {
  return !TERMINAL_STATUSES.has(loan.status) && loan.deletedAt === null;
}

/** The category→product cap, which overrides the product's own max when present. */
export function effectiveMaxAmount(product: LoanProduct, rule: CategoryProductEligibility | undefined): number {
  return rule?.maxAmountOverride != null ? Math.min(product.maxAmount, rule.maxAmountOverride) : product.maxAmount;
}

export function checkLoanApplication(input: ApplicationCheckInput): EligibilityViolation[] {
  const { customer, product, repaymentScheduleId, principalAmount, tenureDays, eligibility, productSchedules, openLoans } = input;
  const violations: EligibilityViolation[] = [];

  if (customer.kycStatus !== "completed") {
    violations.push({ code: "KYC_INCOMPLETE", message: "Customer KYC is not complete." });
  }
  if (customer.status === "frozen") {
    violations.push({ code: "CUSTOMER_FROZEN", message: "Customer account is frozen and cannot take new loans." });
  }
  if (customer.status === "suspended") {
    violations.push({ code: "CUSTOMER_SUSPENDED", message: "Customer account is suspended." });
  }
  if (customer.approvalStatus === "pending") {
    violations.push({ code: "CUSTOMER_PENDING_APPROVAL", message: "Customer registration is still awaiting approval." });
  }
  if (customer.approvalStatus === "rejected") {
    violations.push({ code: "CUSTOMER_REJECTED", message: "Customer registration was rejected." });
  }
  if (product.status !== "active") {
    violations.push({ code: "PRODUCT_INACTIVE", message: `"${product.name}" is not currently active.` });
  }

  const rule = eligibility.find((e) => e.customerCategoryId === customer.customerCategoryId && e.loanProductId === product.id);
  if (!rule) {
    violations.push({ code: "CATEGORY_NOT_ELIGIBLE_FOR_PRODUCT", message: "This customer's category is not eligible for this product." });
  }

  const scheduleAllowed = productSchedules.some((ps) => ps.loanProductId === product.id && ps.repaymentScheduleId === repaymentScheduleId);
  if (!scheduleAllowed) {
    violations.push({ code: "SCHEDULE_NOT_SUPPORTED_BY_PRODUCT", message: "This repayment schedule isn't supported by the selected product." });
  }

  const maxAmount = effectiveMaxAmount(product, rule);
  if (principalAmount < product.minAmount) {
    violations.push({ code: "AMOUNT_BELOW_MINIMUM", message: `Below the product minimum of ${product.minAmount.toLocaleString()}.` });
  }
  if (principalAmount > maxAmount) {
    violations.push({ code: "AMOUNT_ABOVE_MAXIMUM", message: `Exceeds the maximum of ${maxAmount.toLocaleString()} for this customer's category.` });
  }
  if (tenureDays < product.minTenureDays || tenureDays > product.maxTenureDays) {
    violations.push({
      code: "TENURE_OUT_OF_RANGE",
      message: `Tenure must be between ${product.minTenureDays} and ${product.maxTenureDays} days.`,
    });
  }

  const active = openLoans.filter(isLoanOpen);
  if (active.length > 0) {
    violations.push({ code: "EXISTING_OPEN_LOAN", message: `Customer already has an open loan (${active[0].loanNumber}).` });
  }

  const frozenUntil = active.find((l) => l.frozenUntil && new Date(l.frozenUntil) > new Date());
  if (frozenUntil) {
    violations.push({ code: "CUSTOMER_IN_COOLDOWN", message: `Customer is in a post-closure cooldown until ${frozenUntil.frozenUntil}.` });
  }

  return violations;
}

/**
 * Top-up eligibility — a read-model check (backend spec §6/§15.2).
 *
 * NOT YET WIRED TO A SCREEN: frontend spec §10 lists `/loans/[id]/topup`,
 * which has not been built. Retained because it is specified domain logic the
 * top-up screen and `GET /loans/{id}/topup-eligibility` will both need; see
 * the frontend readiness report's "Known gaps" section.
 */
export interface TopupEligibility {
  eligible: boolean;
  paidPercent: number;
  reasons: string[];
}

export function checkTopupEligibility(loan: Loan, schedules: LoanSchedule[], minPaidPercent = 60): TopupEligibility {
  const reasons: string[] = [];

  const totalDue = round2(schedules.reduce((sum, s) => sum + s.principalDue + s.interestDue + s.penaltyDue, 0));
  const totalPaid = round2(schedules.reduce((sum, s) => sum + s.principalPaid + s.interestPaid + s.penaltyPaid, 0));
  const paidPercent = totalDue === 0 ? 0 : round2((totalPaid / totalDue) * 100);

  if (loan.status !== "active") {
    reasons.push("Only an active loan can be topped up.");
  }
  if (paidPercent < minPaidPercent) {
    reasons.push(`Only ${paidPercent}% repaid — ${minPaidPercent}% is required.`);
  }
  const hasArrears = schedules.some((s) => s.status === "overdue" && scheduleOutstanding(s).total > 0);
  if (hasArrears) {
    reasons.push("Loan has overdue installments.");
  }

  return { eligible: reasons.length === 0, paidPercent, reasons };
}
