import { Ban, Banknote, ClipboardList, Landmark, Wallet } from "lucide-react";
import { StatCard } from "@/components/settings";
import { formatMoney } from "@/lib/domain/money";
import { getAllLoans, getOutstandingByLoan, type LoanFilters } from "@/lib/api/loans";
import { LoansTable } from "@/features/loans/loans-table";
import { toLoanRow } from "@/features/loans/queries";

/**
 * The four legacy Loan list screens — Pending Approve, Disbursed, Rejected,
 * Withdrawal.
 *
 * All four drew from `lib/legacy/source.ts`, transcribed from screenshots of
 * the running legacy system, and every row action was inert. They now read
 * `GET /loans`; the endpoint has existed since the Loans phase.
 *
 * ## Why one panel rather than four
 *
 * The four screens differ by one thing: which statuses they show. Their
 * columns were near-identical on the legacy system and are now identical,
 * because the columns are the API's. Four copies of one table would be four
 * places for a rendering decision to drift.
 *
 * ## What the legacy columns became
 *
 * Some had no equivalent and are gone rather than left permanently blank:
 *
 *   - **Customer Status** ("NEW") — this system tracks a customer's KYC and
 *     approval state on the customer, not on each loan they take.
 *   - **Restoration** — the legacy Withdrawal screen's own tab strip enumerated
 *     Daily/Weekly/Monthly, which is this system's repayment schedule; it is a
 *     property of the loan's product, not a column of its own.
 *   - **Loan Ac** — the fourteen-digit legacy account number. This system's
 *     loan number is what identifies a loan and is what every other screen and
 *     the ledger reference.
 *
 * A column the API cannot fill would be a column that is empty for ever, which
 * reads as missing data rather than as a deliberate omission.
 */

export interface LoanQueueTile {
  label: string;
  value: string;
  icon: typeof Landmark;
}

/**
 * Loads one queue and renders it.
 *
 * `outstanding` is resolved separately because the list resource carries no
 * balance — the index does not load schedules, so a per-loan figure has to be
 * asked for. It is skipped entirely for queues that cannot have one: a rejected
 * or withdrawn application never had a schedule, and asking would be a request
 * per loan for a column of zeros.
 */
export async function LoanQueuePanel({
  filters,
  canCreate,
  emptyKind,
  withBalances = true,
}: {
  filters: LoanFilters;
  canCreate: boolean;
  /** Shapes the tiles — a rejected queue counts nothing outstanding. */
  emptyKind: "origination" | "openBook" | "closed";
  withBalances?: boolean;
}) {
  // §13 is the API's: this is already narrowed to what the caller may see.
  const loans = await getAllLoans(filters);

  const outstanding = withBalances
    ? await getOutstandingByLoan(loans)
    : { byLoan: new Map<string, number>(), total: 0, complete: true };

  const rows = loans.map((loan) => toLoanRow(loan, outstanding.byLoan));
  const principal = loans.reduce((sum, l) => sum + l.principalAmount, 0);

  const tiles: LoanQueueTile[] =
    emptyKind === "openBook"
      ? [
          { label: "Loans", value: String(loans.length), icon: Landmark },
          { label: "Disbursed", value: formatMoney(principal), icon: Banknote },
          {
            label: outstanding.complete ? "Outstanding" : "Outstanding (partial)",
            value: formatMoney(outstanding.total),
            icon: Wallet,
          },
        ]
      : emptyKind === "origination"
        ? [
            { label: "Awaiting a decision", value: String(loans.length), icon: ClipboardList },
            { label: "Requested", value: formatMoney(principal), icon: Wallet },
          ]
        : [
            { label: "Loans", value: String(loans.length), icon: Ban },
            { label: "Amount", value: formatMoney(principal), icon: Wallet },
          ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <StatCard key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} />
        ))}
      </div>

      {/*
        Searching, branch/status filtering, sorting and paging are the shared
        table's, over the whole queue — the same table the live Loan Book uses,
        so a loan reads identically wherever it is listed.
      */}
      <LoansTable loans={rows} canCreate={canCreate} />
    </div>
  );
}
