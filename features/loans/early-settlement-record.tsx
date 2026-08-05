import { formatMoney } from "@/lib/domain/money";
import type { EarlySettlementRecord } from "@/types/loan";

/**
 * The settlement record — client Decision 1, Option B.
 *
 * Every value here is served. None of it is recalculated: `amountPaid` in
 * particular cannot be derived in the browser, because the waiver reduced the
 * balance before the money was taken, so anything arrived at by subtracting
 * outstanding from payable would be what was owed BEFORE forgiveness rather
 * than what the customer actually handed over.
 *
 * Rendered wherever a settled loan is shown — the overview, the settlement tab
 * and the timeline all read this one record, so they cannot disagree.
 */
export function EarlySettlementRecordPanel({ record }: { record: EarlySettlementRecord }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <Entry label="Settlement Date">{new Date(record.settledAt).toLocaleString()}</Entry>
      <Entry label="Interest Waived">{formatMoney(record.interestWaived)}</Entry>
      {/*
       * "—" rather than a zero when no payment was taken. A loan whose whole
       * remaining balance was unearned interest is settled by the waiver
       * alone, and a 0.00 here would read as "the customer paid nothing"
       * instead of "there was nothing left to pay".
       */}
      <Entry label="Final Amount Paid">{record.amountPaid === null ? "—" : formatMoney(record.amountPaid)}</Entry>
      <Entry label="Settlement Reference">{record.reference ?? "—"}</Entry>
      <Entry label="Settlement Officer">{record.officerName ?? "—"}</Entry>
    </dl>
  );
}

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}
