"use server";

import { revalidatePath } from "next/cache";
import { ReverseEntryInputSchema } from "@/types/ledger";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES, postEntry, MOCK_CAPITAL_CONTRIBUTIONS } from "@/lib/mock-data/journal-entries";
import { MOCK_REVERSAL_REQUESTS, MOCK_DIVIDENDS } from "@/lib/mock-data/reversals";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { round2 } from "@/lib/domain/money";
import { nextId } from "@/lib/domain/mock-store";
import { AUDIT_ACTIONS } from "@/types/audit";
import { SYSTEM_ACCOUNT_CODES } from "@/types/ledger";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";
import type { LedgerLineDraft } from "@/lib/domain/ledger";

async function requirePermission(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]): Promise<AuthenticatedUser | ActionResult> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permission)) return { ok: false, message: "You don't have permission to do that." };
  return user;
}
function isDenied(v: AuthenticatedUser | ActionResult): v is ActionResult {
  return "ok" in v;
}

function accountIdByCode(code: string): string {
  const account = CHART_OF_ACCOUNTS.find((a) => a.code === code);
  if (!account) throw new Error(`No chart account with code ${code}`);
  return account.id;
}

function logAudit(action: string, type: string, id: string, userId: string | null): void {
  MOCK_AUDIT_LOGS.push({
    id: nextId("audit"),
    userId,
    action,
    auditableType: type,
    auditableId: id,
    beforeJson: null,
    afterJson: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  });
}

function revalidateLedger() {
  revalidatePath("/ledger");
  revalidatePath("/ledger/accounts");
  revalidatePath("/ledger/reversals");
  revalidatePath("/treasury");
  revalidatePath("/treasury/capital");
  revalidatePath("/treasury/bank-accounts");
}

// ---------------------------------------------------------------------------
// Reversal — request and approval are different permissions (§14)
// ---------------------------------------------------------------------------

export async function requestReversal(journalEntryId: string, reason: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LEDGER_REVERSE_REQUEST);
  if (isDenied(actor)) return actor;

  const parsed = ReverseEntryInputSchema.safeParse({ journalEntryId, reason });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "A reason is required." };

  const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === journalEntryId);
  if (!entry) return { ok: false, message: "Journal entry not found." };
  if (entry.isReversal) return { ok: false, message: "A reversal entry can't itself be reversed." };
  if (MOCK_JOURNAL_ENTRIES.some((e) => e.reversedEntryId === journalEntryId)) {
    return { ok: false, message: "This entry has already been reversed." };
  }
  if (MOCK_REVERSAL_REQUESTS.some((r) => r.journalEntryId === journalEntryId && r.status === "pending")) {
    return { ok: false, message: "A reversal request for this entry is already pending." };
  }

  MOCK_REVERSAL_REQUESTS.push({
    id: nextId("rev"),
    journalEntryId,
    requestedBy: actor.id,
    reason: parsed.data.reason,
    approvedBy: null,
    status: "pending",
  });

  revalidateLedger();
  return { ok: true, message: "Reversal requested — awaiting approval." };
}

/**
 * Approving posts a NEW entry with debit/credit swapped and
 * `reversedEntryId` pointing at the original. The original's lines are never
 * touched — that immutability is what makes the ledger auditable (§5/§8).
 */
export async function approveReversal(reversalRequestId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LEDGER_REVERSE_APPROVE);
  if (isDenied(actor)) return actor;

  const request = MOCK_REVERSAL_REQUESTS.find((r) => r.id === reversalRequestId);
  if (!request) return { ok: false, message: "Reversal request not found." };
  if (request.status !== "pending") return { ok: false, message: "This request has already been decided." };
  // Separation of duties: the requester can never approve their own reversal.
  if (request.requestedBy === actor.id) {
    return { ok: false, message: "You can't approve a reversal you requested yourself." };
  }

  const original = MOCK_JOURNAL_ENTRIES.find((e) => e.id === request.journalEntryId);
  if (!original) return { ok: false, message: "Original entry not found." };

  const originalLines = MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.journalEntryId === original.id);
  const swapped: LedgerLineDraft[] = originalLines.map((l) => ({
    accountId: l.accountId,
    debit: l.creditAmount > 0 ? l.creditAmount : undefined,
    credit: l.debitAmount > 0 ? l.debitAmount : undefined,
    branchId: l.branchId,
    customerId: l.customerId,
    loanId: l.loanId,
    staffProfileId: l.staffProfileId,
  }));

  const reversalEntryId = postEntry({
    date: new Date().toISOString(),
    description: `Reversal of ${original.entryNumber} — ${request.reason}`,
    sourceType: "reversal",
    sourceId: original.id,
    createdBy: actor.id,
    lines: swapped,
  });

  const reversalEntry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === reversalEntryId);
  if (reversalEntry) {
    reversalEntry.isReversal = true;
    reversalEntry.reversedEntryId = original.id;
  }

  request.status = "approved";
  request.approvedBy = actor.id;
  logAudit(AUDIT_ACTIONS.LEDGER_ENTRY_REVERSED, "journal_entry", original.id, actor.id);

  revalidateLedger();
  return { ok: true, message: `Reversal posted as a new entry against ${original.entryNumber}.` };
}

export async function rejectReversal(reversalRequestId: string, reason: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.LEDGER_REVERSE_APPROVE);
  if (isDenied(actor)) return actor;
  if (!reason.trim()) return { ok: false, message: "A reason is required." };

  const request = MOCK_REVERSAL_REQUESTS.find((r) => r.id === reversalRequestId);
  if (!request) return { ok: false, message: "Reversal request not found." };
  if (request.status !== "pending") return { ok: false, message: "This request has already been decided." };

  request.status = "rejected";
  request.approvedBy = actor.id;
  revalidateLedger();
  return { ok: true, message: "Reversal request rejected." };
}

// ---------------------------------------------------------------------------
// Treasury
// ---------------------------------------------------------------------------

export async function recordCapitalContribution(contributorName: string, amount: number, bankAccountId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.TREASURY_MANAGE);
  if (isDenied(actor)) return actor;
  if (!contributorName.trim()) return { ok: false, message: "Contributor name is required." };
  if (amount <= 0) return { ok: false, message: "Amount must be greater than zero." };

  const bank = MOCK_BANK_ACCOUNTS.find((b) => b.id === bankAccountId && b.deletedAt === null);
  if (!bank) return { ok: false, message: "Bank account not found." };

  // Dr Bank / Cr Capital — backend §5.
  const entryId = postEntry({
    date: new Date().toISOString(),
    description: `Capital injection — ${contributorName}`,
    sourceType: "capital_injection",
    sourceId: null,
    createdBy: actor.id,
    lines: [
      { accountId: bank.chartAccountId, debit: amount },
      { accountId: accountIdByCode(SYSTEM_ACCOUNT_CODES.CAPITAL), credit: amount },
    ],
  });

  MOCK_CAPITAL_CONTRIBUTIONS.push({
    id: nextId("cap"),
    contributorName,
    amount,
    bankAccountId,
    journalEntryId: entryId,
    contributedAt: new Date().toISOString().slice(0, 10),
  });

  revalidateLedger();
  return { ok: true, message: `Capital injection of ${amount.toLocaleString()} recorded and posted.` };
}

/**
 * Dividend distribution — 70% reinvestment / 30% shareholders (§5).
 * Dr Profit Account / Cr Dividend Account, split across the two destinations.
 */
export async function distributeDividend(period: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.TREASURY_MANAGE);
  if (isDenied(actor)) return actor;
  if (!/^\d{4}-\d{2}$/.test(period)) return { ok: false, message: "Period must be in YYYY-MM format." };
  if (MOCK_DIVIDENDS.some((d) => d.period === period)) {
    return { ok: false, message: `A dividend for ${period} has already been distributed.` };
  }

  // Distributable profit is derived from the ledger, never stored separately.
  const trial = buildTrialBalance(CHART_OF_ACCOUNTS, MOCK_JOURNAL_ENTRY_LINES);
  const income = trial.rows.filter((r) => r.type === "income").reduce((s, r) => s + r.balance, 0);
  const expense = trial.rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.balance, 0);
  const totalProfit = round2(income - expense);

  if (totalProfit <= 0) {
    return { ok: false, message: `No distributable profit for ${period} — income does not exceed expenses.` };
  }

  const reinvestment = round2(totalProfit * 0.7);
  const shareholder = round2(totalProfit - reinvestment);

  const entryId = postEntry({
    date: new Date().toISOString(),
    description: `Dividend distribution — ${period}`,
    sourceType: "dividend",
    sourceId: null,
    createdBy: actor.id,
    lines: [
      { accountId: accountIdByCode(SYSTEM_ACCOUNT_CODES.PROFIT), debit: totalProfit },
      { accountId: accountIdByCode(SYSTEM_ACCOUNT_CODES.PRINCIPAL), credit: reinvestment },
      { accountId: accountIdByCode(SYSTEM_ACCOUNT_CODES.DIVIDEND), credit: shareholder },
    ],
  });

  MOCK_DIVIDENDS.push({
    id: nextId("div"),
    period,
    totalProfit,
    reinvestmentAmount: reinvestment,
    shareholderAmount: shareholder,
    journalEntryId: entryId,
    distributedAt: new Date().toISOString(),
  });

  revalidateLedger();
  return {
    ok: true,
    message: `Dividend for ${period}: ${reinvestment.toLocaleString()} reinvested, ${shareholder.toLocaleString()} to shareholders.`,
  };
}
