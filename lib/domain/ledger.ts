import { round2 } from "@/lib/domain/money";
import type { AccountType } from "@/types/enums";
import type { JournalEntryLine } from "@/types/ledger";

export interface LedgerLineDraft {
  accountId: string;
  debit?: number;
  credit?: number;
  branchId?: string | null;
  customerId?: string | null;
  loanId?: string | null;
  staffProfileId?: string | null;
}

/**
 * The single gateway every seed/mutation path uses to post money movement —
 * mirrors the backend's `LedgerService::post()` being the only code path
 * allowed to write journal_entries/journal_entry_lines (backend §5/§8).
 * Throws rather than silently accepting an unbalanced entry.
 */
export function assertBalanced(lines: LedgerLineDraft[], context: string): void {
  const debit = round2(lines.reduce((sum, l) => sum + (l.debit ?? 0), 0));
  const credit = round2(lines.reduce((sum, l) => sum + (l.credit ?? 0), 0));
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`Unbalanced journal entry [${context}]: debit=${debit} credit=${credit}`);
  }
  if (lines.length < 2) {
    throw new Error(`Journal entry [${context}] needs at least 2 lines, got ${lines.length}`);
  }
}

/** Debit-normal account types show debit-credit as a positive balance; the rest show credit-debit. */
const DEBIT_NORMAL: AccountType[] = ["asset", "expense"];

export function netBalance(type: AccountType, debitTotal: number, creditTotal: number): number {
  return DEBIT_NORMAL.includes(type) ? round2(debitTotal - creditTotal) : round2(creditTotal - debitTotal);
}

/** Aggregates journalEntryLines into a per-account (optionally per-branch) balance map. */
export function computeBalances(
  lines: Pick<JournalEntryLine, "accountId" | "debitAmount" | "creditAmount" | "branchId">[],
  accountTypeOf: (accountId: string) => AccountType,
  scopeByBranch = false
): Map<string, number> {
  const totals = new Map<string, { debit: number; credit: number }>();
  for (const line of lines) {
    const key = scopeByBranch ? `${line.accountId}:${line.branchId ?? ""}` : line.accountId;
    const entry = totals.get(key) ?? { debit: 0, credit: 0 };
    entry.debit += line.debitAmount;
    entry.credit += line.creditAmount;
    totals.set(key, entry);
  }
  const balances = new Map<string, number>();
  for (const [key, { debit, credit }] of totals) {
    const accountId = scopeByBranch ? key.split(":")[0] : key;
    balances.set(key, netBalance(accountTypeOf(accountId), debit, credit));
  }
  return balances;
}
