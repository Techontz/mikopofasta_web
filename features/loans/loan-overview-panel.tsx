import { Ban, Banknote, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { Money, SettingsCard, StatCard, StatusBadge } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { ORIGINATION_STATUSES, OPEN_BOOK_STATUSES } from "@/lib/domain/loan-status-machine";
import { getAllLoans } from "@/lib/api/loans";

/** Pinned so the server and the client format identically (React #418). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Loan → the section landing screen.
 *
 * Its four tiles and its activity list were counted out of
 * `LEGACY_DISBURSED_LOANS` and `LEGACY_PENDING_ROW_COUNT` — figures read off
 * the legacy screens' footers. They are the real book now.
 *
 * "Recent activity" is a table rather than a `SettingsTable`: five rows with no
 * search, no filter and no paging is a list, and giving it a toolbar would
 * imply there is more to find than there is. The queues below it are where
 * someone goes to search.
 */
export async function LoanOverviewPanel() {
  // §13 is the API's — already narrowed to what the caller may see.
  const loans = await getAllLoans();

  const origination = loans.filter((l) => ORIGINATION_STATUSES.includes(l.status));
  const openBook = loans.filter((l) => OPEN_BOOK_STATUSES.includes(l.status));
  const rejected = loans.filter((l) => l.status === "rejected");

  const disbursedTotal = openBook.reduce((sum, l) => sum + l.principalAmount, 0);

  /*
   * Newest first by whatever date the loan has. A disbursed loan is dated by
   * its disbursement; one still in origination has none, so it falls back to
   * when it was created rather than being given an invented timestamp.
   */
  const activity = [...loans]
    .map((loan) => ({
      loan,
      at: loan.disbursementDate ?? loan.createdAt ?? "",
      event: loan.disbursementDate ? ("Disbursed" as const) : ("Applied" as const),
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={loans.length}
          icon={ClipboardList}
          tone="accent"
          hint="Everything on the book"
        />
        <StatCard label="Awaiting a decision" value={origination.length} icon={Clock} />
        <StatCard
          label="Disbursed"
          value={openBook.length}
          icon={Banknote}
          hint={formatMoney(disbursedTotal)}
        />
        <StatCard label="Rejected" value={rejected.length} icon={Ban} />
      </div>

      <SettingsCard
        title="Recent activity"
        description="The latest movement on the book, newest first."
        bodyClassName={activity.length === 0 ? undefined : "p-0 sm:p-0"}
      >
        {activity.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing on the book yet"
            description="No loan has been applied for."
            className="border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col">Customer</th>
                  <th scope="col">Event</th>
                  <th scope="col" className="!text-right">Amount</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {activity.map(({ loan, at, event }) => (
                  <tr key={loan.id}>
                    <td>
                      <Link
                        href={`/loans/${loan.id}`}
                        className="font-medium text-[var(--st-ink)] hover:underline"
                      >
                        {loan.customerName ?? loan.loanNumber}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-[var(--st-ink-faint)]">
                        {loan.branchName ?? "—"}
                      </p>
                    </td>
                    <td>
                      <StatusBadge tone={event === "Disbursed" ? "active" : "warning"}>
                        {event}
                      </StatusBadge>
                    </td>
                    <td>
                      <Money strong>{formatMoney(loan.principalAmount)}</Money>
                    </td>
                    <td className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
                      {at ? DATE.format(new Date(at)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
