import "server-only";
import { round2 } from "@/lib/domain/money";
import type { LedgerEntry } from "@/lib/api/ledger";
import type { EntryRow } from "@/features/ledger/entries-table";

/**
 * An entry's magnitude is one side of its (always balanced) totals — the API
 * sends both, so this reads `totalDebits` rather than re-summing the lines.
 */
export function entryAmount(entry: LedgerEntry): number {
  return round2(entry.totalDebits);
}

/**
 * Whether an entry is a reversal, has been reversed, or stands as posted.
 *
 * "Reversed" needs to know that *some other* entry points back at this one, and
 * the entry resource does not carry that. The caller passes in the ids that
 * have been reversed — the list page has the whole book in hand, and the detail
 * page asks the reversals queue.
 */
export function entryState(entry: LedgerEntry, reversedIds: ReadonlySet<string>): "Posted" | "Reversal" | "Reversed" {
  if (entry.isReversal) return "Reversal";
  return reversedIds.has(entry.id) ? "Reversed" : "Posted";
}

/** Ids of entries that some later reversal entry points back at. */
export function reversedEntryIds(entries: readonly LedgerEntry[]): Set<string> {
  return new Set(entries.map((e) => e.reversedEntryId).filter((id): id is string => id !== null));
}

export function toEntryRow(entry: LedgerEntry, reversedIds: ReadonlySet<string> = new Set()): EntryRow {
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate,
    description: entry.description,
    sourceType: entry.sourceType,
    amount: entryAmount(entry),
    lineCount: entry.lines.length,
    state: entryState(entry, reversedIds),
  };
}
