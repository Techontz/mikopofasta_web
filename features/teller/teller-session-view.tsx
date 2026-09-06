import Link from "next/link";
import { Banknote, Receipt, Wallet } from "lucide-react";
import { Money, SettingsCard, StatCard, StatusBadge, type StatusTone } from "@/components/settings";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { LOAN_STATUS_TONE } from "@/lib/domain/loan-status-machine";
import { customerFullName, type Customer } from "@/types/customer";
import type { LoanListItem } from "@/lib/api/loans";
import type { PaymentListItem } from "@/lib/api/payments";

/** Pinned so the server and the client format identically (React #418). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null | undefined): string {
  return value ? DATE.format(new Date(value)) : "—";
}

/**
 * Teller → Customer Loan Information.
 *
 * Where a teller lands after picking somebody: the customer, the loans they are
 * running, their position and the payments behind it.
 *
 * ## What this replaces
 *
 * `lib/legacy/profile-fixtures.ts` — three customers reconstructed from one
 * capture, with a hand-built statement. The old note recorded that the
 * capture's own figures did not foot: *"Opening/Deposit/Withdrawal read 0,0,0
 * against a Closing of 33,435,883"*, and derived the position from the
 * statement rather than trusting four columns that disagreed.
 *
 * That reasoning still holds and is now free: the position IS derived, because
 * every figure comes from the loans and the payments themselves. There is
 * nothing left to disagree.
 *
 * ## Position
 *
 * Outstanding is what the loans still owe — the API's own figure, which is what
 * the Loan Book and every report use. Collected is what this customer has
 * actually paid. Neither is a stored "balance" column, so neither can drift
 * from the rows beneath it.
 */
export function TellerSessionView({
  customer,
  loans,
  payments,
}: {
  customer: Customer;
  loans: LoanListItem[];
  payments: PaymentListItem[];
}) {
  const outstanding = loans.reduce((sum, l) => sum + l.outstanding, 0);
  const principal = loans.reduce((sum, l) => sum + l.principalAmount, 0);
  const collected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/*
        Who the teller is serving. The legacy screen led with the customer's
        photograph and identity, and a session that opened straight onto figures
        would let somebody take a payment against the wrong person.

        KYC and approval are shown because §9 gates lending on them: a teller
        looking at an unapproved customer needs to see that before, not after,
        they promise anything.
      */}
      <SettingsCard title={customerFullName(customer)} description="Who this session is against.">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Customer number" mono>{customer.customerNumber}</Fact>
          <Fact label="Phone" mono>{customer.phone}</Fact>
          <Fact label="Account status">
            <StatusBadge
              tone={customer.status === "active" ? "active" : "inactive"}
              className="capitalize"
            >
              {customer.status.replace(/_/g, " ")}
            </StatusBadge>
          </Fact>
          <Fact label="KYC">
            <StatusBadge
              tone={customer.kycStatus === "completed" ? "active" : "warning"}
              className="capitalize"
            >
              {customer.kycStatus.replace(/_/g, " ")}
            </StatusBadge>
          </Fact>
        </dl>
      </SettingsCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Loans" value={loans.length} icon={Receipt} tone="accent" />
        <StatCard label="Borrowed" value={formatMoney(principal)} icon={Banknote} />
        <StatCard
          label="Collected"
          value={formatMoney(collected)}
          icon={Wallet}
          hint={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(outstanding)}
          icon={Wallet}
          hint="What the open loans still owe"
        />
      </div>

      <SettingsCard
        title={`Loans (${loans.length})`}
        description="Every loan this customer has taken."
        bodyClassName={loans.length === 0 ? undefined : "p-0 sm:p-0"}
      >
        {loans.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No loans"
            description="This customer has never borrowed."
            className="border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col">Loan #</th>
                  <th scope="col">Product</th>
                  <th scope="col" className="!text-right">Amount</th>
                  <th scope="col" className="!text-right">Outstanding</th>
                  <th scope="col">Disbursed</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <Link
                        href={`/loans/${loan.id}`}
                        className="font-medium text-[var(--st-ink)] hover:underline"
                      >
                        {loan.loanNumber}
                      </Link>
                    </td>
                    <td className="text-[var(--st-ink-soft)]">{loan.productName ?? "—"}</td>
                    <td>
                      <Money>{formatMoney(loan.principalAmount)}</Money>
                    </td>
                    <td>
                      <Money strong muted={loan.outstanding === 0}>
                        {loan.outstanding === 0 ? "—" : formatMoney(loan.outstanding)}
                      </Money>
                    </td>
                    <td className="font-tabular whitespace-nowrap text-[var(--st-ink-soft)]">
                      {formatDate(loan.disbursementDate)}
                    </td>
                    <td>
                      <StatusBadge
                        tone={(LOAN_STATUS_TONE[loan.status] ?? "neutral") as StatusTone}
                        className="capitalize"
                      >
                        {loan.statusLabel}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        title={`Statement (${payments.length})`}
        description="Every payment received against this customer's loans, newest first."
        bodyClassName={payments.length === 0 ? undefined : "p-0 sm:p-0"}
      >
        {payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Nothing received"
            description="No payment has been recorded against this customer."
            className="border-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="st-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Loan</th>
                  <th scope="col">Channel</th>
                  <th scope="col" className="!text-right">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-tabular whitespace-nowrap">
                      {formatDate(payment.receivedAt)}
                    </td>
                    <td className="font-tabular text-[var(--st-ink-soft)]">
                      {payment.paymentReference}
                    </td>
                    <td className="text-[var(--st-ink-soft)]">{payment.loanNumber ?? "—"}</td>
                    <td className="capitalize text-[var(--st-ink-soft)]">
                      {payment.channel.replace(/_/g, " ")}
                    </td>
                    <td>
                      <Money strong>{formatMoney(payment.amount)}</Money>
                    </td>
                    <td className="capitalize text-[var(--st-ink-soft)]">
                      {payment.status.replace(/_/g, " ")}
                    </td>
                  </tr>
                ))}
                <tr className="st-total-row">
                  <td colSpan={4} className="font-semibold text-[var(--st-ink)]">
                    Total collected
                  </td>
                  <td>
                    <Money strong>{formatMoney(collected)}</Money>
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </SettingsCard>

      <SettingsCard title="Switch customer" description="Open another customer's teller session.">
        {/* A link back to the search rather than a second dropdown. The picker
            it returns to searches the whole book; a select could not. */}
        <Link href="/teller" className="st-btn st-btn-secondary">
          Back to customer search
        </Link>
      </SettingsCard>
    </div>
  );
}

function Fact({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[12.5px] text-[var(--st-ink-faint)]">{label}</dt>
      <dd className={`text-[14px] font-medium text-[var(--st-ink)] ${mono ? "font-tabular" : ""}`}>
        {children}
      </dd>
    </div>
  );
}
