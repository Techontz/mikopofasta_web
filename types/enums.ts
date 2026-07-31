/**
 * Every shared enum in the system, mirroring the ENUM columns in
 * docs/backend-architecture-specification.md exactly. One place, so no two
 * domain files ever invent slightly different status lists for the same
 * concept.
 */

function toEnum<T extends readonly [string, ...string[]]>(values: T) {
  return values;
}

export const GENDERS = toEnum(["male", "female"]);
export type Gender = (typeof GENDERS)[number];

export const MARITAL_STATUSES = toEnum(["single", "married", "divorced", "widowed"]);
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const RESIDENCE_TYPES = toEnum(["owned", "rented"]);
export type ResidenceType = (typeof RESIDENCE_TYPES)[number];

export const KYC_STATUSES = toEnum(["incomplete", "completed"]);
export type KycStatus = (typeof KYC_STATUSES)[number];

export const CUSTOMER_STATUSES = toEnum(["active", "suspended", "frozen"]);
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const RISK_TIERS = toEnum(["low", "medium", "high"]);
export type RiskTier = (typeof RISK_TIERS)[number];

/** Which wizard step a category's dynamic fields render under — Phase 3 registration wizard. */
export const CUSTOMER_CATEGORY_SECTORS = toEnum(["employment", "business", "other"]);
export type CustomerCategorySector = (typeof CUSTOMER_CATEGORY_SECTORS)[number];

/** Gates a customer past KYC completion when their category.requiresExtraApproval is true. */
export const CUSTOMER_APPROVAL_STATUSES = toEnum(["not_required", "pending", "approved", "rejected"]);
export type CustomerApprovalStatus = (typeof CUSTOMER_APPROVAL_STATUSES)[number];

export const GUARANTOR_RELATIONSHIPS = toEnum(["spouse", "parent", "sibling", "relative", "friend", "colleague", "other"]);
export type GuarantorRelationship = (typeof GUARANTOR_RELATIONSHIPS)[number];

export const BRANCH_TYPES = toEnum(["main", "sub"]);
export type BranchType = (typeof BRANCH_TYPES)[number];

export const ACTIVE_INACTIVE = toEnum(["active", "inactive"]);
export type ActiveInactive = (typeof ACTIVE_INACTIVE)[number];

export const USER_STATUSES = toEnum(["active", "suspended"]);
export type UserStatus = (typeof USER_STATUSES)[number];

export const GROUP_STATUSES = toEnum(["active", "inactive"]);
export type GroupStatus = (typeof GROUP_STATUSES)[number];

export const GROUP_MEMBER_STATUSES = toEnum(["active", "left"]);
export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUSES)[number];

export const INTEREST_FORMULA_CODES = toEnum(["SIMPLE", "FLAT", "REDUCING"]);
export type InterestFormulaCode = (typeof INTEREST_FORMULA_CODES)[number];

export const PENALTY_TYPES = toEnum(["percentage_of_overdue", "flat_fee", "percentage_per_day"]);
export type PenaltyType = (typeof PENALTY_TYPES)[number];

/** Full loan lifecycle — see docs/backend-architecture-specification.md §10. */
export const LOAN_STATUSES = toEnum([
  "draft",
  "pending_manager_approval",
  "rejected",
  "mandate_pending_otp",
  "mandate_failed",
  "mandate_active",
  "pending_credit_review",
  "pending_finance",
  "awaiting_disbursement",
  "disbursement_failed",
  "escalated",
  "active",
  "arrears",
  "defaulted",
  "written_off",
  "recovered",
  "closed",
  "frozen",
  "cancelled",
]);
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_SCHEDULE_STATUSES = toEnum(["pending", "partial", "paid", "overdue"]);
export type LoanScheduleStatus = (typeof LOAN_SCHEDULE_STATUSES)[number];

export const E_MANDATE_STATUSES = toEnum(["pending_otp", "active", "failed"]);
export type EMandateStatus = (typeof E_MANDATE_STATUSES)[number];

export const TELCO_VERIFICATION_STATUSES = toEnum(["pending", "success", "failed"]);
export type TelcoVerificationStatus = (typeof TELCO_VERIFICATION_STATUSES)[number];

export const DISBURSEMENT_CHANNELS = toEnum(["vodacom", "airtel", "bank"]);
export type DisbursementChannel = (typeof DISBURSEMENT_CHANNELS)[number];

export const DISBURSEMENT_STATUSES = toEnum(["pending", "success", "failed", "escalated"]);
export type DisbursementStatus = (typeof DISBURSEMENT_STATUSES)[number];

export const PAYMENT_CHANNELS = toEnum(["api", "mobile_money", "bank", "cash"]);
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

export const PAYMENT_STATUSES = toEnum([
  "received",
  "pending_verification",
  "unmatched",
  "allocated",
  "confirmed",
  "reversed",
  "duplicate_flagged",
]);
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUSPENSE_STATUSES = toEnum(["unallocated", "allocated", "investigating"]);
export type SuspenseStatus = (typeof SUSPENSE_STATUSES)[number];

export const CASH_DEPOSIT_STATUSES = toEnum(["pending", "matched", "confirmed"]);
export type CashDepositStatus = (typeof CASH_DEPOSIT_STATUSES)[number];

export const TRIGGERED_BY = toEnum(["cron", "manual"]);
export type TriggeredBy = (typeof TRIGGERED_BY)[number];

export const ACCOUNT_TYPES = toEnum(["asset", "liability", "equity", "income", "expense", "control"]);
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const JOURNAL_SOURCE_TYPES = toEnum([
  "capital_injection",
  "loan_disbursement",
  "repayment",
  "suspense_resolution",
  "expense",
  "month_end_profit",
  "dividend",
  "payroll",
  "commission",
  "staff_loan",
  "staff_advance",
  "reversal",
]);
export type JournalSourceType = (typeof JOURNAL_SOURCE_TYPES)[number];

export const REVERSAL_STATUSES = toEnum(["pending", "approved", "rejected"]);
export type ReversalStatus = (typeof REVERSAL_STATUSES)[number];

export const STAFF_PAYMENT_METHODS = toEnum(["bank", "mobile"]);
export type StaffPaymentMethod = (typeof STAFF_PAYMENT_METHODS)[number];

export const EMPLOYMENT_STATUSES = toEnum(["active", "suspended", "terminated"]);
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

/**
 * `approved` sits between the draft and the posting.
 *
 * §16.1 of the HR document — "Salary haiwezi kubadilishwa baada ya approval" —
 * needs a moment for "after approval" to refer to, and the run had none: HR
 * generated a draft that could be regenerated at will and Finance posted it.
 * §16.7 gives the approval to HR; §16.8 gives the disbursement to Finance.
 */
export const PAYROLL_RUN_STATUSES = toEnum(["draft", "approved", "finalized", "paid"]);
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export const ALLOWANCE_TYPES = toEnum(["transport", "airtime", "bonus"]);
export type AllowanceType = (typeof ALLOWANCE_TYPES)[number];

export const DEDUCTION_TYPES = toEnum(["staff_fund", "loan", "advance", "penalty"]);
export type DeductionType = (typeof DEDUCTION_TYPES)[number];

/**
 * `active` and `closed` were the only two, and nothing in the system ever set
 * `closed` — so a staff loan never finished and payroll deducted against it
 * indefinitely. The lifecycle states are §16.7–16.8's, the same three an
 * advance already walked.
 */
export const STAFF_LOAN_STATUSES = toEnum([
  "requested",
  "approved",
  "active",
  "closed",
  "rejected",
]);
export type StaffLoanStatus = (typeof STAFF_LOAN_STATUSES)[number];

export const STAFF_ADVANCE_STATUSES = toEnum(["requested", "approved", "disbursed", "recovered", "rejected"]);
export type StaffAdvanceStatus = (typeof STAFF_ADVANCE_STATUSES)[number];

export const PERFORMANCE_RATINGS = toEnum(["A", "B", "C", "D"]);
export type PerformanceRating = (typeof PERFORMANCE_RATINGS)[number];

export const DPD_BUCKETS = toEnum(["on_time", "slight_delay", "risk", "default"]);
export type DpdBucket = (typeof DPD_BUCKETS)[number];

export const NOTIFICATION_CHANNELS = toEnum(["sms", "email"]);
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const FREEZABLE_TYPES = toEnum(["customer", "loan", "staff"]);
export type FreezableType = (typeof FREEZABLE_TYPES)[number];
