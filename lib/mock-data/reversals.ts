import type { ReversalRequest } from "@/types/ledger";
import type { Dividend } from "@/types/treasury";
import { MOCK_JOURNAL_ENTRIES } from "@/lib/mock-data/journal-entries";

/**
 * Reversal is request → approve, held by different roles (backend §14) — a
 * Branch Manager can request, only Finance/Super Admin approve. Seeded with
 * one pending request so the approval queue is demonstrable.
 */
const repaymentEntry = MOCK_JOURNAL_ENTRIES.find((e) => e.sourceType === "repayment");

export const MOCK_REVERSAL_REQUESTS: ReversalRequest[] = repaymentEntry
  ? [
      {
        id: "rev-1",
        journalEntryId: repaymentEntry.id,
        requestedBy: "u-branch-manager",
        reason: "Payment was credited to the wrong loan — customer confirmed by phone.",
        approvedBy: null,
        status: "pending",
      },
    ]
  : [];

/** No dividend has been distributed yet — the first one is created from the UI. */
export const MOCK_DIVIDENDS: Dividend[] = [];
