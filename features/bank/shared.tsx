import { StatusBadge, type StatusTone } from "@/components/settings";
import { cn } from "@/lib/utils";
import type {
  AccountStatus,
  ExpenseStatus,
  PayrollStatus,
  TransactionStatus,
  TransactionType,
  TransferStatus,
} from "@/types/bank";

/**
 * What the Bank screens share.
 *
 * Status tones live here rather than on each page so a "pending" pill is the
 * same colour on Bank Transaction as it is on Request Expenses — a reader
 * learns the palette once. Tone names map onto the shared badge in
 * components/settings, which is where the actual colours (and their dark
 * counterparts) are declared.
 */

export const TRANSACTION_TONE: Record<TransactionStatus, StatusTone> = {
  pending: "warning",
  approved: "active",
  rejected: "danger",
};

export const TRANSFER_TONE: Record<TransferStatus, StatusTone> = {
  pending: "warning",
  completed: "active",
  cancelled: "inactive",
};

export const EXPENSE_TONE: Record<ExpenseStatus, StatusTone> = {
  pending: "warning",
  approved: "active",
  rejected: "danger",
};

export const PAYROLL_TONE: Record<PayrollStatus, StatusTone> = {
  paid: "active",
  pending: "warning",
};

export const ACCOUNT_TONE: Record<AccountStatus, StatusTone> = {
  active: "active",
  inactive: "inactive",
};

/**
 * Transaction type is a category, not a state, so it gets a neutral pill —
 * colouring it would compete with the status column beside it for the reader's
 * attention, and only one of the two is a thing you act on.
 */
export const TYPE_LABEL: Record<TransactionType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
  charge: "Charge",
};

/**
 * Dates are formatted through a pinned locale and time zone. A bare
 * toLocaleDateString() renders differently on the server than in the browser
 * and trips React's hydration check (#418).
 */
export const BANK_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : BANK_DATE.format(parsed);
}

/** "2026-07" → "July 2026", for the payroll period filter and headings. */
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return MONTH.format(new Date(Date.UTC(year, month - 1, 1)));
}

// ---------------------------------------------------------------------------
// Fact grid
// ---------------------------------------------------------------------------

/**
 * One labelled value in a detail view.
 *
 * Deliberately plain data rather than a node. Three screens were each building
 * an array of `[label, <jsx/>]` tuples, which put markup inside a data
 * structure — it duplicated the presentation three times, and it tripped
 * react/jsx-key because the linter cannot tell a tuple value from a sibling in
 * a list. Describing the value instead (`mono` for an account number, `tone`
 * for a status) leaves one place that decides how a fact looks.
 */
export interface Fact {
  label: string;
  value: string;
  /** Tabular figures: account numbers, references, phone numbers. */
  mono?: boolean;
  /** Renders the value as a status pill in this tone. */
  tone?: StatusTone;
  /** Spans the full width — for a description or a note. */
  wide?: boolean;
}

export function FactGrid({ facts, columns = 2 }: { facts: Fact[]; columns?: 2 | 4 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", columns === 4 && "xl:grid-cols-4")}>
      {facts.map((fact) => (
        <div key={fact.label} className={fact.wide ? "sm:col-span-2 xl:col-span-4" : undefined}>
          <dt className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--st-ink-faint)]">
            {fact.label}
          </dt>
          <dd
            className={cn(
              "mt-0.5 text-[14px] text-[var(--st-ink)]",
              fact.mono && "font-tabular",
              fact.wide && "leading-relaxed text-[var(--st-ink-soft)]"
            )}
          >
            {fact.tone ? (
              <StatusBadge tone={fact.tone} className="capitalize">
                {fact.value}
              </StatusBadge>
            ) : (
              fact.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
