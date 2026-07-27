import type { Loan, LoanStatusHistory, LoanSchedule, EMandate, TelcoVerification, DisbursementBatch } from "@/types/loan";
import type { LoanStatus } from "@/types/enums";
import { generateLoanSchedule } from "@/lib/domain/loan-schedule";
import { loanNumber, disbursementBatchReference } from "@/lib/domain/id-generators";
import { dateOnlyDaysAgo, daysAgo } from "@/lib/domain/rng";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_LOAN_PRODUCTS } from "@/lib/mock-data/loan-products";
import { MOCK_INTEREST_FORMULAS } from "@/lib/mock-data/interest-formulas";

const completed = (categoryId: string) => MOCK_CUSTOMERS.filter((c) => c.customerCategoryId === categoryId && c.kycStatus === "completed");

function productOf(id: string) {
  const p = MOCK_LOAN_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown loan product ${id}`);
  return p;
}
function formulaCodeOf(loanProductId: string) {
  const product = productOf(loanProductId);
  const formula = MOCK_INTEREST_FORMULAS.find((f) => f.id === product.interestFormulaId);
  if (!formula) throw new Error(`Unknown interest formula for ${loanProductId}`);
  return formula.code;
}

interface LoanSpec {
  customerId: string;
  productId: string;
  branchId: string;
  principal: number;
  tenureDays: number;
  scheduleId: string;
  status: LoanStatus;
  disbursedDaysAgo?: number; // only for loans that reached 'active' or later
  rejectedReason?: string;
  requiresMandate: boolean;
}

const bodaCustomers = completed("cat-boda-boda");
const smallEntCustomers = completed("cat-small-entrepreneur");
const mediumEntCustomers = completed("cat-medium-entrepreneur");
const publicServants = completed("cat-public-servant");
const privateSector = completed("cat-private-sector");
const students = completed("cat-student");

function c(pool: typeof bodaCustomers, i: number): string {
  return pool[i % pool.length].id;
}

const SPECS: LoanSpec[] = [
  // Non-disbursed lifecycle stages — one loan sitting in each stage.
  { customerId: c(bodaCustomers, 0), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 300_000, tenureDays: 90, scheduleId: "rs-weekly", status: "draft", requiresMandate: false },
  { customerId: c(bodaCustomers, 1), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 400_000, tenureDays: 90, scheduleId: "rs-weekly", status: "pending_manager_approval", requiresMandate: false },
  { customerId: c(smallEntCustomers, 0), productId: "prod-entrepreneur-growth", branchId: "br-missenyi", principal: 800_000, tenureDays: 180, scheduleId: "rs-monthly", status: "rejected", rejectedReason: "Insufficient collateral documentation", requiresMandate: false },
  { customerId: c(publicServants, 0), productId: "prod-salary-advance", branchId: "br-lindi", principal: 500_000, tenureDays: 180, scheduleId: "rs-monthly", status: "mandate_pending_otp", requiresMandate: true },
  { customerId: c(publicServants, 1), productId: "prod-salary-advance", branchId: "br-lindi", principal: 600_000, tenureDays: 180, scheduleId: "rs-monthly", status: "mandate_failed", requiresMandate: true },
  { customerId: c(smallEntCustomers, 1), productId: "prod-entrepreneur-growth", branchId: "br-kakonko", principal: 1_200_000, tenureDays: 270, scheduleId: "rs-monthly", status: "pending_credit_review", requiresMandate: false },
  { customerId: c(privateSector, 0), productId: "prod-public-servant-loan", branchId: "br-missenyi", principal: 2_000_000, tenureDays: 365, scheduleId: "rs-monthly", status: "pending_finance", requiresMandate: true },
  { customerId: c(bodaCustomers, 2), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 500_000, tenureDays: 120, scheduleId: "rs-weekly", status: "awaiting_disbursement", requiresMandate: false },
  { customerId: c(mediumEntCustomers, 0), productId: "prod-entrepreneur-growth", branchId: "br-lindi", principal: 3_000_000, tenureDays: 365, scheduleId: "rs-monthly", status: "disbursement_failed", requiresMandate: false },
  { customerId: c(publicServants, 2), productId: "prod-public-servant-loan", branchId: "br-missenyi", principal: 1_500_000, tenureDays: 365, scheduleId: "rs-monthly", status: "escalated", requiresMandate: true },

  // Active book — a healthy spread across branches/products.
  { customerId: c(bodaCustomers, 3), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 400_000, tenureDays: 90, scheduleId: "rs-weekly", status: "active", disbursedDaysAgo: 60, requiresMandate: false },
  { customerId: c(bodaCustomers, 4), productId: "prod-boda-working-capital", branchId: "br-kalenge", principal: 350_000, tenureDays: 90, scheduleId: "rs-weekly", status: "active", disbursedDaysAgo: 45, requiresMandate: false },
  { customerId: c(smallEntCustomers, 2), productId: "prod-entrepreneur-growth", branchId: "br-missenyi", principal: 1_000_000, tenureDays: 180, scheduleId: "rs-monthly", status: "active", disbursedDaysAgo: 90, requiresMandate: false },
  { customerId: c(publicServants, 3), productId: "prod-salary-advance", branchId: "br-lindi", principal: 700_000, tenureDays: 180, scheduleId: "rs-monthly", status: "active", disbursedDaysAgo: 30, requiresMandate: true },
  { customerId: c(privateSector, 1), productId: "prod-public-servant-loan", branchId: "br-missenyi", principal: 2_500_000, tenureDays: 365, scheduleId: "rs-monthly", status: "active", disbursedDaysAgo: 120, requiresMandate: true },
  { customerId: c(students, 0), productId: "prod-group-daily", branchId: "br-lindi", principal: 150_000, tenureDays: 60, scheduleId: "rs-daily", status: "active", disbursedDaysAgo: 20, requiresMandate: false },

  // Arrears / risk book.
  { customerId: c(bodaCustomers, 5), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 450_000, tenureDays: 90, scheduleId: "rs-weekly", status: "arrears", disbursedDaysAgo: 100, requiresMandate: false },
  { customerId: c(mediumEntCustomers, 1), productId: "prod-entrepreneur-growth", branchId: "br-lindi", principal: 2_000_000, tenureDays: 270, scheduleId: "rs-monthly", status: "arrears", disbursedDaysAgo: 150, requiresMandate: false },

  // Terminal states.
  { customerId: c(bodaCustomers, 6), productId: "prod-boda-working-capital", branchId: "br-kakonko", principal: 300_000, tenureDays: 90, scheduleId: "rs-weekly", status: "defaulted", disbursedDaysAgo: 200, requiresMandate: false },
  { customerId: c(smallEntCustomers, 3), productId: "prod-entrepreneur-growth", branchId: "br-missenyi", principal: 900_000, tenureDays: 180, scheduleId: "rs-monthly", status: "written_off", disbursedDaysAgo: 300, requiresMandate: false },
  { customerId: c(bodaCustomers, 7), productId: "prod-boda-working-capital", branchId: "br-kalenge", principal: 250_000, tenureDays: 60, scheduleId: "rs-weekly", status: "recovered", disbursedDaysAgo: 250, requiresMandate: false },
  { customerId: c(publicServants, 4), productId: "prod-salary-advance", branchId: "br-lindi", principal: 400_000, tenureDays: 90, scheduleId: "rs-monthly", status: "closed", disbursedDaysAgo: 180, requiresMandate: true },
];

const SCHEDULE_FREQUENCY: Record<string, number> = { "rs-daily": 1, "rs-weekly": 7, "rs-monthly": 30, "rs-group": 7 };

export const MOCK_LOANS: Loan[] = [];
export const MOCK_RAW_LOAN_SCHEDULES: LoanSchedule[] = [];
export const MOCK_LOAN_STATUS_HISTORY: LoanStatusHistory[] = [];
export const MOCK_E_MANDATES: EMandate[] = [];
export const MOCK_TELCO_VERIFICATIONS: TelcoVerification[] = [];
export const MOCK_DISBURSEMENT_BATCHES: DisbursementBatch[] = [];

const NON_SCHEDULED_STATUSES: LoanStatus[] = ["draft", "pending_manager_approval", "rejected", "cancelled"];

SPECS.forEach((spec, index) => {
  const seq = index + 1;
  const loanId = `loan-${seq}`;
  const product = productOf(spec.productId);
  const now = new Date();
  const disbursedAt = spec.disbursedDaysAgo !== undefined ? daysAgo(spec.disbursedDaysAgo, now) : null;
  const approvedAt = spec.status === "draft" || spec.status === "pending_manager_approval" ? null : dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 5, now);

  MOCK_LOANS.push({
    id: loanId,
    loanNumber: loanNumber(seq),
    customerId: spec.customerId,
    loanProductId: spec.productId,
    repaymentScheduleId: spec.scheduleId,
    groupId: null,
    branchId: spec.branchId,
    officerId: "u-loan-officer",
    principalAmount: spec.principal,
    interestRateSnapshot: product.interestRate,
    penaltyRateSnapshot: product.penaltyRate,
    tenureDays: spec.tenureDays,
    requiresMandateSnapshot: spec.requiresMandate,
    status: spec.status,
    disbursementDate: disbursedAt ? disbursedAt.slice(0, 10) : null,
    expectedCompletionDate: disbursedAt ? dateOnlyDaysAgo(-spec.tenureDays, new Date(disbursedAt)) : null,
    approvedBy: spec.status === "draft" || spec.status === "pending_manager_approval" ? null : "u-branch-manager",
    approvedAt,
    rejectedReason: spec.rejectedReason ?? null,
    closedAt: spec.status === "closed" ? dateOnlyDaysAgo(5, now) : null,
    frozenUntil: spec.status === "closed" ? dateOnlyDaysAgo(-30, now) : null,
    createdBy: "u-loan-officer",
    deletedAt: null,
  });

  // Status history: always application, then whatever this loan's current stage implies.
  MOCK_LOAN_STATUS_HISTORY.push({
    id: `lsh-${loanId}-1`,
    loanId,
    fromStatus: null,
    toStatus: "draft",
    changedBy: "u-loan-officer",
    reason: null,
    createdAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 10, now),
  });
  if (spec.status !== "draft") {
    MOCK_LOAN_STATUS_HISTORY.push({
      id: `lsh-${loanId}-2`,
      loanId,
      fromStatus: "draft",
      toStatus: spec.status === "pending_manager_approval" ? "pending_manager_approval" : "pending_manager_approval",
      changedBy: "u-loan-officer",
      reason: null,
      createdAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 9, now),
    });
  }
  if (spec.status === "rejected") {
    MOCK_LOAN_STATUS_HISTORY.push({
      id: `lsh-${loanId}-3`,
      loanId,
      fromStatus: "pending_manager_approval",
      toStatus: "rejected",
      changedBy: "u-branch-manager",
      reason: spec.rejectedReason ?? null,
      createdAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 8, now),
    });
  }

  // E-Mandate + Telco verification, where the product requires it.
  if (spec.requiresMandate && spec.status !== "draft" && spec.status !== "pending_manager_approval" && spec.status !== "rejected") {
    MOCK_E_MANDATES.push({
      id: `em-${loanId}`,
      loanId,
      bankName: "NMB",
      otpReference: spec.status === "mandate_pending_otp" ? "OTP-PENDING" : null,
      status: spec.status === "mandate_pending_otp" ? "pending_otp" : spec.status === "mandate_failed" ? "failed" : "active",
      failureReason: spec.status === "mandate_failed" ? "Incorrect OTP entered 3 times" : null,
      verifiedAt: spec.status === "mandate_pending_otp" || spec.status === "mandate_failed" ? null : dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 6, now),
    });
  }
  if (!NON_SCHEDULED_STATUSES.includes(spec.status) && spec.status !== "mandate_pending_otp" && spec.status !== "mandate_failed") {
    MOCK_TELCO_VERIFICATIONS.push({
      id: `tv-${loanId}`,
      loanId,
      provider: "vodacom",
      requestPayload: { msisdn: "2557XXXXXXXX" },
      responsePayload: { match: true },
      status: "success",
      verifiedAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 4, now),
    });
  }

  // Disbursement batches: escalated shows the full 3-attempt failure story; disbursement_failed shows attempt 1 failing.
  if (spec.status === "escalated") {
    for (let attempt = 1; attempt <= 3; attempt++) {
      MOCK_DISBURSEMENT_BATCHES.push({
        id: `db-${loanId}-${attempt}`,
        loanId,
        batchReference: disbursementBatchReference(seq, attempt),
        attemptNumber: attempt,
        channel: "vodacom",
        status: "failed",
        failureReason: "Insufficient float on provider side",
        requestedBy: "u-finance",
        requestedAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 3 - attempt, now),
        completedAt: dateOnlyDaysAgo((spec.disbursedDaysAgo ?? 10) + 2 - attempt, now),
      });
    }
  } else if (spec.status === "disbursement_failed") {
    MOCK_DISBURSEMENT_BATCHES.push({
      id: `db-${loanId}-1`,
      loanId,
      batchReference: disbursementBatchReference(seq, 1),
      attemptNumber: 1,
      channel: "vodacom",
      status: "failed",
      failureReason: "Network timeout",
      requestedBy: "u-finance",
      requestedAt: dateOnlyDaysAgo(2, now),
      completedAt: dateOnlyDaysAgo(2, now),
    });
  } else if (disbursedAt !== null) {
    MOCK_DISBURSEMENT_BATCHES.push({
      id: `db-${loanId}-1`,
      loanId,
      batchReference: disbursementBatchReference(seq, 1),
      attemptNumber: 1,
      channel: "vodacom",
      status: "success",
      failureReason: null,
      requestedBy: "u-finance",
      requestedAt: disbursedAt,
      completedAt: disbursedAt,
    });
  }

  // Schedules: generated for everything past the manager-approval gate.
  if (!NON_SCHEDULED_STATUSES.includes(spec.status)) {
    const raw = generateLoanSchedule({
      loanId,
      principalAmount: spec.principal,
      interestRate: product.interestRate,
      tenureDays: spec.tenureDays,
      frequencyDays: SCHEDULE_FREQUENCY[spec.scheduleId],
      interestFormulaCode: formulaCodeOf(spec.productId),
      startDate: disbursedAt ? new Date(disbursedAt) : now,
    });
    raw.forEach((installment, i) => MOCK_RAW_LOAN_SCHEDULES.push({ ...installment, id: `sched-${loanId}-${i + 1}` }));
  }
});
