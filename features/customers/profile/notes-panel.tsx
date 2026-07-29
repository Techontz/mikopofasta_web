"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/feedback/empty-state";
import { addCustomerNote } from "@/features/customers/actions";
import type { CustomerNote } from "@/types/customer-note";

/** The API resolves `authorName` with the note, so no local user list is needed. */
export function NotesPanel({ customerId, notes }: { customerId: string; notes: CustomerNote[] }) {
  const [note, setNote] = React.useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const result = await addCustomerNote({ customerId, note });
      if (result.ok) {
        toast.success(result.message);
        setNote("");
      } else {
        toast.error(result.message);
      }
    });
  }

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this customer…"
          aria-label="Note"
          rows={2}
        />
        {/* Icon-only, so it needs a name of its own — nothing inside it is text. */}
        <Button size="icon" aria-label="Add note" onClick={handleAdd} disabled={pending || !note.trim()}>
          <Send className="size-4" />
        </Button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No notes yet" />
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              <p className="text-sm">{n.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.authorName ?? "Unknown"} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
