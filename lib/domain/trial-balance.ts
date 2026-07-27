import { round2 } from "@/lib/domain/money";
import { netBalance } from "@/lib/domain/ledger";
import type { ChartOfAccount, JournalEntryLine } from "@/types/ledger";
import type { AccountType } from "@/types/enums";

export interface AccountBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
  branchId: string | null;
  debitTotal: number;
  creditTotal: number;
  /** Signed by the account's normal side — debit-normal shows Dr−Cr, the rest Cr−Dr. */
  balance: number;
}

export interface TrialBalance {
  rows: AccountBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}

/**
 * Derived read-model — `account_balances` in the backend is explicitly a
 * materialized cache rebuilt from `journal_entry_lines` (§2.7), never an
 * independent source of truth. Computing it here keeps that property.
 */
export function buildTrialBalance(
  accounts: ChartOfAccount[],
  lines: JournalEntryLine[],
  filter?: { branchId?: string | null }
): TrialBalance {
  const scoped = filter?.branchId ? lines.filter((l) => l.branchId === filter.branchId) : lines;

  const totals = new Map<string, { debit: number; credit: number }>();
  for (const line of scoped) {
    const entry = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
    entry.debit += line.debitAmount;
    entry.credit += line.creditAmount;
    totals.set(line.accountId, entry);
  }

  const rows: AccountBalanceRow[] = accounts
    .filter((a) => a.deletedAt === null)
    .map((account) => {
      const t = totals.get(account.id) ?? { debit: 0, credit: 0 };
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        isSystem: account.isSystem,
        branchId: account.branchId,
        debitTotal: round2(t.debit),
        creditTotal: round2(t.credit),
        balance: netBalance(account.type, t.debit, t.credit),
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const totalDebits = round2(rows.reduce((s, r) => s + r.debitTotal, 0));
  const totalCredits = round2(rows.reduce((s, r) => s + r.creditTotal, 0));

  return { rows, totalDebits, totalCredits, balanced: Math.abs(totalDebits - totalCredits) < 0.01 };
}

/**
 * Running balance down an account's own lines, oldest first — what the
 * account-detail screen shows. Uses the account's normal side so the running
 * figure reads the way an accountant expects.
 */
export interface LedgerLineRow {
  id: string;
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  isReversal: boolean;
}

export function buildAccountLedger(
  account: ChartOfAccount,
  lines: JournalEntryLine[],
  entryOf: (id: string) => { entryNumber: string; entryDate: string; description: string; postedAt: string; isReversal: boolean } | undefined
): LedgerLineRow[] {
  const rows = lines
    .filter((l) => l.accountId === account.id)
    .map((l) => ({ line: l, entry: entryOf(l.journalEntryId) }))
    .filter((x) => x.entry !== undefined)
    .sort((a, b) => new Date(a.entry!.postedAt).getTime() - new Date(b.entry!.postedAt).getTime());

  let running = 0;
  return rows.map(({ line, entry }) => {
    running = round2(running + netBalance(account.type, line.debitAmount, line.creditAmount));
    return {
      id: line.id,
      entryId: line.journalEntryId,
      entryNumber: entry!.entryNumber,
      entryDate: entry!.entryDate,
      description: entry!.description,
      debit: line.debitAmount,
      credit: line.creditAmount,
      runningBalance: running,
      isReversal: entry!.isReversal,
    };
  });
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "Asset",
  liability: "Liability",
  equity: "Equity",
  income: "Income",
  expense: "Expense",
  control: "Control",
};
