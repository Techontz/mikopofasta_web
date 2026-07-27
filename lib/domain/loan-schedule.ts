import { round2 } from "@/lib/domain/money";
import type { InterestFormulaCode } from "@/types/enums";
import type { LoanSchedule } from "@/types/loan";

export interface GenerateScheduleParams {
  loanId: string;
  principalAmount: number;
  interestRate: number; // percent, meaning depends on formula (see below)
  tenureDays: number;
  frequencyDays: number;
  interestFormulaCode: InterestFormulaCode;
  startDate: Date;
}

/**
 * Produces the installment plan for a loan. Three formulas, matching the
 * legacy system's "Simple / Flat Rate / Reducing" options
 * (docs/backend-architecture-specification.md §5, §6):
 *
 * - SIMPLE:   total interest = principal * rate%, spread evenly across all
 *             installments alongside equal principal.
 * - FLAT:     rate% is charged per installment on the ORIGINAL principal
 *             (classic flat-rate microfinance loan — interest doesn't
 *             shrink as principal is paid down).
 * - REDUCING: rate% is charged per installment on the OUTSTANDING balance
 *             (declining balance), with equal principal amortization.
 *
 * These are the domain layer's own documented assumptions where the
 * business docs described the three formula names but not their exact
 * math — reasonable defaults, not a claim of the one true formula.
 */
export function generateLoanSchedule(params: GenerateScheduleParams): Omit<LoanSchedule, "id">[] {
  const { principalAmount, interestRate, tenureDays, frequencyDays, interestFormulaCode, startDate } = params;
  const installmentCount = Math.max(1, Math.round(tenureDays / frequencyDays));
  const rate = interestRate / 100;
  const schedule: Omit<LoanSchedule, "id">[] = [];

  if (interestFormulaCode === "REDUCING") {
    let outstanding = principalAmount;
    const principalPerInstallment = round2(principalAmount / installmentCount);
    for (let i = 1; i <= installmentCount; i++) {
      const isLast = i === installmentCount;
      const principalDue = isLast ? round2(outstanding) : principalPerInstallment;
      const interestDue = round2(outstanding * rate);
      outstanding = round2(outstanding - principalDue);
      schedule.push(makeInstallment(params.loanId, i, dueDate(startDate, frequencyDays, i), principalDue, interestDue));
    }
    return schedule;
  }

  // SIMPLE and FLAT both charge a flat interest per installment; they only
  // differ in how `interestRate` is meant to be read by the admin (total
  // vs per-period) — the resulting schedule shape is the same shape here.
  const principalPerInstallment = round2(principalAmount / installmentCount);
  const interestPerInstallment =
    interestFormulaCode === "SIMPLE"
      ? round2((principalAmount * rate) / installmentCount)
      : round2(principalAmount * rate);

  let allocatedPrincipal = 0;
  for (let i = 1; i <= installmentCount; i++) {
    const isLast = i === installmentCount;
    const principalDue = isLast ? round2(principalAmount - allocatedPrincipal) : principalPerInstallment;
    allocatedPrincipal = round2(allocatedPrincipal + principalDue);
    schedule.push(makeInstallment(params.loanId, i, dueDate(startDate, frequencyDays, i), principalDue, interestPerInstallment));
  }
  return schedule;
}

function makeInstallment(
  loanId: string,
  installmentNumber: number,
  due: string,
  principalDue: number,
  interestDue: number
): Omit<LoanSchedule, "id"> {
  return {
    loanId,
    installmentNumber,
    dueDate: due,
    principalDue,
    interestDue,
    penaltyDue: 0,
    principalPaid: 0,
    interestPaid: 0,
    penaltyPaid: 0,
    status: "pending",
  };
}

function dueDate(start: Date, frequencyDays: number, installmentNumber: number): string {
  const d = new Date(start);
  d.setDate(d.getDate() + frequencyDays * installmentNumber);
  return d.toISOString().slice(0, 10);
}
