"use server";

import { revalidatePath } from "next/cache";
import { MOCK_JOURNAL_ENTRY_LINES, postEntry, MOCK_CAPITAL_CONTRIBUTIONS } from "@/lib/mock-data/journal-entries";
import { MOCK_DIVIDENDS } from "@/lib/mock-data/reversals";
import { MOCK_BANK_ACCOUNTS } from "@/lib/mock-data/bank-accounts";
import { CHART_OF_ACCOUNTS } from "@/lib/mock-data/chart-of-accounts";
import { buildTrialBalance } from "@/lib/domain/trial-balance";
import { round2 } from "@/lib/domain/money";
import { nextId } from "@/lib/domain/mock-store";
import { SYSTEM_ACCOUNT_CODES } from "@/types/ledger";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS, type AuthenticatedUser } from "@/types/auth";
import type { ActionResult } from "@/lib/domain/action-result";

/**
 * Capital injection and dividend distribution — STILL ON MOCK DATA, deliberately.
 *
 * Module 6 moved the ledger onto the real API, but these two have nowhere to
 * go: the backend exposes no treasury routes at all — no capital endpoint, no
 * dividend endpoint, no bank-account registry — even though `treasury.view`
 * and `treasury.manage` exist as permissions. Rather than delete two working
 * screens or leave buttons that 404, the original mock implementation is kept
 * here verbatim, isolated so the boundary is obvious.
 *
 * Consequence worth knowing: these post to the *mock* journal, which is now a
 * different book from the one /ledger reads. Money moved here does not appear
 * in the real trial balance. Expect this file to be deleted whole once the
 * treasury endpoints exist.
 */

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

function revalidateTreasury() {
  revalidatePath("/treasury");
  revalidatePath("/treasury/capital");
  revalidatePath("/treasury/bank-accounts");
}

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

  revalidateTreasury();
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

  revalidateTreasury();
  return {
    ok: true,
    message: `Dividend for ${period}: ${reinvestment.toLocaleString()} reinvested, ${shareholder.toLocaleString()} to shareholders.`,
  };
}
