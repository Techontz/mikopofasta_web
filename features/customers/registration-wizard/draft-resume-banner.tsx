"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileClock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  discardRegistrationDraft,
  loadRegistrationDraft,
} from "@/features/customers/registration-drafts-actions";
import type { RegistrationDraftSummary } from "@/lib/api/registration";
import type { WizardValues } from "@/features/customers/registration-wizard/wizard-schema";

/**
 * Unfinished registrations, OFFERED and never applied.
 *
 * Silently restoring a draft is how "Register Customer" opens showing a person
 * who is not the person standing at the counter — and the officer has no way
 * to tell a restored draft from a fresh form. Registering a customer must
 * start empty. So both sources are shown as choices:
 *
 *   THIS BROWSER   the keystroke-level autosave, which is what survives a
 *                  refresh between two server saves.
 *   SAVED DRAFTS   rows on the server. These survive the device, so a
 *                  registration begun at one desk can be finished at another,
 *                  and a supervisor can see what their branch left unfinished.
 *
 * A draft belonging to another officer is shown but not deletable — resuming
 * it creates the supervisor's own copy rather than writing over work somebody
 * may still have open on another machine.
 */
export function DraftResumeBanner({
  local,
  serverDrafts,
  currentUserId,
  onResumeLocal,
  onDiscardLocal,
  onResumeServer,
}: {
  local: { values: WizardValues; step: number; draftId: string | null } | null;
  serverDrafts: RegistrationDraftSummary[];
  currentUserId: string;
  onResumeLocal: (draft: { values: WizardValues; step: number; draftId: string | null }) => void;
  onDiscardLocal: () => void;
  onResumeServer: (payload: unknown, step: number, draftId: string) => void;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dismissedServer, setDismissedServer] = React.useState(false);
  const [drafts, setDrafts] = React.useState(serverDrafts);

  const showServer = !dismissedServer && drafts.length > 0;

  if (!local && !showServer) return null;

  async function resume(draft: RegistrationDraftSummary) {
    setBusy(draft.id);
    const result = await loadRegistrationDraft(draft.id);
    setBusy(null);

    if (!result.ok || !result.draft) {
      toast.error(result.message ?? "That draft could not be opened.");
      return;
    }

    onResumeServer(result.draft.payload, result.draft.step, result.draft.id);
    setDismissedServer(true);
    toast.info(`Resumed “${result.draft.label}”.`);
  }

  async function discard(draft: RegistrationDraftSummary) {
    setBusy(draft.id);
    const result = await discardRegistrationDraft(draft.id);
    setBusy(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setDrafts((rows) => rows.filter((r) => r.id !== draft.id));
    toast.success("Draft discarded.");
  }

  return (
    <div className="space-y-3">
      {local && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3"
        >
          <p className="text-sm text-muted-foreground">
            This browser has an unsaved registration
            {local.values?.firstName ? (
              <>
                {" "}
                for <span className="font-medium text-foreground">{local.values.firstName}</span>
              </>
            ) : null}
            . The form below is otherwise empty.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onResumeLocal(local)}>
              Resume it
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDiscardLocal}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {showServer && (
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileClock className="size-4 text-muted-foreground" aria-hidden />
                Saved registrations ({drafts.length})
              </p>
              <p className="text-xs text-muted-foreground">
                Unfinished and waiting. These are held on the server, so they can be resumed from
                any device.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDismissedServer(true)}>
              Not now
            </Button>
          </div>

          <ul className="divide-y">
            {drafts.map((draft) => {
              const mine = draft.createdById === currentUserId;
              return (
                <li key={draft.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium">{draft.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {draft.phone ? `${draft.phone} · ` : ""}
                      {mine ? "Yours" : (draft.createdByName ?? "Another officer")}
                      {draft.updatedAt ? ` · ${when(draft.updatedAt)}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === draft.id}
                    onClick={() => resume(draft)}
                  >
                    {busy === draft.id && <Loader2 className="size-3.5 animate-spin" />}
                    Resume
                  </Button>
                  {/* Only the author may delete. A supervisor resuming somebody
                      else's draft gets their own copy; deleting it would take
                      away work the officer may still have open elsewhere. */}
                  {mine && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy === draft.id}
                      onClick={() => discard(draft)}
                      aria-label={`Discard draft for ${draft.label}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
