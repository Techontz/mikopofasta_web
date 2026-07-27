"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReasonDialog } from "@/features/customers/profile/reason-dialog";
import { requestReversal } from "@/features/ledger/actions";

export function RequestReversalDialog({ journalEntryId, entryNumber }: { journalEntryId: string; entryNumber: string }) {
  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
          <Undo2 className="size-4" />
          Request Reversal
        </Button>
      }
      title={`Request reversal of ${entryNumber}?`}
      description="Nothing is deleted. If approved, a new entry is posted with every debit and credit swapped, leaving the original intact."
      confirmLabel="Submit Request"
      destructive
      onConfirm={(reason) => requestReversal(journalEntryId, reason)}
    />
  );
}
