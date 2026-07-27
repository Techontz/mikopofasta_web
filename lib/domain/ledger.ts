import { round2 } from "@/lib/domain/money";
import type { AccountType } from "@/types/enums";

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

