import { BadgeCheck, CalendarCheck, Sigma, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { PageHeader, StatCard } from "@/components/settings";
import { SectionNav } from "@/features/ledger/section-nav";
import { treasuryNavFor } from "@/features/ledger/nav-items";
import { formatMoney, round2 } from "@/lib/domain/money";
import { MOCK_BANK_TRANSACTIONS } from "@/lib/mock-data/bank";
import { TransactionsPanel } from "@/features/bank/transactions-panel";

export default async function ApprovedTransactionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.TREASURY_VIEW)) return <AccessDeniedState />;

  const approved = MOCK_BANK_TRANSACTIONS.filter((t) => t.status === "approved");

  /*
   * "Today" is measured against the newest decision in the set rather than the
   * wall clock: the figures are computed on the server and rendered on the
   * client, and a clock read in both places disagrees across midnight.
   */
  const latest = approved.reduce<string | null>(
    (newest, t) => (t.decidedAt && (!newest || t.decidedAt > newest) ? t.decidedAt : newest),
    null
  );
  const today = approved.filter((t) => t.decidedAt === latest);

  const total = round2(approved.reduce((s, t) => s + t.amount, 0));
  const average = approved.length === 0 ? 0 : round2(total / approved.length);

  return (
    <>
      <PageHeader
        icon={BadgeCheck}
        title="Approved Transaction"
        description="Every bank transaction that has been decided and released. This list is the audit trail for money that has moved."
        breadcrumb={[{ label: "Bank", href: "/treasury" }, { label: "Approved Transaction" }]}
      />
      <SectionNav items={treasuryNavFor(user)} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Approved"
          value={today.length}
          icon={CalendarCheck}
          tone="accent"
          hint={today.length > 0 ? formatMoney(round2(today.reduce((s, t) => s + t.amount, 0))) : "Nothing decided yet"}
        />
        <StatCard label="Total Approved" value={approved.length} icon={BadgeCheck} hint="Across all periods" />
        <StatCard label="Total Amount" value={formatMoney(total)} icon={Sigma} />
        <StatCard label="Average Transaction" value={formatMoney(average)} icon={TrendingUp} hint="Total ÷ count" />
      </div>

      <TransactionsPanel
        transactions={approved}
        emptyTitle="Nothing approved yet"
        emptyDescription="An approved request moves here from Bank Transaction."
      />
    </>
  );
}
