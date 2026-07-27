import "server-only";
import { round2 } from "@/lib/domain/money";
import { MOCK_JOURNAL_ENTRIES, MOCK_JOURNAL_ENTRY_LINES } from "@/lib/mock-data/journal-entries";
import type { EntryRow } from "@/features/ledger/entries-table";
import type { JournalEntry } from "@/types/ledger";

/** An entry's magnitude is one side of its (always balanced) totals. */
export function entryAmount(entryId: string): number {
  return round2(MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.journalEntryId === entryId).reduce((s, l) => s + l.debitAmount, 0));
}

export function entryState(entry: JournalEntry): "Posted" | "Reversal" | "Reversed" {
  if (entry.isReversal) return "Reversal";
  return MOCK_JOURNAL_ENTRIES.some((e) => e.reversedEntryId === entry.id) ? "Reversed" : "Posted";
}

export function toEntryRow(entry: JournalEntry): EntryRow {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate,
    description: entry.description,
    sourceType: entry.sourceType,
    amount: entryAmount(entry.id),
    lineCount: MOCK_JOURNAL_ENTRY_LINES.filter((l) => l.journalEntryId === entry.id).length,
    state: entryState(entry),
  };
}
