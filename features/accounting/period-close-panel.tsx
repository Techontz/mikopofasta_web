"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { SettingsDialog } from "@/components/settings/dialog";
import { ActionButtons, Button, Field, FieldGrid, TextArea, TextInput } from "@/components/settings/form";
import { formatMoney } from "@/lib/domain/money";
import { ClosePeriodInputSchema, type PeriodPreview } from "@/types/accounting";
import { closePeriod, previewPeriod } from "@/features/accounting/actions";
import { formatPeriod } from "@/features/accounting/format";

/**
 * The close workflow — Decision Register D1.
 *
 * Three deliberate steps rather than one button:
 *
 *   1. Pick a period. Validated against `YYYY-MM` here as well as on the
 *      server, so a typo is caught before a round trip.
 *   2. Preview. What the close WOULD recognise, read through the same
 *      calculator the close itself uses, so the two cannot disagree.
 *   3. Confirm. Stated as irreversible, because it is: there is no reopen, and
 *      reopening would mean un-appropriating reserve Admin may already have
 *      released.
 *
 * A screen that closed the books on one click would be faster and materially
 * worse — this is the only irreversible accounting action in the app.
 */
export function PeriodCloseDialog({
  reservePercentage,
}: {
  /** The rate the close will apply, read from ReserveSetting. */
  reservePercentage: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [period, setPeriod] = React.useState(defaultPeriod);
  const [notes, setNotes] = React.useState("");
  const [preview, setPreview] = React.useState<PeriodPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingPreview, startPreview] = useTransition();
  const [closing, startClose] = useTransition();

  const periodError = React.useMemo(() => {
    const parsed = ClosePeriodInputSchema.safeParse({ period });
    return parsed.success ? undefined : parsed.error.issues[0]?.message;
  }, [period]);

  function reset() {
    setPreview(null);
    setError(null);
  }

  function onPeriodChange(next: string) {
    setPeriod(next);
    // A preview belongs to the period it was taken for; keeping a stale one on
    // screen while the input says something else is how the wrong month gets
    // closed.
    reset();
  }

  function loadPreview() {
    if (periodError) return;

    startPreview(async () => {
      reset();
      const result = await previewPeriod(period);
      if ("error" in result) setError(result.error);
      else setPreview(result);
    });
  }

  function onClose() {
    startClose(async () => {
      const result = await closePeriod({ period, notes: notes.trim() || undefined });
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
        setNotes("");
        reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  const reserve = preview && preview.realisedProfit > 0 ? (preview.realisedProfit * reservePercentage) / 100 : 0;
  const canClose = preview !== null && !preview.alreadyClosed && !closing;

  return (
    <SettingsDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      trigger={
        <button type="button" className="st-btn st-btn-primary">
          <Lock className="size-4" aria-hidden />
          Close a period
        </button>
      }
      title="Close an accounting period"
      description="Recognises the period's profit and appropriates its reserve. This cannot be undone."
      size="lg"
      footer={
        <ActionButtons>
          <Button type="button" tone="secondary" onClick={() => setOpen(false)} disabled={closing}>
            Cancel
          </Button>
          <Button type="button" tone="primary" onClick={onClose} loading={closing} disabled={!canClose}>
            {closing ? "Closing…" : "Close period"}
          </Button>
        </ActionButtons>
      }
    >
      <FieldGrid columns={2}>
        <Field
          label="Period"
          htmlFor="close-period"
          required
          error={periodError}
          help="The month to close, as YYYY-MM."
        >
          <TextInput
            id="close-period"
            value={period}
            invalid={Boolean(periodError)}
            onChange={(e) => onPeriodChange(e.target.value)}
            placeholder="2026-07"
          />
        </Field>

        <Field label="&nbsp;" htmlFor="preview-button">
          <Button
            id="preview-button"
            type="button"
            tone="secondary"
            onClick={loadPreview}
            loading={loadingPreview}
            disabled={Boolean(periodError) || loadingPreview}
          >
            {loadingPreview ? "Reading the ledger…" : "Preview figures"}
          </Button>
        </Field>
      </FieldGrid>

      {error && (
        <p className="st-field-error" role="alert">
          {error}
        </p>
      )}

      {preview && (
        <div className="st-card space-y-3 p-4" style={{ background: "var(--st-subtle)" }}>
          <p className="text-[14px] font-semibold text-[var(--st-ink)]">{formatPeriod(preview.period)}</p>

          {preview.alreadyClosed ? (
            <p className="text-[14px] text-[var(--st-ink-soft)]">
              This period is already closed. Correct it with a reversal in a later period.
            </p>
          ) : (
            <>
              <dl className="grid gap-2 sm:grid-cols-2">
                <PreviewRow label="Income" value={formatMoney(preview.incomeTotal)} />
                <PreviewRow label="Expense" value={formatMoney(preview.expenseTotal)} />
                <PreviewRow label="Realised profit" value={formatMoney(preview.realisedProfit)} strong />
                <PreviewRow
                  label={`Reserve at ${reservePercentage}%`}
                  value={formatMoney(reserve)}
                  strong
                />
              </dl>

              <p className="text-[12.5px] text-[var(--st-ink-faint)]">
                {preview.realisedProfit > 0
                  ? "Income and expense are swept into Profit, then the reserve is appropriated from what the period earned. The reserve belongs to Headquarters and needs Admin approval to spend."
                  : "This period made a loss, so no reserve is appropriated — there are no earnings to protect capital from."}
              </p>
            </>
          )}
        </div>
      )}

      <Field
        label="Notes"
        htmlFor="close-notes"
        help="Optional. Recorded against the closed period and visible in its history."
      >
        <TextArea
          id="close-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything a later reader should know about this close."
        />
      </Field>

      {!preview && !error && (
        <p className="st-field-help">
          Preview the figures before closing. The close cannot be reversed.
        </p>
      )}
    </SettingsDialog>
  );
}

function PreviewRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[14px] text-[var(--st-ink-soft)]">{label}</dt>
      <dd
        className={
          strong
            ? "font-tabular text-[15px] font-semibold text-[var(--st-ink)]"
            : "font-tabular text-[14px] text-[var(--st-ink-soft)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Last month, which is what an operator almost always wants.
 *
 * Computed in the app's own time zone rather than the browser's: a user in a
 * different zone must not be offered a different month from the one the server
 * would let them close.
 */
function defaultPeriod(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");

  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

  return `${previous.year}-${String(previous.month).padStart(2, "0")}`;
}
