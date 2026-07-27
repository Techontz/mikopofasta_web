"use server";

import { revalidatePath } from "next/cache";
import { MOCK_PAYROLL_RUNS, MOCK_PAYROLL_LINES, MOCK_ALLOWANCES, MOCK_DEDUCTIONS } from "@/lib/mock-data/payroll";
import { MOCK_COMMISSION_DISTRIBUTIONS, ZONE_WEST_OVERRIDE_AMOUNT } from "@/lib/mock-data/commission";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/staff-profiles";
import { MOCK_STAFF_LOANS } from "@/lib/mock-data/staff-loans";
import { MOCK_STAFF_ADVANCES } from "@/lib/mock-data/staff-advances";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { postEntry } from "@/lib/mock-data/journal-entries";
import {
  SALARY_EXPENSE_ACCOUNT_ID,
  STAFF_PAYABLE_ACCOUNT_ID,
  COMMISSION_EXPENSE_ACCOUNT_ID,
  STAFF_LOAN_RECEIVABLE_ACCOUNT_ID,
  STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID,
  BANK_CHART_ACCOUNT_IDS,
  SYSTEM_ACCOUNTS,
} from "@/lib/mock-data/chart-of-accounts";
import { computePayrollLine, isBranchBasedRole } from "@/lib/domain/payroll-engine";
import { round2 } from "@/lib/domain/money";
import { nextId } from "@/lib/domain/mock-store";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";
import type { LedgerLineDraft } from "@/lib/domain/ledger";

const STAFF_FUND_ACCOUNT_ID = SYSTEM_ACCOUNTS.find((a) => a.name === "Staff Fund Account")!.id;

async function requirePermission(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]): Promise<AuthenticatedUser | ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return { ok: false, message: "You don't have permission to do that." };
  return user;
}
function isDenied(v: AuthenticatedUser | ActionResult): v is ActionResult {
  return "ok" in v;
}

function revalidateHr() {
  revalidatePath("/hr");
  revalidatePath("/hr/payroll");
  revalidatePath("/hr/commission");
  revalidatePath("/hr/staff-advances");
  revalidatePath("/hr/performance");
  revalidatePath("/ledger");
}

function commissionFor(staffProfileId: string, role: string): number {
  const share = MOCK_COMMISSION_DISTRIBUTIONS.filter((d) => d.staffProfileId === staffProfileId).reduce((s, d) => s + d.shareAmount, 0);
  const override = role === "zone_manager" ? ZONE_WEST_OVERRIDE_AMOUNT : 0;
  return round2(share + override);
}

// ---------------------------------------------------------------------------
// Payroll — HR generates (draft, no ledger), Finance finalizes (posts). §14
// ---------------------------------------------------------------------------

export async function generatePayroll(period: string): Promise<ActionResult & { runId?: string }> {
  const actor = await requirePermission(PERMISSIONS.PAYROLL_GENERATE);
  if (isDenied(actor)) return actor;
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, message: "Period must be in YYYY-MM format." };
  if (MOCK_PAYROLL_RUNS.some((r) => r.period === period)) {
    return { ok: false, message: `A payroll run for ${period} already exists.` };
  }

  const runId = nextId("payroll");
  MOCK_PAYROLL_RUNS.push({ id: runId, period, status: "draft", generatedBy: actor.id, finalizedAt: null });

  for (const staff of MOCK_STAFF_PROFILES.filter((s) => s.deletedAt === null && s.employmentStatus === "active")) {
    const user = MOCK_USERS.find((u) => u.id === staff.userId);
    if (!user) continue;

    const computation = computePayrollLine({
      staff,
      commissionAmount: staff.commissionEligible ? commissionFor(staff.id, user.role) : 0,
      isBranchBased: isBranchBasedRole(user.role, staff.branchId),
      hasActiveLoan: MOCK_STAFF_LOANS.some((l) => l.staffProfileId === staff.id && l.status === "active"),
      hasOutstandingAdvance: MOCK_STAFF_ADVANCES.some((a) => a.staffProfileId === staff.id && a.status === "disbursed"),
    });

    const lineId = nextId("pline");
    MOCK_PAYROLL_LINES.push({
      id: lineId,
      payrollRunId: runId,
      staffProfileId: staff.id,
      baseSalary: computation.baseSalary,
      commissionAmount: computation.commissionAmount,
      allowancesTotal: computation.allowancesTotal,
      deductionsTotal: computation.deductionsTotal,
      netSalary: computation.netSalary,
      // No ledger entry yet — a draft run has posted nothing.
      journalEntryId: null,
    });

    for (const a of computation.allowances) {
      MOCK_ALLOWANCES.push({ id: nextId("allow"), payrollLineId: lineId, type: a.type, amount: a.amount });
    }
    for (const d of computation.deductions) {
      const reference =
        d.type === "loan"
          ? (MOCK_STAFF_LOANS.find((l) => l.staffProfileId === staff.id && l.status === "active")?.id ?? null)
          : d.type === "advance"
            ? (MOCK_STAFF_ADVANCES.find((a) => a.staffProfileId === staff.id && a.status === "disbursed")?.id ?? null)
            : null;
      MOCK_DEDUCTIONS.push({ id: nextId("ded"), payrollLineId: lineId, type: d.type, amount: d.amount, referenceId: reference });
    }
  }

  revalidateHr();
  return { ok: true, message: `Draft payroll generated for ${period}. Finance must finalize it before anything posts.`, runId };
}

/** Finance-only — this is the step that actually posts to the ledger (§11/§14). */
export async function finalizePayroll(runId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PAYROLL_FINALIZE);
  if (isDenied(actor)) return actor;

  const run = MOCK_PAYROLL_RUNS.find((r) => r.id === runId);
  if (!run) return { ok: false, message: "Payroll run not found." };
  if (run.status !== "draft") return { ok: false, message: "Only a draft run can be finalized." };

  const lines = MOCK_PAYROLL_LINES.filter((l) => l.payrollRunId === runId);
  if (lines.length === 0) return { ok: false, message: "This run has no payroll lines." };

  for (const line of lines) {
    const staff = MOCK_STAFF_PROFILES.find((s) => s.id === line.staffProfileId);
    if (!staff) continue;
    const user = MOCK_USERS.find((u) => u.id === staff.userId);
    const name = user?.name ?? staff.employeeNumber;

    // Entry 1 — recognise the cost and what is owed to the employee.
    const recognitionLines: LedgerLineDraft[] = [
      { accountId: SALARY_EXPENSE_ACCOUNT_ID, debit: round2(line.baseSalary + line.allowancesTotal), staffProfileId: staff.id, branchId: staff.branchId },
      ...(line.commissionAmount > 0
        ? [{ accountId: COMMISSION_EXPENSE_ACCOUNT_ID, debit: line.commissionAmount, staffProfileId: staff.id, branchId: staff.branchId }]
        : []),
      {
        accountId: STAFF_PAYABLE_ACCOUNT_ID,
        credit: round2(line.baseSalary + line.allowancesTotal + line.commissionAmount),
        staffProfileId: staff.id,
        branchId: staff.branchId,
      },
    ];
    const recognitionEntryId = postEntry({
      date: new Date().toISOString(),
      description: `Payroll recognition — ${name} (${run.period})`,
      sourceType: "payroll",
      sourceId: runId,
      createdBy: actor.id,
      lines: recognitionLines,
    });

    // Entry 2 — deductions reduce what is owed, routed to their sub-ledgers.
    if (line.deductionsTotal > 0) {
      const deductions = MOCK_DEDUCTIONS.filter((d) => d.payrollLineId === line.id);
      const staffFund = round2(deductions.filter((d) => d.type === "staff_fund").reduce((s, d) => s + d.amount, 0));
      const loanRecovery = round2(deductions.filter((d) => d.type === "loan").reduce((s, d) => s + d.amount, 0));
      const advanceRecovery = round2(deductions.filter((d) => d.type === "advance").reduce((s, d) => s + d.amount, 0));

      postEntry({
        date: new Date().toISOString(),
        description: `Payroll deductions — ${name} (${run.period})`,
        sourceType: "payroll",
        sourceId: runId,
        createdBy: actor.id,
        lines: [
          { accountId: STAFF_PAYABLE_ACCOUNT_ID, debit: line.deductionsTotal, staffProfileId: staff.id, branchId: staff.branchId },
          ...(staffFund > 0 ? [{ accountId: STAFF_FUND_ACCOUNT_ID, credit: staffFund, staffProfileId: staff.id }] : []),
          ...(loanRecovery > 0 ? [{ accountId: STAFF_LOAN_RECEIVABLE_ACCOUNT_ID, credit: loanRecovery, staffProfileId: staff.id }] : []),
          ...(advanceRecovery > 0 ? [{ accountId: STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, credit: advanceRecovery, staffProfileId: staff.id }] : []),
        ],
      });
    }

    line.journalEntryId = recognitionEntryId;
  }

  run.status = "finalized";
  run.finalizedAt = new Date().toISOString();

  revalidateHr();
  return { ok: true, message: `Payroll ${run.period} finalized and posted — ${lines.length} staff.` };
}

/** Executing payment is also Finance: Dr Staff Payable / Cr Bank (§11). */
export async function payPayroll(runId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PAYROLL_FINALIZE);
  if (isDenied(actor)) return actor;

  const run = MOCK_PAYROLL_RUNS.find((r) => r.id === runId);
  if (!run) return { ok: false, message: "Payroll run not found." };
  if (run.status !== "finalized") return { ok: false, message: "Only a finalized run can be paid." };

  const lines = MOCK_PAYROLL_LINES.filter((l) => l.payrollRunId === runId);
  for (const line of lines) {
    const staff = MOCK_STAFF_PROFILES.find((s) => s.id === line.staffProfileId);
    if (!staff || line.netSalary <= 0) continue;
    const name = MOCK_USERS.find((u) => u.id === staff.userId)?.name ?? staff.employeeNumber;
    postEntry({
      date: new Date().toISOString(),
      description: `Salary payment — ${name} (${run.period})`,
      sourceType: "payroll",
      sourceId: runId,
      createdBy: actor.id,
      lines: [
        { accountId: STAFF_PAYABLE_ACCOUNT_ID, debit: line.netSalary, staffProfileId: staff.id, branchId: staff.branchId },
        { accountId: BANK_CHART_ACCOUNT_IDS.NMB, credit: line.netSalary, staffProfileId: staff.id },
      ],
    });
  }

  run.status = "paid";
  revalidateHr();
  return { ok: true, message: `Payroll ${run.period} paid out to ${lines.length} staff.` };
}

// ---------------------------------------------------------------------------
// Staff advances — HR approves, Finance disburses (never HR). §11
// ---------------------------------------------------------------------------

export async function requestStaffAdvance(staffProfileId: string, amount: number): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MANAGE);
  if (isDenied(actor)) return actor;
  if (amount <= 0) return { ok: false, message: "Amount must be greater than zero." };

  const staff = MOCK_STAFF_PROFILES.find((s) => s.id === staffProfileId);
  if (!staff) return { ok: false, message: "Staff member not found." };
  if (MOCK_STAFF_ADVANCES.some((a) => a.staffProfileId === staffProfileId && ["requested", "approved", "disbursed"].includes(a.status))) {
    return { ok: false, message: "This staff member already has an advance in progress." };
  }

  MOCK_STAFF_ADVANCES.push({
    id: nextId("adv"),
    staffProfileId,
    amount,
    status: "requested",
    requestedAt: new Date().toISOString(),
    approvedBy: null,
    approvedAt: null,
    disbursedAt: null,
    journalEntryId: null,
  });

  revalidateHr();
  return { ok: true, message: "Advance requested — awaiting HR approval." };
}

export async function decideStaffAdvance(advanceId: string, approve: boolean): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MANAGE);
  if (isDenied(actor)) return actor;

  const advance = MOCK_STAFF_ADVANCES.find((a) => a.id === advanceId);
  if (!advance) return { ok: false, message: "Advance not found." };
  if (advance.status !== "requested") return { ok: false, message: "This advance is not awaiting a decision." };

  advance.status = approve ? "approved" : "rejected";
  advance.approvedBy = actor.id;
  advance.approvedAt = new Date().toISOString();

  revalidateHr();
  return { ok: true, message: approve ? "Advance approved — Finance will disburse it." : "Advance rejected." };
}

/**
 * Finance-only. §11 is explicit that disbursement is never HR's to execute,
 * so this checks PAYROLL_FINALIZE (the Finance money-movement grant) rather
 * than HR_MANAGE.
 */
export async function disburseStaffAdvance(advanceId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PAYROLL_FINALIZE);
  if (isDenied(actor)) return actor;

  const advance = MOCK_STAFF_ADVANCES.find((a) => a.id === advanceId);
  if (!advance) return { ok: false, message: "Advance not found." };
  if (advance.status !== "approved") return { ok: false, message: "Only an approved advance can be disbursed." };

  const entryId = postEntry({
    date: new Date().toISOString(),
    description: `Staff salary advance — ${advance.staffProfileId}`,
    sourceType: "staff_advance",
    sourceId: advance.id,
    createdBy: actor.id,
    lines: [
      { accountId: STAFF_ADVANCE_RECEIVABLE_ACCOUNT_ID, debit: advance.amount, staffProfileId: advance.staffProfileId },
      { accountId: STAFF_FUND_ACCOUNT_ID, credit: advance.amount, staffProfileId: advance.staffProfileId },
    ],
  });

  advance.status = "disbursed";
  advance.disbursedAt = new Date().toISOString();
  advance.journalEntryId = entryId;

  revalidateHr();
  return { ok: true, message: "Advance disbursed — it will be recovered automatically from payroll." };
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------


